/**
 * Content Script
 * Runs in every webpage - provides DOM access and automation
 */

class PageController {
  constructor() {
    this.highlights = [];
    this.observers = new Map();
    this.isInitialized = false;
    this.init();
  }

  init() {
    if (this.isInitialized) return;
    
    // Message listener
    chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
      this.handleMessage(request).then(sendResponse).catch(error => {
        sendResponse({ success: false, error: error.message });
      });
      return true;
    });

    // Track DOM changes
    this.observeDOM();
    
    // Inject visual feedback styles
    this.injectStyles();
    
    this.isInitialized = true;
    console.log('[AI Assistant] Content script initialized');
  }

  async handleMessage(request) {
    switch (request.action) {
      case 'get_structure':
        return this.getPageStructure();
      
      case 'execute_tool':
        return this.executeTool(request.tool, request.params);
      
      case 'execute_action':
        return this.executeAction(request.data);
      
      case 'highlight':
        return this.highlightElement(request.selector);
      
      case 'scroll_to':
        return this.scrollToElement(request.selector);
      
      case 'get_selection':
        return { text: window.getSelection().toString() };
      
      default:
        throw new Error(`Unknown action: ${request.action}`);
    }
  }

  getPageStructure() {
    const getElementInfo = (el, includeText = false) => {
      if (!el) return null;
      const rect = el.getBoundingClientRect();
      return {
        tag: el.tagName.toLowerCase(),
        id: el.id || null,
        classes: Array.from(el.classList),
        text: includeText ? el.innerText?.slice(0, 200) : undefined,
        ariaLabel: el.getAttribute('aria-label') || null,
        ariaRole: el.getAttribute('role') || null,
        placeholder: el.placeholder || null,
        name: el.name || null,
        type: el.type || null,
        href: el.href || null,
        src: el.src || null,
        visible: this.isVisible(el),
        position: {
          top: Math.round(rect.top),
          left: Math.round(rect.left),
          width: Math.round(rect.width),
          height: Math.round(rect.height)
        }
      };
    };

    // Get interactive elements
    const interactiveSelectors = [
      'button', 'a[href]', 'input', 'textarea', 'select',
      '[role="button"]', '[role="link"]', '[role="textbox"]',
      '[onclick]', '[tabindex]:not([tabindex="-1"])'
    ];

    const interactiveElements = Array.from(
      document.querySelectorAll(interactiveSelectors.join(', '))
    ).filter(el => this.isVisible(el)).slice(0, 100);

    // Get forms
    const forms = Array.from(document.forms).map(form => ({
      ...getElementInfo(form),
      action: form.action,
      method: form.method,
      fields: Array.from(form.elements)
        .filter(el => el.name || el.id)
        .map(el => getElementInfo(el, true))
    }));

    // Get main content areas
    const contentSelectors = ['main', 'article', '[role="main"]', '.content', '#content', '.main'];
    const contentAreas = contentSelectors
      .map(sel => document.querySelector(sel))
      .filter(Boolean)
      .map(el => getElementInfo(el, true));

    // Get headings for structure
    const headings = Array.from(document.querySelectorAll('h1, h2, h3, h4, h5, h6'))
      .filter(h => this.isVisible(h))
      .map(h => ({
        level: parseInt(h.tagName[1]),
        text: h.innerText?.slice(0, 200),
        ...getElementInfo(h)
      }));

    // Get navigation
    const navElements = Array.from(
      document.querySelectorAll('nav, [role="navigation"], header, .nav, .navbar, #nav')
    ).map(el => getElementInfo(el, true));

    return {
      url: location.href,
      title: document.title,
      meta: {
        description: document.querySelector('meta[name="description"]')?.content || null,
        keywords: document.querySelector('meta[name="keywords"]')?.content || null,
        author: document.querySelector('meta[name="author"]')?.content || null
      },
      structure: {
        hasLoginForm: !!document.querySelector('input[type="password"]'),
        hasSearch: !!document.querySelector('input[type="search"], input[name*="search"], input[placeholder*="search" i]'),
        hasNavigation: navElements.length > 0,
        contentAreas: contentAreas.length
      },
      headings: headings.slice(0, 20),
      interactive: {
        total: interactiveElements.length,
        buttons: interactiveElements.filter(el => el.tag === 'button' || el.ariaRole === 'button').length,
        links: interactiveElements.filter(el => el.tag === 'a').slice(0, 30),
        inputs: interactiveElements.filter(el => ['input', 'textarea', 'select'].includes(el.tag)).slice(0, 20),
        elements: interactiveElements.slice(0, 50)
      },
      forms: forms,
      navigation: navElements,
      textContent: {
        body: document.body.innerText.slice(0, 3000),
        wordCount: document.body.innerText.split(/\s+/).length
      },
      timestamp: Date.now()
    };
  }

  executeTool(tool, params) {
    const tools = {
      click_element: (p) => this.findAndClick(p.description, p.selector),
      fill_form: (p) => this.fillFormField(p.field_description, p.value, p.selector),
      scroll_page: (p) => this.scrollPage(p.direction, p.amount),
      find_text: (p) => this.findAndHighlight(p.query, p.case_sensitive),
      extract_data: (p) => this.extractData(p.schema),
      navigate: (p) => this.navigate(p.url)
    };

    const handler = tools[tool];
    if (!handler) {
      throw new Error(`Unknown tool: ${tool}`);
    }

    return handler(params);
  }

  findAndClick(description, selector) {
    let element = null;
    let method = 'unknown';

    if (selector) {
      element = document.querySelector(selector);
      method = 'selector';
    }

    if (!element) {
      // Try text content matching
      element = this.findElementByText(description);
      method = element ? 'text' : method;
    }

    if (!element) {
      // Try ARIA label matching
      element = this.findElementByAria(description);
      method = element ? 'aria' : method;
    }

    if (!element) {
      // Try fuzzy matching on interactive elements
      element = this.fuzzyFindElement(description);
      method = element ? 'fuzzy' : method;
    }

    if (!element) {
      return { 
        success: false, 
        error: `Could not find element matching: "${description}"`,
        attempted: { description, selector }
      };
    }

    if (!this.isVisible(element)) {
      return {
        success: false,
        error: `Element found but not visible: "${description}"`,
        element: this.describeElement(element)
      };
    }

    // Scroll into view with smooth animation
    element.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'center' });
    
    // Visual feedback
    this.flashElement(element);
    
    // Click with delay to allow scroll
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          element.click();
          resolve({
            success: true,
            method: method,
            element: this.describeElement(element)
          });
        } catch (error) {
          resolve({
            success: false,
            error: `Click failed: ${error.message}`,
            element: this.describeElement(element)
          });
        }
      }, 500);
    });
  }

  fillFormField(description, value, selector) {
    let input = null;
    let method = 'unknown';

    if (selector) {
      input = document.querySelector(selector);
      method = 'selector';
    }

    if (!input) {
      // Find by label text
      const labels = Array.from(document.querySelectorAll('label'));
      const label = labels.find(l => 
        l.textContent.toLowerCase().includes(description.toLowerCase())
      );
      if (label) {
        const forId = label.getAttribute('for');
        input = forId ? document.getElementById(forId) : label.querySelector('input, textarea, select');
        method = 'label';
      }
    }

    if (!input) {
      // Find by placeholder
      input = document.querySelector(`[placeholder*="${description}" i]`);
      method = input ? 'placeholder' : method;
    }

    if (!input) {
      // Find by name or id
      const inputs = Array.from(document.querySelectorAll('input, textarea, select'));
      input = inputs.find(el => 
        el.name?.toLowerCase().includes(description.toLowerCase()) ||
        el.id?.toLowerCase().includes(description.toLowerCase())
      );
      method = input ? 'name/id' : method;
    }

    if (!input) {
      return {
        success: false,
        error: `Could not find form field: "${description}"`
      };
    }

    // Focus and scroll
    input.focus();
    input.scrollIntoView({ behavior: 'smooth', block: 'center' });
    this.flashElement(input);

    // Fill based on input type
    return new Promise((resolve) => {
      setTimeout(() => {
        try {
          if (input.tagName === 'SELECT') {
            // Handle dropdown
            const option = Array.from(input.options).find(opt => 
              opt.text.toLowerCase().includes(value.toLowerCase()) ||
              opt.value.toLowerCase().includes(value.toLowerCase())
            );
            if (option) {
              input.value = option.value;
            } else {
              throw new Error(`Option "${value}" not found in dropdown`);
            }
          } else {
            // Clear and type
            input.value = '';
            input.value = value;
          }

          // Trigger events
          input.dispatchEvent(new Event('input', { bubbles: true }));
          input.dispatchEvent(new Event('change', { bubbles: true }));
          input.dispatchEvent(new KeyboardEvent('keyup', { bubbles: true }));

          resolve({
            success: true,
            method: method,
            field: {
              tag: input.tagName,
              name: input.name,
              type: input.type,
              value: input.value.slice(0, 50) // Truncate for privacy
            }
          });
        } catch (error) {
          resolve({
            success: false,
            error: error.message
          });
        }
      }, 300);
    });
  }

  scrollPage(direction, amount = 500) {
    const scrollOptions = { behavior: 'smooth' };
    
    switch (direction) {
      case 'up':
        window.scrollBy({ top: -amount, ...scrollOptions });
        break;
      case 'down':
        window.scrollBy({ top: amount, ...scrollOptions });
        break;
      case 'top':
        window.scrollTo({ top: 0, ...scrollOptions });
        break;
      case 'bottom':
        window.scrollTo({ top: document.body.scrollHeight, ...scrollOptions });
        break;
      default:
        throw new Error(`Unknown direction: ${direction}`);
    }

    return {
      success: true,
      direction: direction,
      newPosition: window.scrollY,
      maxScroll: document.body.scrollHeight - window.innerHeight
    };
  }

  findAndHighlight(query, caseSensitive = false) {
    this.clearHighlights();

    if (!query || query.length < 2) {
      return { success: false, error: 'Query too short' };
    }

    const flags = caseSensitive ? 'g' : 'gi';
    const regex = new RegExp(this.escapeRegex(query), flags);
    
    const walker = document.createTreeWalker(
      document.body,
      NodeFilter.SHOW_TEXT,
      {
        acceptNode: (node) => {
          // Skip script and style elements
          const parent = node.parentElement;
          if (parent && ['SCRIPT', 'STYLE', 'NOSCRIPT'].includes(parent.tagName)) {
            return NodeFilter.FILTER_REJECT;
          }
          return regex.test(node.textContent) ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
        }
      }
    );

    const matches = [];
    let textNode;
    const processed = new Set();

    while (textNode = walker.nextNode()) {
      // Avoid processing the same parent multiple times
      if (processed.has(textNode.parentElement)) continue;
      
      const parent = textNode.parentElement;
      const html = parent.innerHTML;
      
      if (!regex.test(html)) continue; // Avoid HTML tags
      
      // Replace text content only
      const newHtml = html.replace(regex, match => 
        `<mark class="ai-assistant-highlight" style="background: #fbbf24; padding: 2px 0; border-radius: 2px;">${match}</mark>`
      );
      
      if (newHtml !== html) {
        parent.innerHTML = newHtml;
        this.highlights.push(parent);
        processed.add(parent);
        matches.push({
          text: textNode.textContent.slice(0, 100),
          element: this.describeElement(parent)
        });
      }
    }

    // Scroll to first match
    const firstMark = document.querySelector('.ai-assistant-highlight');
    if (firstMark) {
      firstMark.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }

    return {
      success: true,
      count: matches.length,
      query: query,
      matches: matches.slice(0, 10)
    };
  }

  extractData(schema) {
    const data = {};
    
    for (const [key, config] of Object.entries(schema)) {
      try {
        if (config.selector) {
          const elements = Array.from(document.querySelectorAll(config.selector));
          
          if (config.multiple) {
            data[key] = elements.map(el => this.extractValue(el, config.attribute, config.transform));
          } else {
            data[key] = this.extractValue(elements[0], config.attribute, config.transform);
          }
        } else if (config.evaluate) {
          // Execute custom JavaScript
          data[key] = eval(config.evaluate);
        }
      } catch (error) {
        data[key] = { error: error.message };
      }
    }

    return { success: true, data };
  }

  navigate(url) {
    window.location.href = url;
    return { success: true, navigating: true };
  }

  // Helper methods
  findElementByText(text) {
    const xpath = `//*[contains(text(), '${text.replace(/'/g, "\\'")}')]`;
    return document.evaluate(
      xpath, 
      document, 
      null, 
      XPathResult.FIRST_ORDERED_NODE_TYPE, 
      null
    ).singleNodeValue;
  }

  findElementByAria(label) {
    return document.querySelector(`[aria-label*="${label}" i], [aria-labelledby*="${label}" i]`);
  }

  fuzzyFindElement(description) {
    const keywords = description.toLowerCase().split(/\s+/);
    const candidates = Array.from(document.querySelectorAll('button, a, input, [role="button"]'));
    
    return candidates.find(el => {
      const text = (el.innerText || el.value || el.getAttribute('aria-label') || '').toLowerCase();
      return keywords.some(kw => text.includes(kw));
    });
  }

  isVisible(el) {
    if (!el) return false;
    const rect = el.getBoundingClientRect();
    const style = window.getComputedStyle(el);
    
    return rect.width > 0 && 
           rect.height > 0 && 
           style.visibility !== 'hidden' && 
           style.display !== 'none' &&
           style.opacity !== '0';
  }

  describeElement(el) {
    if (!el) return null;
    return {
      tag: el.tagName.toLowerCase(),
      id: el.id || null,
      class: el.className || null,
      text: el.innerText?.slice(0, 100) || null,
      type: el.type || null,
      name: el.name || null
    };
  }

  extractValue(element, attribute = 'text', transform) {
    if (!element) return null;
    
    let value;
    switch (attribute) {
      case 'text':
        value = element.innerText;
        break;
      case 'html':
        value = element.innerHTML;
        break;
      case 'href':
        value = element.href;
        break;
      case 'src':
        value = element.src;
        break;
      case 'value':
        value = element.value;
        break;
      default:
        value = element.getAttribute(attribute);
    }

    if (transform === 'number') value = parseFloat(value);
    if (transform === 'date') value = new Date(value).toISOString();
    if (transform === 'trim') value = value?.trim();
    
    return value;
  }

  flashElement(el) {
    const originalOutline = el.style.outline;
    const originalTransition = el.style.transition;
    
    el.style.transition = 'outline 0.2s ease';
    el.style.outline = '3px solid #6366f1';
    el.style.outlineOffset = '2px';
    
    setTimeout(() => {
      el.style.outline = '3px solid #a5b4fc';
      setTimeout(() => {
        el.style.outline = originalOutline;
        el.style.transition = originalTransition;
        el.style.outlineOffset = '';
      }, 300);
    }, 300);
  }

  clearHighlights() {
    // Remove highlight marks but preserve content
    const marks = document.querySelectorAll('.ai-assistant-highlight');
    marks.forEach(mark => {
      const parent = mark.parentNode;
      if (parent) {
        parent.replaceChild(document.createTextNode(mark.textContent), mark);
        parent.normalize(); // Merge adjacent text nodes
      }
    });
    this.highlights = [];
  }

  injectStyles() {
    if (document.getElementById('ai-assistant-styles')) return;
    
    const style = document.createElement('style');
    style.id = 'ai-assistant-styles';
    style.textContent = `
      .ai-assistant-highlight {
        animation: ai-pulse 2s ease-in-out infinite;
      }
      @keyframes ai-pulse {
        0%, 100% { background-color: #fbbf24; }
        50% { background-color: #f59e0b; }
      }
    `;
    document.head.appendChild(style);
  }

  observeDOM() {
    // Debounced mutation observer
    let timeout;
    const observer = new MutationObserver(() => {
      clearTimeout(timeout);
      timeout = setTimeout(() => {
        // Notify background of significant changes
        chrome.runtime.sendMessage({
          action: 'dom_changed',
          url: location.href,
          timestamp: Date.now()
        }).catch(() => {}); // Ignore errors if background not listening
      }, 1000);
    });

    observer.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ['class', 'style', 'hidden']
    });
  }

  scrollToElement(selector) {
    const el = document.querySelector(selector);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
      this.flashElement(el);
      return { success: true };
    }
    return { success: false, error: 'Element not found' };
  }

  escapeRegex(string) {
    return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  }
}

// Initialize
const controller = new PageController();