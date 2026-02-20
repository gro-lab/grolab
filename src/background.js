/**
 * Background Service Worker
 * Orchestrates AI processing, tab management, and message routing
 */

import { AIClient } from './ai-client.js';
import { StorageManager } from './utils.js';

// Configuration
const CONFIG = {
  MAX_HISTORY_PER_TAB: 20,
  CONTEXT_REFRESH_INTERVAL: 5 * 60 * 1000, // 5 minutes
  DEFAULT_MODEL: 'gpt-4-turbo-preview'
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
    
    // Load API configuration
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
    // Message routing
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request, sender).then(sendResponse).catch(error => {
        console.error('[AI Assistant] Error:', error);
        sendResponse({ error: error.message });
      });
      return true; // Keep channel open for async
    });

    // Tab lifecycle
    chrome.tabs.onRemoved.addListener((tabId) => this.cleanupTab(tabId));
    chrome.tabs.onActivated.addListener(({ tabId }) => this.updateActiveContext(tabId));
    
    // Navigation tracking
    chrome.webNavigation.onCompleted.addListener((details) => {
      if (details.frameId === 0) {
        this.handleNavigation(details.tabId, details.url);
      }
    });

    // Installation
    chrome.runtime.onInstalled.addListener((details) => {
      if (details.reason === 'install') {
        chrome.tabs.create({ url: 'https://grolab.work/ai-browser-extension/install' });
      }
    });

    // Keyboard shortcuts
    chrome.commands.onCommand.addListener((command) => {
      if (command === 'toggle_side_panel') {
        this.toggleSidePanel();
      }
    });
  }

  setupAlarms() {
    // Periodic cleanup
    chrome.alarms.create('session-cleanup', { periodInMinutes: 30 });
    chrome.alarms.onAlarm.addListener((alarm) => {
      if (alarm.name === 'session-cleanup') {
        this.cleanupStaleSessions();
      }
    });
  }

  async handleMessage(request, sender) {
    const tabId = sender.tab?.id || request.tabId || (await this.getActiveTab())?.id;
    
    // Ensure initialized
    if (!this.initialized) await this.init();
    
    // Check if AI is configured
    if (!this.ai && request.action !== 'get_config' && request.action !== 'set_config') {
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
        return this.summarizePage(tabId);
      
      case 'extract_data':
        return this.extractData(tabId, request.schema);
      
      case 'get_config':
        return this.storage.get('ai_config');
      
      case 'set_config':
        await this.updateConfig(request.config);
        return { success: true };
      
      case 'clear_history':
        this.sessions.delete(tabId);
        return { success: true };
      
      case 'get_history':
        return { history: this.sessions.get(tabId)?.history || [] };
      
      default:
        throw new Error(`Unknown action: ${request.action}`);
    }
  }

  async handleChat(tabId, message, pageContext) {
    // Initialize session
    if (!this.sessions.has(tabId)) {
      this.sessions.set(tabId, {
        history: [],
        pageContext: null,
        lastActivity: Date.now()
      });
    }
    
    const session = this.sessions.get(tabId);
    session.lastActivity = Date.now();

    // Build system prompt
    const systemPrompt = this.buildSystemPrompt(pageContext);
    
    // Add user message
    session.history.push({ role: 'user', content: message });

    // Call AI with tools
    const response = await this.ai.complete({
      system: systemPrompt,
      messages: session.history,
      tools: this.getAvailableTools(),
      temperature: 0.7
    });

    // Handle tool execution
    if (response.tool_calls?.length > 0) {
      const results = await this.executeToolCalls(tabId, response.tool_calls);
      
      // Send results back to AI
      const finalResponse = await this.ai.complete({
        system: systemPrompt,
        messages: [
          ...session.history,
          { role: 'assistant', content: response.content, tool_calls: response.tool_calls },
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

  buildSystemPrompt(pageContext) {
    return `You are an AI web browsing assistant. You help users navigate, understand, and interact with web pages.

Current page: ${pageContext?.title || 'Unknown'}
URL: ${pageContext?.url || 'Unknown'}

You can:
- Click elements by description
- Fill form fields
- Scroll pages
- Find and highlight text
- Extract structured data
- Answer questions about page content

When suggesting actions:
1. Explain what you will do
2. Use tools to execute actions
3. Confirm success or explain failures

Be concise, helpful, and accurate. If uncertain, ask for clarification.`;
  }

  getAvailableTools() {
    return [
      {
        type: 'function',
        function: {
          name: 'click_element',
          description: 'Click on a button, link, or interactive element',
          parameters: {
            type: 'object',
            properties: {
              description: { 
                type: 'string', 
                description: 'Description of element to click (e.g., "Submit button", "Read more link")' 
              },
              selector: { 
                type: 'string', 
                description: 'CSS selector if known (optional)' 
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
          description: 'Fill a form input field with text',
          parameters: {
            type: 'object',
            properties: {
              field_description: { 
                type: 'string', 
                description: 'Description of the field (e.g., "Email input", "Search box")' 
              },
              value: { 
                type: 'string', 
                description: 'Text to enter' 
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
          description: 'Scroll the page up or down',
          parameters: {
            type: 'object',
            properties: {
              direction: { 
                type: 'string', 
                enum: ['up', 'down', 'top', 'bottom'],
                description: 'Direction to scroll' 
              },
              amount: { 
                type: 'number', 
                description: 'Pixels to scroll (default: 500)' 
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
          description: 'Find and highlight specific text on the page',
          parameters: {
            type: 'object',
            properties: {
              query: { 
                type: 'string', 
                description: 'Text to search for' 
              },
              case_sensitive: { 
                type: 'boolean',
                description: 'Case sensitive search (default: false)'
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
          description: 'Extract structured data from the page based on a schema',
          parameters: {
            type: 'object',
            properties: {
              schema: {
                type: 'object',
                description: 'JSON schema describing what data to extract'
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
          description: 'Navigate to a different URL',
          parameters: {
            type: 'object',
            properties: {
              url: { 
                type: 'string', 
                description: 'URL to navigate to' 
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
        const result = await chrome.tabs.sendMessage(tabId, {
          action: 'execute_tool',
          tool: call.function.name,
          params: JSON.parse(call.function.arguments),
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
    } catch (error) {
      // Content script not loaded, inject it
      await chrome.scripting.executeScript({
        target: { tabId },
        files: ['content.js']
      });
      // Retry
      return await chrome.tabs.sendMessage(tabId, { action: 'get_structure' });
    }
  }

  async analyzePage(tabId) {
    const structure = await this.getPageStructure(tabId);
    
    const analysis = await this.ai.complete({
      system: 'Analyze this webpage structure and provide insights.',
      messages: [{
        role: 'user',
        content: `Analyze this page structure:\n${JSON.stringify(structure, null, 2)}`
      }]
    });
    
    return analysis;
  }

  async executeAction(tabId, actionData) {
    return chrome.tabs.sendMessage(tabId, {
      action: 'execute_action',
      data: actionData
    });
  }

  trimHistory(session) {
    if (session.history.length > CONFIG.MAX_HISTORY_PER_TAB) {
      // Keep system message if exists, then last N exchanges
      const systemIdx = session.history.findIndex(m => m.role === 'system');
      const startIdx = systemIdx >= 0 ? systemIdx + 1 : 0;
      session.history = [
        ...session.history.slice(startIdx, startIdx + 1),
        ...session.history.slice(-(CONFIG.MAX_HISTORY_PER_TAB - 1))
      ];
    }
  }

  cleanupTab(tabId) {
    this.sessions.delete(tabId);
  }

  cleanupStaleSessions() {
    const now = Date.now();
    const staleThreshold = 60 * 60 * 1000; // 1 hour
    
    for (const [tabId, session] of this.sessions.entries()) {
      if (now - session.lastActivity > staleThreshold) {
        this.sessions.delete(tabId);
      }
    }
  }

  async handleNavigation(tabId, url) {
    const session = this.sessions.get(tabId);
    if (session) {
      session.pageContext = { url, timestamp: Date.now() };
      // Optional: Add navigation context to history
      session.history.push({
        role: 'system',
        content: `User navigated to: ${url}`
      });
    }
  }

  async updateActiveContext(tabId) {
    try {
      const tab = await chrome.tabs.get(tabId);
      this.handleNavigation(tabId, tab.url);
    } catch (e) {
      // Tab may not exist
    }
  }

  async getActiveTab() {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    return tab;
  }

  async toggleSidePanel() {
    await chrome.sidePanel.open({ windowId: (await chrome.windows.getCurrent()).id });
  }

  async updateConfig(config) {
    await this.storage.set('ai_config', config);
    // Reinitialize AI client
    this.ai = new AIClient({
      provider: config.provider,
      apiKey: config.apiKey,
      model: config.model || CONFIG.DEFAULT_MODEL
    });
  }
}

// Initialize service
const assistant = new AIBrowserAssistant();
assistant.init();

// Side panel behavior
chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });