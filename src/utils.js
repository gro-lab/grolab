/**
 * Utility Classes
 * Storage management and helper functions
 */

export class StorageManager {
  constructor() {
    this.cache = new Map();
  }

  async get(key) {
    if (this.cache.has(key)) {
      return this.cache.get(key);
    }
    
    try {
      const result = await chrome.storage.local.get(key);
      const value = result[key];
      this.cache.set(key, value);
      return value;
    } catch (error) {
      console.error('Storage get error:', error);
      return null;
    }
  }

  async set(key, value) {
    try {
      await chrome.storage.local.set({ [key]: value });
      this.cache.set(key, value);
      return true;
    } catch (error) {
      console.error('Storage set error:', error);
      return false;
    }
  }

  async remove(key) {
    try {
      await chrome.storage.local.remove(key);
      this.cache.delete(key);
      return true;
    } catch (error) {
      console.error('Storage remove error:', error);
      return false;
    }
  }

  async clear() {
    try {
      await chrome.storage.local.clear();
      this.cache.clear();
      return true;
    } catch (error) {
      console.error('Storage clear error:', error);
      return false;
    }
  }
}

export class DOMUtils {
  static isVisible(element) {
    if (!element) return false;
    const rect = element.getBoundingClientRect();
    const style = window.getComputedStyle(element);
    return rect.width > 0 && 
           rect.height > 0 && 
           style.visibility !== 'hidden' && 
           style.display !== 'none';
  }

  static getXPath(element) {
    if (element.id) return `//*[@id="${element.id}"]`;
    if (element === document.body) return '/html/body';
    
    const idx = Array.from(element.parentNode.children)
      .filter(child => child.tagName === element.tagName)
      .indexOf(element) + 1;
    
    return `${this.getXPath(element.parentNode)}/${element.tagName.toLowerCase()}[${idx}]`;
  }

  static generateSelector(element) {
    if (element.id) return `#${element.id}`;
    if (element.className) {
      const classes = element.className.split(' ').filter(c => c && !c.startsWith('ai-'));
      if (classes.length) return `.${classes.join('.')}`;
    }
    
    let selector = element.tagName.toLowerCase();
    if (element.name) selector += `[name="${element.name}"]`;
    return selector;
  }
}

export class Debouncer {
  constructor(delay = 300) {
    this.delay = delay;
    this.timeout = null;
  }

  execute(fn) {
    clearTimeout(this.timeout);
    this.timeout = setTimeout(fn, this.delay);
  }

  cancel() {
    clearTimeout(this.timeout);
  }
}