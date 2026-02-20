/**
 * Side Panel UI Controller
 * Manages chat interface and user interactions
 */

import { StorageManager } from './utils.js';

class SidePanel {
  constructor() {
    this.chatHistory = document.getElementById('chat-history');
    this.messageInput = document.getElementById('message-input');
    this.sendBtn = document.getElementById('send-btn');
    this.pageContext = document.getElementById('page-context');
    this.pageTitle = document.getElementById('page-title');
    this.statusBar = document.getElementById('status-bar');
    this.settingsModal = document.getElementById('settings-modal');
    
    this.currentTab = null;
    this.isLoading = false;
    this.storage = new StorageManager();
    
    this.init();
  }

  async init() {
    await this.loadSettings();
    await this.updateActiveTab();
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    
    // Check if AI is configured
    const config = await this.storage.get('ai_config');
    if (!config?.apiKey) {
      this.showWelcomeWithSetup();
    }
    
    console.log('[AI Assistant] Side panel initialized');
  }

  setupEventListeners() {
    // Send message
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.messageInput.addEventListener('keypress', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    // Quick actions
    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => {
        const action = chip.dataset.action;
        this.handleQuickAction(action);
      });
    });

    // Header actions
    document.getElementById('clear-btn').addEventListener('click', () => this.clearConversation());
    document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
    document.getElementById('close-settings').addEventListener('click', () => this.closeSettings());
    document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());
    document.getElementById('refresh-context').addEventListener('click', () => this.refreshContext());

    // Close modal on overlay click
    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) this.closeSettings();
    });

    // Tab change listeners
    chrome.tabs.onActivated.addListener(() => this.updateActiveTab());
    chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
      if (tabId === this.currentTab?.id && changeInfo.status === 'complete') {
        this.updatePageContext(tab);
      }
    });
  }

  setupKeyboardShortcuts() {
    // Ctrl/Cmd + K to focus input
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.messageInput.focus();
      }
      // Escape to close modal
      if (e.key === 'Escape') {
        this.closeSettings();
      }
    });
  }

  async loadSettings() {
    const config = await this.storage.get('ai_config') || {};
    document.getElementById('provider-select').value = config.provider || 'openai';
    document.getElementById('api-key-input').value = config.apiKey || '';
    document.getElementById('model-select').value = config.model || 'gpt-4-turbo-preview';
  }

  async saveSettings() {
    const config = {
      provider: document.getElementById('provider-select').value,
      apiKey: document.getElementById('api-key-input').value.trim(),
      model: document.getElementById('model-select').value
    };

    if (!config.apiKey) {
      this.showStatus('Please enter an API key', 'error');
      return;
    }

    await this.storage.set('ai_config', config);
    
    // Notify background to update AI client
    await chrome.runtime.sendMessage({
      action: 'set_config',
      config: config
    });

    this.showStatus('Settings saved successfully', 'success');
    this.closeSettings();
    
    // Remove setup message if exists
    const setupMsg = document.querySelector('.setup-message');
    if (setupMsg) setupMsg.remove();
  }

  openSettings() {
    this.settingsModal.classList.add('active');
    document.getElementById('api-key-input').focus();
  }

  closeSettings() {
    this.settingsModal.classList.remove('active');
  }

  async updateActiveTab() {
    try {
      const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
      this.currentTab = tab;
      this.updatePageContext(tab);
    } catch (error) {
      console.error('Failed to get active tab:', error);
    }
  }

  updatePageContext(tab) {
    if (tab?.title && !tab.url?.startsWith('chrome://')) {
      this.pageTitle.textContent = tab.title;
      this.pageContext.classList.remove('hidden');
    } else {
      this.pageContext.classList.add('hidden');
    }
  }

  async refreshContext() {
    this.showStatus('Refreshing page context...', 'success');
    await this.updateActiveTab();
    setTimeout(() => this.hideStatus(), 2000);
  }

  async sendMessage() {
    const text = this.messageInput.value.trim();
    if (!text || this.isLoading) return;

    // Check configuration
    const config = await this.storage.get('ai_config');
    if (!config?.apiKey) {
      this.showStatus('Please configure API key in settings', 'error');
      this.openSettings();
      return;
    }

    this.addMessage('user', text);
    this.messageInput.value = '';
    this.setLoading(true);

    try {
      const pageContext = await this.getPageContext();
      
      const response = await chrome.runtime.sendMessage({
        action: 'chat',
        message: text,
        tabId: this.currentTab?.id,
        pageContext: pageContext
      });

      if (response.error) {
        throw new Error(response.error);
      }

      this.addMessage('assistant', response.response);
      
      if (response.actions?.length > 0) {
        this.renderActionResults(response.actions);
      }
    } catch (error) {
      console.error('Chat error:', error);
      this.addMessage('assistant', `❌ Error: ${error.message}. Please check your API key and try again.`);
      this.showStatus(error.message, 'error');
    } finally {
      this.setLoading(false);
    }
  }

  async getPageContext() {
    if (!this.currentTab || this.currentTab.url?.startsWith('chrome://')) {
      return { url: this.currentTab?.url, title: this.currentTab?.title };
    }

    try {
      const response = await chrome.tabs.sendMessage(this.currentTab.id, {
        action: 'get_structure'
      });
      return response;
    } catch (e) {
      // Content script not loaded, inject it
      try {
        await chrome.scripting.executeScript({
          target: { tabId: this.currentTab.id },
          files: ['content.js']
        });
        // Retry
        return await chrome.tabs.sendMessage(this.currentTab.id, {
          action: 'get_structure'
        });
      } catch (injectError) {
        return { url: this.currentTab.url, title: this.currentTab.title };
      }
    }
  }

  handleQuickAction(action) {
    const prompts = {
      summarize: 'Please summarize the main content of this page in 3-4 bullet points. Focus on the key information and main takeaways.',
      extract: 'Extract all important data from this page including names, dates, prices, addresses, and other structured information. Present it in a clear format.',
      links: 'List all the important links on this page with their text and URLs. Categorize them if possible (navigation, content, external, etc.).',
      form: 'Analyze any forms on this page. What fields are present and what information is needed to complete them?'
    };

    const text = prompts[action];
    this.messageInput.value = text;
    this.messageInput.focus();
    // Auto-send for quick actions
    this.sendMessage();
  }

  addMessage(role, content) {
    // Remove welcome message if exists
    const welcome = this.chatHistory.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    const messageDiv = document.createElement('div');
    messageDiv.className = `message ${role}`;
    
    const header = document.createElement('div');
    header.className = 'message-header';
    header.textContent = role === 'user' ? 'You' : 'AI Assistant';
    
    const contentDiv = document.createElement('div');
    contentDiv.className = 'message-content';
    
    // Format content
    let formattedContent = this.formatMessage(content);
    contentDiv.innerHTML = formattedContent;
    
    messageDiv.appendChild(header);
    messageDiv.appendChild(contentDiv);
    this.chatHistory.appendChild(messageDiv);
    
    this.scrollToBottom();
  }

  formatMessage(content) {
    // Escape HTML
    content = content.replace(/&/g, '&amp;')
                     .replace(/</g, '&lt;')
                     .replace(/>/g, '&gt;');
    
    // Format bold
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    
    // Format italic
    content = content.replace(/\*(.*?)\*/g, '<em>$1</em>');
    
    // Format code
    content = content.replace(/`(.*?)`/g, '<code>$1</code>');
    
    // Format links
    content = content.replace(
      /(https?:\/\/[^\s<]+)/g, 
      '<a href="$1" target="_blank" style="color: inherit; text-decoration: underline;">$1</a>'
    );
    
    // Format lists
    content = content.replace(/^- (.*$)/gm, '<li>$1</li>');
    content = content.replace(/(<li>.*<\/li>\n?)+/g, '<ul style="margin-left: 16px; margin-top: 8px;">$&</ul>');
    
    // Preserve line breaks
    content = content.replace(/\n/g, '<br>');
    
    return content;
  }

  renderActionResults(actions) {
    const card = document.createElement('div');
    card.className = 'action-card';
    
    const title = document.createElement('div');
    title.className = 'action-card-title';
    title.textContent = '⚡ Actions Executed';
    card.appendChild(title);
    
    const list = document.createElement('div');
    list.className = 'action-list';
    
    actions.forEach(action => {
      const btn = document.createElement('button');
      btn.className = `action-btn ${action.success ? 'success' : 'error'}`;
      btn.innerHTML = `
        <span>${action.success ? '✓' : '✗'}</span>
        <span>${action.tool || action.action}: ${action.success ? 'Success' : action.error}</span>
      `;
      list.appendChild(btn);
    });
    
    card.appendChild(list);
    this.chatHistory.appendChild(card);
    this.scrollToBottom();
  }

  setLoading(loading) {
    this.isLoading = loading;
    this.sendBtn.disabled = loading;
    
    if (loading) {
      const loadingDiv = document.createElement('div');
      loadingDiv.className = 'loading-indicator';
      loadingDiv.id = 'loading-indicator';
      loadingDiv.innerHTML = `
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
        <div class="typing-dot"></div>
      `;
      this.chatHistory.appendChild(loadingDiv);
      this.scrollToBottom();
    } else {
      const indicator = document.getElementById('loading-indicator');
      if (indicator) indicator.remove();
    }
  }

  scrollToBottom() {
    this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
  }

  async clearConversation() {
    if (confirm('Clear this conversation?')) {
      await chrome.runtime.sendMessage({
        action: 'clear_history',
        tabId: this.currentTab?.id
      });
      
      this.chatHistory.innerHTML = `
        <div class="welcome-message">
          <div class="welcome-icon">🤖</div>
          <div class="welcome-title">Conversation Cleared</div>
          <div class="welcome-text">How can I help you with this page?</div>
        </div>
      `;
    }
  }

  showWelcomeWithSetup() {
    this.chatHistory.innerHTML = `
      <div class="welcome-message setup-message">
        <div class="welcome-icon">⚙️</div>
        <div class="welcome-title">Setup Required</div>
        <div class="welcome-text">
          Please configure your AI provider settings to get started.
          <br><br>
          <button class="btn-primary" onclick="document.getElementById('settings-btn').click()" style="display: inline-block; width: auto; padding: 10px 20px;">
            Open Settings
          </button>
        </div>
      </div>
    `;
  }

  showStatus(message, type) {
    this.statusBar.textContent = message;
    this.statusBar.className = `status-bar ${type}`;
    setTimeout(() => this.hideStatus(), 5000);
  }

  hideStatus() {
    this.statusBar.className = 'status-bar';
  }
}

// Initialize
const panel = new SidePanel();