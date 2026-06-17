// Mock DOM and globals
global.document = {
  getElementById: jest.fn(() => ({ 
    classList: { add: jest.fn(), remove: jest.fn(), toggle: jest.fn() },
    style: { display: '' },
    value: '',
    innerHTML: ''
  })),
  querySelector: jest.fn(() => ({ classList: { add: jest.fn() } })),
  body: { classList: { add: jest.fn(), remove: jest.fn() } }
};

// Mock globals used by SettingsStore methods
global.vibrate = jest.fn();
global.showSheet = jest.fn();
global.hideSheet = jest.fn();
global.showSnackbar = jest.fn();
global.window = global.window || {};
global.window.timer = null;
global.window.session = { user: 'TestUser' };

// localStorage mock with jest.fn — must override what jest.setup.js provides
const mockLocalStorage = {
  store: {},
  getItem: jest.fn(function(key) { return this.store[key] || null; }),
  setItem: jest.fn(function(key, value) { this.store[key] = String(value); }),
  removeItem: jest.fn(function(key) { delete this.store[key]; }),
  clear: jest.fn(function() { this.store = {}; })
};
Object.defineProperty(global, 'localStorage', { value: mockLocalStorage, writable: true });

const fs = require('fs');
const path = require('path');

describe('SettingsStore', () => {
  let SettingsStore;
  let settings;

  beforeAll(() => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'modules', 'settings-store.js'), 'utf8');
    SettingsStore = eval(`(function() { ${code}; return SettingsStore; })()`);
  });

  beforeEach(() => {
    mockLocalStorage.store = {};
    mockLocalStorage.getItem.mockClear();
    mockLocalStorage.setItem.mockClear();
    settings = new SettingsStore();
  });

  test('should instantiate with defaults', () => {
    expect(settings).toBeDefined();
    expect(settings.get('sound')).toBe(true);
    expect(settings.get('haptic')).toBe(true);
    expect(settings.get('defaultTimer')).toBe(15);
  });

  test('should get setting value', () => {
    expect(settings.get('sound')).toBe(true);
  });

  test('should set setting value', () => {
    settings.set('sound', false);
    expect(settings.get('sound')).toBe(false);
  });

  test('should have openDrawer method', () => {
    expect(typeof settings.openDrawer).toBe('function');
  });

  test('should have closeDrawer method', () => {
    expect(typeof settings.closeDrawer).toBe('function');
  });

  test('should have toggleSetting method', () => {
    expect(typeof settings.toggleSetting).toBe('function');
  });

  test('should have updateSetting method', () => {
    expect(typeof settings.updateSetting).toBe('function');
  });

  test('should have customizePaymentMethods method', () => {
    expect(typeof settings.customizePaymentMethods).toBe('function');
  });

  test('should have customizeSources method', () => {
    expect(typeof settings.customizeSources).toBe('function');
  });

  test('should have exportData method', () => {
    expect(typeof settings.exportData).toBe('function');
  });

  // === Task 2.7: Scoped Sources, Migration, and Price Presets ===

  describe('scoped sources defaults', () => {
    test('default sources are object[] with name and scope properties', () => {
      const sources = settings.get('sources');
      expect(Array.isArray(sources)).toBe(true);
      sources.forEach(source => {
        expect(source).toHaveProperty('name');
        expect(source).toHaveProperty('scope');
        expect(typeof source.name).toBe('string');
        expect(['event', 'private', 'all']).toContain(source.scope);
      });
    });

    test('default sources have correct names and scopes', () => {
      const sources = settings.get('sources');
      expect(sources).toEqual([
        { name: 'Referral', scope: 'event' },
        { name: 'Renu', scope: 'event' },
        { name: 'POG', scope: 'event' },
        { name: 'Repeat', scope: 'all' },
        { name: 'Phone', scope: 'private' },
        { name: 'In-Person', scope: 'private' }
      ]);
    });

    test('default sources contain event-scoped entries', () => {
      const sources = settings.get('sources');
      const eventSources = sources.filter(s => s.scope === 'event');
      expect(eventSources.length).toBe(3);
      expect(eventSources.map(s => s.name)).toEqual(['Referral', 'Renu', 'POG']);
    });

    test('default sources contain private-scoped entries', () => {
      const sources = settings.get('sources');
      const privateSources = sources.filter(s => s.scope === 'private');
      expect(privateSources.length).toBe(2);
      expect(privateSources.map(s => s.name)).toEqual(['Phone', 'In-Person']);
    });

    test('default sources contain all-scoped entries', () => {
      const sources = settings.get('sources');
      const allSources = sources.filter(s => s.scope === 'all');
      expect(allSources.length).toBe(1);
      expect(allSources[0].name).toBe('Repeat');
    });
  });

  describe('privatePricePresets defaults', () => {
    test('default privatePricePresets is [60, 120, 150]', () => {
      expect(settings.get('privatePricePresets')).toEqual([60, 120, 150]);
    });

    test('privatePricePresets are all numbers', () => {
      const presets = settings.get('privatePricePresets');
      presets.forEach(p => expect(typeof p).toBe('number'));
    });
  });

  describe('migrateSources', () => {
    test('converts legacy string[] to object[] with scope event', () => {
      const legacySettings = {
        sources: ['Referral', 'Walk-in', 'Facebook']
      };
      const result = settings.migrateSources(legacySettings);
      expect(result).toBe(true);
      expect(legacySettings.sources).toEqual([
        { name: 'Referral', scope: 'event' },
        { name: 'Walk-in', scope: 'event' },
        { name: 'Facebook', scope: 'event' }
      ]);
    });

    test('returns false when sources are already object[]', () => {
      const modernSettings = {
        sources: [
          { name: 'Referral', scope: 'event' },
          { name: 'Phone', scope: 'private' }
        ]
      };
      const result = settings.migrateSources(modernSettings);
      expect(result).toBe(false);
      // Sources unchanged
      expect(modernSettings.sources).toEqual([
        { name: 'Referral', scope: 'event' },
        { name: 'Phone', scope: 'private' }
      ]);
    });

    test('returns false when sources array is empty', () => {
      const emptySettings = { sources: [] };
      const result = settings.migrateSources(emptySettings);
      expect(result).toBe(false);
    });

    test('migration runs on load when localStorage has legacy format', () => {
      const legacyData = JSON.stringify({
        sound: true,
        sources: ['OldSource1', 'OldSource2']
      });
      mockLocalStorage.store['tarotTrackerSettings'] = legacyData;
      
      const migratedStore = new SettingsStore();
      const sources = migratedStore.get('sources');
      
      // Should now be object format
      expect(sources[0]).toHaveProperty('name');
      expect(sources[0]).toHaveProperty('scope');
      expect(sources[0]).toEqual({ name: 'OldSource1', scope: 'event' });
      expect(sources[1]).toEqual({ name: 'OldSource2', scope: 'event' });
      
      // Should have saved the migrated data
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('source CRUD operations (new object format)', () => {
    test('updateSource changes the name at given index', () => {
      settings.updateSource(0, 'name', 'NewName');
      const sources = settings.get('sources');
      expect(sources[0].name).toBe('NewName');
    });

    test('updateSource changes the scope at given index', () => {
      settings.updateSource(0, 'scope', 'private');
      const sources = settings.get('sources');
      expect(sources[0].scope).toBe('private');
    });

    test('deleteSource removes source at given index', () => {
      const originalLength = settings.get('sources').length;
      const originalSecond = settings.get('sources')[1];
      settings.deleteSource(0);
      const sources = settings.get('sources');
      expect(sources.length).toBe(originalLength - 1);
      expect(sources[0].name).toBe(originalSecond.name);
    });

    test('addSource appends new source with name "New Source" and scope "all"', () => {
      const originalLength = settings.get('sources').length;
      settings.addSource();
      const sources = settings.get('sources');
      expect(sources.length).toBe(originalLength + 1);
      const added = sources[sources.length - 1];
      expect(added).toEqual({ name: 'New Source', scope: 'all' });
    });

    test('updateSource preserves other sources unchanged', () => {
      const originalSources = [...settings.get('sources')];
      settings.updateSource(1, 'name', 'Changed');
      const sources = settings.get('sources');
      // First source unchanged
      expect(sources[0].name).toBe(originalSources[0].name);
      expect(sources[0].scope).toBe(originalSources[0].scope);
      // Second source name changed, scope preserved
      expect(sources[1].name).toBe('Changed');
      expect(sources[1].scope).toBe(originalSources[1].scope);
    });
  });
});
