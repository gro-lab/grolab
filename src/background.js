/**
 * Background Service Worker
 * Orchestrates AI processing, tab management, and message routing
 */

import { AIClient } from './ai-client.js';
import { StorageManager } from './utils.js';

const CONFIG = {
  MAX_HISTORY_PER_TAB: 20,
  CONTEXT_REFRESH_INTERVAL: 5 * 60 * 1000,
  DEFAULT_MODEL: 'gpt-4-turbo-preview',
  STALE_SESSION_MS: 60 * 60 * 1000
};

class AIBrowserAssistant {
  constructor() {
    this.ai = null;
    this.sessions = new Map();
    this.storage = new StorageManager();
    this.initialized = false;
  }

  async init() {
    if (this.initialized) return;

    const config = await this.storage.get('ai_config');
    if (config?.apiKey) {
      this.ai = new AIClient({
        provider: config.provider || 'openai',
        apiKey: config.apiKey,
        model: config.model || CONFIG.DEFAULT_MODEL
      });
    }

    this.setupListeners();
    this.setupAlarms();
    this.initialized = true;
    console.log('[AI Assistant] Background service initialized');
  }

  setupListeners() {
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender)
        .then(sendResponse)
        .catch(error => {
          console.error('[AI Assistant] Error:', error);
          sendResponse({ error: error.message });
        });
      return true;
    });

    chrome.tabs.onRemoved.addListener((tabId) => this.cleanupTab(tabId));
    chrome.tabs.onActivated.addListener(({ tabId }) => this.updateActiveContext(tabId));

    chrome.webNavigation.onCompleted.addListener((details) => {
      if (details.frameId === 0) {
        this.handleNavigation(details.tabId, details.url);
      }
    });

    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        chrome.tabs.create({ url: 'https://grolab.work/ai-browser-extension/install' });
      }
    });

    chrome.commands.onCommand.addListener((command) => {
      if (command === 'toggle_side_panel') {
        this.toggleSidePanel();
      }
    });
  }

  setupAlarms() {
    chrome.alarms.create('session-cleanup', { periodInMinutes: 30 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'session-cleanup') {
        this.cleanupStaleSessions();
      }
    });
  }

  async handleMessage(request, sender) {
    const tabId = sender.tab?.id || request.tabId || (await this.getActiveTab())?.id;

    if (!this.initialized) await this.init();

    // Config actions don't need AI
    if (request.action === 'get_config') {
      return (await this.storage.get('ai_config')) || {};
    }
    if (request.action === 'set_config') {
      await this.updateConfig(request.config);
      return { success: true };
    }
    if (request.action === 'clear_history') {
      this.sessions.delete(tabId);
      return { success: true };
    }
    if (request.action === 'get_history') {
      return { history: this.sessions.get(tabId)?.history || [] };
    }
    if (request.action === 'dom_changed') {
      return { acknowledged: true };
    }

    // Everything else needs AI
    if (!this.ai) {
      return { error: 'AI not configured. Please set API key in settings.' };
    }

    switch (request.action) {
      case 'chat':
        return this.handleChat(tabId, request.message, request.pageContext);
      case 'analyze_page':
        return this.analyzePage(tabId);
      case 'execute_action':
        return this.executeAction(tabId, request.actionData);
      case 'get_page_structure':
        return this.getPageStructure(tabId);
      case 'summarize':
        return this.summarizePage(tabId, request.pageContext);
      case 'extract_data':
        return this.extractPageData(tabId, request.schema, request.pageContext);
      default:
        throw new Error(`Unknown action: ${request.action}`);
    }
  }

  async handleChat(tabId, message, pageContext) {
    if (!this.sessions.has(tabId)) {
      this.sessions.set(tabId, {
        history: [],
        pageContext: null,
        lastActivity: Date.now()
      });
    }

    const session = this.sessions.get(tabId);
    session.lastActivity = Date.now();

    const systemPrompt = this.buildSystemPrompt(pageContext);
    session.history.push({ role: 'user', content: message });

    const response = await this.ai.complete({
      system: systemPrompt,
      messages: session.history,
      tools: this.getAvailableTools(),
      temperature: 0.7
    });

    if (response.tool_calls?.length > 0) {
      const results = await this.executeToolCalls(tabId, response.tool_calls);

      const finalResponse = await this.ai.complete({
        system: systemPrompt,
        messages: [
          ...session.history,
          { role: 'assistant', content: response.content || '', tool_calls: response.tool_calls },
          ...results.map((r, i) => ({
            role: 'tool',
            tool_call_id: response.tool_calls[i].id,
            content: JSON.stringify(r)
          }))
        ]
      });

      session.history.push({ role: 'assistant', content: finalResponse.content });
      this.trimHistory(session);

      return {
        response: finalResponse.content,
        actions: results,
        usedTools: response.tool_calls.map(t => t.function.name)
      };
    }

    session.history.push({ role: 'assistant', content: response.content });
    this.trimHistory(session);

    return { response: response.content };
  }

  async summarizePage(tabId, pageContext) {
    const structure = pageContext || await this.getPageStructure(tabId);
    const bodyText = structure?.textContent?.body || '';

    if (!bodyText || bodyText.length < 50) {
      return { response: 'Not enough content on this page to summarize.' };
    }

    const result = await this.ai.complete({
      system: 'You are a concise summarizer. Provide clear, well-structured summaries.',
      messages: [{
        role: 'user',
        content: `Summarize the main content of this page in 3-5 bullet points:\n\nTitle: ${structure.title || 'Unknown'}\nURL: ${structure.url || 'Unknown'}\n\nContent:\n${bodyText}`
      }],
      temperature: 0.3
    });

    return { response: result.content };
  }

  async extractPageData(tabId, schema, pageContext) {
    if (schema) {
      try {
        const result = await chrome.tabs.sendMessage(tabId, {
          action: 'execute_tool',
          tool: 'extract_data',
          params: { schema }
        });
        return result;
      } catch (error) {
        return { success: false, error: error.message };
      }
    }

    const structure = pageContext || await this.getPageStructure(tabId);
    const result = await this.ai.complete({
      system: 'Extract all structured data (names, dates, prices, emails, addresses, phone numbers) from the page content. Return as a clear, organized list.',
      messages: [{
        role: 'user',
        content: `Extract data from:\n\nTitle: ${structure?.title}\nURL: ${structure?.url}\n\nContent:\n${structure?.textContent?.body || ''}`
      }],
      temperature: 0.2
    });

    return { response: result.content };
  }

  buildSystemPrompt(pageContext) {
    let prompt = `You are an AI web browsing assistant. You help users navigate, understand, and interact with web pages.

Current page: ${pageContext?.title || 'Unknown'}
URL: ${pageContext?.url || 'Unknown'}`;

    if (pageContext?.structure) {
      prompt += `\n\nPage info:
- Has login form: ${pageContext.structure.hasLoginForm}
- Has search: ${pageContext.structure.hasSearch}
- Content areas: ${pageContext.structure.contentAreas}
- Interactive elements: ${pageContext.interactive?.total || 0}
- Forms: ${pageContext.forms?.length || 0}`;
    }

    if (pageContext?.headings?.length > 0) {
      prompt += '\n\nPage headings:\n' + pageContext.headings
        .slice(0, 10)
        .map(h => `${'  '.repeat(h.level - 1)}H${h.level}: ${h.text}`)
        .join('\n');
    }

    prompt += `\n\nYou can use tools to:
- Click elements by description
- Fill form fields
- Scroll pages
- Find and highlight text
- Extract structured data
- Navigate to URLs

Instructions:
1. Explain what you will do before using tools
2. Use the most specific selector or description available
3. Confirm success or explain failures
4. Be concise, helpful, and accurate`;

    return prompt;
  }

  getAvailableTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'click_element',
          description: 'Click on a button, link, or interactive element on the page',
          parameters: {
            type: 'object',
            properties: {
              description: {
                type: 'string',
                description: 'Human-readable description of the element to click (e.g., "Submit button", "Read more link")'
              },
              selector: {
                type: 'string',
                description: 'CSS selector if known (optional, more reliable than description)'
              }
            },
            required: ['description']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'fill_form',
          description: 'Fill a form input, textarea, or select field with a value',
          parameters: {
            type: 'object',
            properties: {
              field_description: {
                type: 'string',
                description: 'Description of the field (e.g., "Email input", "Search box", "Country dropdown")'
              },
              value: {
                type: 'string',
                description: 'Text to enter or option to select'
              },
              selector: {
                type: 'string',
                description: 'CSS selector if known (optional)'
              }
            },
            required: ['field_description', 'value']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'scroll_page',
          description: 'Scroll the page in a given direction',
          parameters: {
            type: 'object',
            properties: {
              direction: {
                type: 'string',
                enum: ['up', 'down', 'top', 'bottom'],
                description: 'Scroll direction'
              },
              amount: {
                type: 'number',
                description: 'Pixels to scroll (default: 500, ignored for top/bottom)'
              }
            },
            required: ['direction']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'find_text',
          description: 'Find and highlight all occurrences of text on the page, scrolling to the first match',
          parameters: {
            type: 'object',
            properties: {
              query: {
                type: 'string',
                description: 'Text to search for (minimum 2 characters)'
              },
              case_sensitive: {
                type: 'boolean',
                description: 'Whether the search is case-sensitive (default: false)'
              }
            },
            required: ['query']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'extract_data',
          description: 'Extract structured data from the page using CSS selectors',
          parameters: {
            type: 'object',
            properties: {
              schema: {
                type: 'object',
                description: 'Object where keys are field names and values define how to extract: { selector: string, attribute?: "text"|"href"|"src"|"value"|attr, multiple?: boolean, transform?: "number"|"date"|"trim" }'
              }
            },
            required: ['schema']
          }
        }
      },
      {
        type: 'function',
        function: {
          name: 'navigate',
          description: 'Navigate the current tab to a different URL',
          parameters: {
            type: 'object',
            properties: {
              url: {
                type: 'string',
                description: 'Full URL to navigate to (must include protocol)'
              }
            },
            required: ['url']
          }
        }
      }
    ];
  }

  async executeToolCalls(tabId, toolCalls) {
    const results = [];

    for (const call of toolCalls) {
      try {
        let params;
        try {
          params = JSON.parse(call.function.arguments);
        } catch {
          params = {};
        }

        const result = await chrome.tabs.sendMessage(tabId, {
          action: 'execute_tool',
          tool: call.function.name,
          params,
          toolCallId: call.id
        });
        results.push(result);
      } catch (error) {
        results.push({
          success: false,
          error: error.message,
          tool: call.function.name
        });
      }
    }

    return results;
  }

  async getPageStructure(tabId) {
    try {
      return await chrome.tabs.sendMessage(tabId, { action: 'get_structure' });
    } catch {
      try {
        await chrome.scripting.executeScript({
          target: { tabId },
          files: ['content.js']
        });
        return await chrome.tabs.sendMessage(tabId, { action: 'get_structure' });
      } catch (retryError) {
        return { url: 'unknown', title: 'unknown', error: retryError.message };
      }
    }
  }

  async analyzePage(tabId) {
    const structure = await this.getPageStructure(tabId);

    const analysis = await this.ai.complete({
      system: 'Analyze this webpage structure concisely. Identify: page purpose, key interactive elements, forms, navigation structure, and any notable features.',
      messages: [{
        role: 'user',
        content: `Analyze this page:\n${JSON.stringify(structure, null, 2)}`
      }],
      temperature: 0.3
    });

    return { response: analysis.content, structure };
  }

  async executeAction(tabId, actionData) {
    return chrome.tabs.sendMessage(tabId, {
      action: 'execute_action',
      data: actionData
    });
  }

  trimHistory(session) {
    if (session.history.length > CONFIG.MAX_HISTORY_PER_TAB) {
      session.history = session.history.slice(-CONFIG.MAX_HISTORY_PER_TAB);
    }
  }

  cleanupTab(tabId) {
    this.sessions.delete(tabId);
  }

  cleanupStaleSessions() {
    const now = Date.now();
    for (const [tabId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > CONFIG.STALE_SESSION_MS) {
        this.sessions.delete(tabId);
      }
    }
  }

  handleNavigation(tabId, url) {
    const session = this.sessions.get(tabId);
    if (session) {
      session.pageContext = { url, timestamp: Date.now() };
    }
  }

  async updateActiveContext(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      if (tab?.url) {
        this.handleNavigation(tabId, tab.url);
      }
    } catch {
      // Tab may not exist
    }
  }

  async getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  async toggleSidePanel() {
    try {
      const window = await chrome.windows.getCurrent();
      await chrome.sidePanel.open({ windowId: window.id });
    } catch (e) {
      console.warn('[AI Assistant] Could not toggle side panel:', e.message);
    }
  }

  async updateConfig(config) {
    await this.storage.set('ai_config', config);
    this.ai = new AIClient({
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model || CONFIG.DEFAULT_MODEL,
      baseUrl: config.baseUrl
    });
  }
}

const assistant = new AIBrowserAssistant();
assistant.init();

chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
