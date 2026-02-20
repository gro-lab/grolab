import { StorageManager } from '../src/utils.js';

describe('StorageManager', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('get returns value from storage', async () => {
    const mockData = { test: 'value' };
    chrome.storage.local.get.mockResolvedValue(mockData);
    
    const storage = new StorageManager();
    const result = await storage.get('test');
    
    expect(result).toBe('value');
    expect(chrome.storage.local.get).toHaveBeenCalledWith('test');
  });

  test('set stores value', async () => {
    chrome.storage.local.set.mockResolvedValue(undefined);
    
    const storage = new StorageManager();
    await storage.set('key', 'value');
    
    expect(chrome.storage.local.set).toHaveBeenCalledWith({ key: 'value' });
  });
});