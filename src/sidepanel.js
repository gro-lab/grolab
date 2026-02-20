/**
 * Side Panel UI Controller
 * Manages chat interface and user interactions
 */

import { StorageManager } from './utils.js';

const MODELS = {
  openai: [
    { value: 'gpt-4-turbo-preview', label: 'GPT-4 Turbo' },
    { value: 'gpt-4o', label: 'GPT-4o' },
    { value: 'gpt-4o-mini', label: 'GPT-4o Mini' },
    { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' }
  ],
  anthropic: [
    { value: 'claude-sonnet-4-5-20250514', label: 'Claude Sonnet 4.5' },
    { value: 'claude-3-5-sonnet-20241022', label: 'Claude 3.5 Sonnet' },
    { value: 'claude-3-5-haiku-20241022', label: 'Claude 3.5 Haiku' },
    { value: 'claude-3-opus-20240229', label: 'Claude 3 Opus' }
  ],
  local: [
    { value: 'llama3', label: 'Llama 3' },
    { value: 'llama3.1', label: 'Llama 3.1' },
    { value: 'mistral', label: 'Mistral' },
    { value: 'codellama', label: 'Code Llama' },
    { value: 'gemma2', label: 'Gemma 2' }
  ]
};

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
    this.setupEventListeners();
    this.setupKeyboardShortcuts();
    await this.loadSettings();
    await this.updateActiveTab();

    const config = await this.storage.get('ai_config');
    if (!config?.apiKey && config?.provider !== 'local') {
      this.showWelcomeWithSetup();
    }

    console.log('[AI Assistant] Side panel initialized');
  }

  setupEventListeners() {
    this.sendBtn.addEventListener('click', () => this.sendMessage());
    this.messageInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        this.sendMessage();
      }
    });

    document.querySelectorAll('.chip').forEach(chip => {
      chip.addEventListener('click', () => this.handleQuickAction(chip.dataset.action));
    });

    document.getElementById('clear-btn').addEventListener('click', () => this.clearConversation());
    document.getElementById('settings-btn').addEventListener('click', () => this.openSettings());
    document.getElementById('close-settings').addEventListener('click', () => this.closeSettings());
    document.getElementById('save-settings').addEventListener('click', () => this.saveSettings());
    document.getElementById('refresh-context').addEventListener('click', () => this.refreshContext());

    document.getElementById('provider-select').addEventListener('change', (e) => {
      this.updateModelOptions(e.target.value);
    });

    this.settingsModal.addEventListener('click', (e) => {
      if (e.target === this.settingsModal) this.closeSettings();
    });

    chrome.tabs.onActivated.addListener(() => this.updateActiveTab());
    chrome.tabs.onUpdated.addListener((tabId, changeInfo) => {
      if (tabId === this.currentTab?.id && changeInfo.status === 'complete') {
        this.updateActiveTab();
      }
    });
  }

  setupKeyboardShortcuts() {
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        this.messageInput.focus();
      }
      if (e.key === 'Escape') this.closeSettings();
    });
  }

  updateModelOptions(provider) {
    const modelSelect = document.getElementById('model-select');
    const apiKeyGroup = document.getElementById('api-key-group');
    const baseUrlGroup = document.getElementById('base-url-group');

    modelSelect.innerHTML = '';
    const models = MODELS[provider] || MODELS.openai;
    models.forEach(m => {
      const opt = document.createElement('option');
      opt.value = m.value;
      opt.textContent = m.label;
      modelSelect.appendChild(opt);
    });

    if (provider === 'local') {
      apiKeyGroup.classList.add('hidden');
      baseUrlGroup.classList.remove('hidden');
    } else {
      apiKeyGroup.classList.remove('hidden');
      baseUrlGroup.classList.add('hidden');
    }

    document.getElementById('api-key-input').placeholder =
      provider === 'anthropic' ? 'sk-ant-...' : 'sk-...';
  }

  async loadSettings() {
    const config = await this.storage.get('ai_config') || {};
    const provider = config.provider || 'openai';

    document.getElementById('provider-select').value = provider;
    this.updateModelOptions(provider);

    document.getElementById('api-key-input').value = config.apiKey || '';
    document.getElementById('base-url-input').value = config.baseUrl || '';

    if (config.model) {
      document.getElementById('model-select').value = config.model;
    }
  }

  async saveSettings() {
    const provider = document.getElementById('provider-select').value;
    const apiKey = document.getElementById('api-key-input').value.trim();
    const baseUrl = document.getElementById('base-url-input').value.trim();
    const model = document.getElementById('model-select').value;

    if (provider !== 'local' && !apiKey) {
      this.showStatus('Please enter an API key', 'error');
      return;
    }

    const config = { provider, apiKey, model, baseUrl };
    await this.storage.set('ai_config', config);

    await chrome.runtime.sendMessage({ action: 'set_config', config });

    this.showStatus('Settings saved', 'success');
    this.closeSettings();

    const setupMsg = document.querySelector('.setup-message');
    if (setupMsg) setupMsg.remove();
  }

  openSettings() {
    this.settingsModal.classList.add('active');
    const provider = document.getElementById('provider-select').value;
    if (provider === 'local') {
      document.getElementById('base-url-input').focus();
    } else {
      document.getElementById('api-key-input').focus();
    }
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
    this.showStatus('Refreshing...', 'success');
    await this.updateActiveTab();
    setTimeout(() => this.hideStatus(), 1500);
  }

  async sendMessage() {
    const text = this.messageInput.value.trim();
    if (!text || this.isLoading) return;

    const config = await this.storage.get('ai_config');
    if (!config?.apiKey && config?.provider !== 'local') {
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
        pageContext
      });

      if (response.error) throw new Error(response.error);

      this.addMessage('assistant', response.response);

      if (response.actions?.length > 0) {
        this.renderActionResults(response.actions);
      }
    } catch (error) {
      console.error('Chat error:', error);
      this.addMessage('assistant', `Error: ${error.message}. Check your API key and try again.`);
      this.showStatus(error.message, 'error');
    } finally {
      this.setLoading(false);
      this.messageInput.focus();
    }
  }

  async getPageContext() {
    if (!this.currentTab || this.currentTab.url?.startsWith('chrome://')) {
      return { url: this.currentTab?.url, title: this.currentTab?.title };
    }

    try {
      return await chrome.tabs.sendMessage(this.currentTab.id, { action: 'get_structure' });
    } catch {
      try {
        await chrome.scripting.executeScript({
          target: { tabId: this.currentTab.id },
          files: ['content.js']
        });
        return await chrome.tabs.sendMessage(this.currentTab.id, { action: 'get_structure' });
      } catch {
        return { url: this.currentTab.url, title: this.currentTab.title };
      }
    }
  }

  handleQuickAction(action) {
    const prompts = {
      summarize: 'Summarize the main content of this page in 3-4 key points.',
      extract: 'Extract all important data from this page: names, dates, prices, emails, addresses, and other structured information.',
      links: 'List the important links on this page with their text and URLs, categorized by type.',
      form: 'Analyze all forms on this page. What fields are present and what do they need?'
    };

    const text = prompts[action];
    if (text) {
      this.messageInput.value = text;
      this.sendMessage();
    }
  }

  addMessage(role, content) {
    const welcome = this.chatHistory.querySelector('.welcome-message');
    if (welcome) welcome.remove();

    const msg = document.createElement('div');
    msg.className = `message ${role}`;

    const header = document.createElement('div');
    header.className = 'message-header';
    header.textContent = role === 'user' ? 'You' : 'AI Assistant';

    const body = document.createElement('div');
    body.className = 'message-content';
    body.innerHTML = this.formatMessage(content || '');

    msg.appendChild(header);
    msg.appendChild(body);
    this.chatHistory.appendChild(msg);
    this.scrollToBottom();
  }

  formatMessage(content) {
    // Escape HTML
    content = content
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

    // Code blocks (triple backtick)
    content = content.replace(/```(\w*)\n?([\s\S]*?)```/g,
      '<pre style="background:rgba(0,0,0,0.06);padding:8px;border-radius:6px;overflow-x:auto;font-size:12px;margin:6px 0"><code>$2</code></pre>');

    // Inline code
    content = content.replace(/`([^`]+)`/g, '<code>$1</code>');

    // Bold
    content = content.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');

    // Italic
    content = content.replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>');

    // Links
    content = content.replace(
      /(https?:\/\/[^\s<]+)/g,
      '<a href="$1" target="_blank">$1</a>'
    );

    // Bullet lists
    content = content.replace(/^[-•] (.*$)/gm, '<li>$1</li>');
    content = content.replace(/((?:<li>.*<\/li>\s*)+)/g, '<ul>$1</ul>');

    // Numbered lists
    content = content.replace(/^\d+\.\s+(.*$)/gm, '<li>$1</li>');

    // Line breaks (preserve double newlines as paragraphs)
    content = content.replace(/\n\n/g, '</p><p>');
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
      const item = document.createElement('div');
      item.className = `action-btn ${action.success ? 'success' : 'error'}`;
      const icon = action.success ? '✓' : '✗';
      const label = action.tool || action.action || 'action';
      const detail = action.success ? 'Done' : (action.error || 'Failed');
      item.innerHTML = `<span>${icon}</span><span>${label}: ${detail}</span>`;
      list.appendChild(item);
    });

    card.appendChild(list);
    this.chatHistory.appendChild(card);
    this.scrollToBottom();
  }

  setLoading(loading) {
    this.isLoading = loading;
    this.sendBtn.disabled = loading;

    if (loading) {
      const el = document.createElement('div');
      el.className = 'loading-indicator';
      el.id = 'loading-indicator';
      el.innerHTML = '<div class="typing-dot"></div><div class="typing-dot"></div><div class="typing-dot"></div>';
      this.chatHistory.appendChild(el);
      this.scrollToBottom();
    } else {
      document.getElementById('loading-indicator')?.remove();
    }
  }

  scrollToBottom() {
    requestAnimationFrame(() => {
      this.chatHistory.scrollTop = this.chatHistory.scrollHeight;
    });
  }

  async clearConversation() {
    if (!confirm('Clear this conversation?')) return;

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

  showWelcomeWithSetup() {
    this.chatHistory.innerHTML = `
      <div class="welcome-message setup-message">
        <div class="welcome-icon">⚙️</div>
        <div class="welcome-title">Setup Required</div>
        <div class="welcome-text">
          Configure your AI provider to get started.
          <br><br>
          <button class="btn-primary" id="setup-btn" style="display:inline-block;width:auto;padding:8px 20px;">
            Open Settings
          </button>
        </div>
      </div>
    `;
    document.getElementById('setup-btn')?.addEventListener('click', () => this.openSettings());
  }

  showStatus(message, type) {
    this.statusBar.textContent = message;
    this.statusBar.className = `status-bar ${type}`;
    clearTimeout(this._statusTimeout);
    this._statusTimeout = setTimeout(() => this.hideStatus(), 4000);
  }

  hideStatus() {
    this.statusBar.className = 'status-bar';
  }
}

const panel = new SidePanel();
