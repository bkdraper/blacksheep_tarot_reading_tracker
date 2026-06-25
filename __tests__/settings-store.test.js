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
        { name: 'Repeat', scope: 'all' }
      ]);
    });

    test('default sources contain event-scoped entries', () => {
      const sources = settings.get('sources');
      const eventSources = sources.filter(s => s.scope === 'event');
      expect(eventSources.length).toBe(3);
      expect(eventSources.map(s => s.name)).toEqual(['Referral', 'Renu', 'POG']);
    });

    test('default sources contain no private-scoped entries', () => {
      const sources = settings.get('sources');
      const privateSources = sources.filter(s => s.scope === 'private');
      expect(privateSources.length).toBe(0);
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

  describe('migrateSourcesFormats', () => {
    test('removes exact "Phone" and "In-Person" from sources', () => {
      const testSettings = {
        sources: [
          { name: 'Referral', scope: 'event' },
          { name: 'Phone', scope: 'private' },
          { name: 'In-Person', scope: 'private' },
          { name: 'Repeat', scope: 'all' }
        ],
        formats: [
          { name: 'Expo', scope: 'event' }
        ]
      };
      const result = settings.migrateSourcesFormats(testSettings);
      expect(result).toBe(true);
      expect(testSettings.sources).toEqual([
        { name: 'Referral', scope: 'event' },
        { name: 'Repeat', scope: 'all' }
      ]);
    });

    test('does NOT remove substring matches like "iPhone Reading"', () => {
      const testSettings = {
        sources: [
          { name: 'iPhone Reading', scope: 'event' },
          { name: 'In-Person Deluxe', scope: 'private' },
          { name: 'Phone', scope: 'private' }
        ],
        formats: [
          { name: 'Expo', scope: 'event' }
        ]
      };
      settings.migrateSourcesFormats(testSettings);
      expect(testSettings.sources).toEqual([
        { name: 'iPhone Reading', scope: 'event' },
        { name: 'In-Person Deluxe', scope: 'private' }
      ]);
    });

    test('adds removed sources to formats as private scope', () => {
      const testSettings = {
        sources: [
          { name: 'Phone', scope: 'private' },
          { name: 'In-Person', scope: 'private' }
        ],
        formats: [
          { name: 'Expo', scope: 'event' }
        ]
      };
      settings.migrateSourcesFormats(testSettings);
      expect(testSettings.formats).toContainEqual({ name: 'Phone', scope: 'private' });
      expect(testSettings.formats).toContainEqual({ name: 'In-Person', scope: 'private' });
    });

    test('does not add to formats if already present (case-insensitive)', () => {
      const testSettings = {
        sources: [
          { name: 'Phone', scope: 'private' }
        ],
        formats: [
          { name: 'phone', scope: 'private' }
        ]
      };
      settings.migrateSourcesFormats(testSettings);
      const phoneFormats = testSettings.formats.filter(f => f.name.toLowerCase() === 'phone');
      expect(phoneFormats.length).toBe(1);
    });

    test('skips migration if legacySourcesMigrated is true', () => {
      const testSettings = {
        legacySourcesMigrated: true,
        sources: [
          { name: 'Phone', scope: 'private' },
          { name: 'In-Person', scope: 'private' }
        ],
        formats: []
      };
      const result = settings.migrateSourcesFormats(testSettings);
      expect(result).toBe(false);
      // Sources unchanged
      expect(testSettings.sources.length).toBe(2);
    });

    test('sets legacySourcesMigrated flag after migration', () => {
      const testSettings = {
        sources: [
          { name: 'Referral', scope: 'event' }
        ],
        formats: [
          { name: 'Expo', scope: 'event' }
        ]
      };
      settings.migrateSourcesFormats(testSettings);
      expect(testSettings.legacySourcesMigrated).toBe(true);
    });

    test('initializes formats from defaults if not present', () => {
      const testSettings = {
        sources: [
          { name: 'Referral', scope: 'event' }
        ]
      };
      const result = settings.migrateSourcesFormats(testSettings);
      expect(result).toBe(true);
      expect(testSettings.formats).toBeDefined();
      expect(testSettings.formats.length).toBe(settings.defaults.formats.length);
    });

    test('runs on load when localStorage has legacy Phone/In-Person sources', () => {
      const legacyData = JSON.stringify({
        sources: [
          { name: 'Referral', scope: 'event' },
          { name: 'Phone', scope: 'private' },
          { name: 'In-Person', scope: 'private' }
        ]
      });
      mockLocalStorage.store['tarotTrackerSettings'] = legacyData;

      const migratedStore = new SettingsStore();
      const sources = migratedStore.get('sources');

      // Phone and In-Person should be removed
      expect(sources.find(s => s.name === 'Phone')).toBeUndefined();
      expect(sources.find(s => s.name === 'In-Person')).toBeUndefined();
      expect(sources.find(s => s.name === 'Referral')).toBeDefined();

      // Formats should contain Phone and In-Person
      const formats = migratedStore.get('formats');
      expect(formats.find(f => f.name === 'Phone')).toBeDefined();
      expect(formats.find(f => f.name === 'In-Person')).toBeDefined();

      // Should have persisted
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    test('returns false when no sources to remove and formats already exist', () => {
      const testSettings = {
        sources: [
          { name: 'Referral', scope: 'event' }
        ],
        formats: [
          { name: 'Expo', scope: 'event' }
        ]
      };
      const result = settings.migrateSourcesFormats(testSettings);
      // No Phone/In-Person to remove, formats already exist — but flag still gets set
      // The function returns true only if sources were removed or formats were initialized
      expect(result).toBe(false);
      expect(testSettings.legacySourcesMigrated).toBe(true);
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

  // === Task 6.1: SettingsStore Format Tests ===

  describe('format defaults', () => {
    test('defaults contain exactly 8 format entries', () => {
      const formats = settings.defaults.formats;
      expect(formats.length).toBe(8);
    });

    test('defaults contain 6 event-scoped formats', () => {
      const formats = settings.defaults.formats;
      const eventFormats = formats.filter(f => f.scope === 'event');
      expect(eventFormats.length).toBe(6);
      expect(eventFormats.map(f => f.name)).toEqual(['Expo', 'Fair', 'Festival', 'Shop', 'Party', 'Market']);
    });

    test('defaults contain 2 private-scoped formats', () => {
      const formats = settings.defaults.formats;
      const privateFormats = formats.filter(f => f.scope === 'private');
      expect(privateFormats.length).toBe(2);
      expect(privateFormats.map(f => f.name)).toEqual(['Phone', 'In-Person']);
    });

    test('default sources do NOT contain Phone', () => {
      const sources = settings.defaults.sources;
      const phone = sources.find(s => s.name === 'Phone');
      expect(phone).toBeUndefined();
    });

    test('default sources do NOT contain In-Person', () => {
      const sources = settings.defaults.sources;
      const inPerson = sources.find(s => s.name === 'In-Person');
      expect(inPerson).toBeUndefined();
    });

    test('new instance has 8 formats loaded', () => {
      const formats = settings.get('formats');
      expect(formats.length).toBe(8);
    });

    test('format entries have name and scope properties', () => {
      const formats = settings.get('formats');
      formats.forEach(f => {
        expect(f).toHaveProperty('name');
        expect(f).toHaveProperty('scope');
        expect(typeof f.name).toBe('string');
        expect(['event', 'private', 'all']).toContain(f.scope);
      });
    });
  });

  describe('migrateSourcesFormats — removal and addition', () => {
    test('removes exact "Phone" from sources', () => {
      const testSettings = {
        sources: [
          { name: 'Referral', scope: 'event' },
          { name: 'Phone', scope: 'private' },
          { name: 'Repeat', scope: 'all' }
        ],
        formats: [{ name: 'Expo', scope: 'event' }]
      };
      settings.migrateSourcesFormats(testSettings);
      expect(testSettings.sources.find(s => s.name === 'Phone')).toBeUndefined();
      expect(testSettings.sources.length).toBe(2);
    });

    test('removes exact "In-Person" from sources', () => {
      const testSettings = {
        sources: [
          { name: 'In-Person', scope: 'private' },
          { name: 'Referral', scope: 'event' }
        ],
        formats: [{ name: 'Expo', scope: 'event' }]
      };
      settings.migrateSourcesFormats(testSettings);
      expect(testSettings.sources.find(s => s.name === 'In-Person')).toBeUndefined();
      expect(testSettings.sources.length).toBe(1);
    });

    test('adds Phone to formats as private scope when removed from sources', () => {
      const testSettings = {
        sources: [{ name: 'Phone', scope: 'private' }],
        formats: [{ name: 'Expo', scope: 'event' }]
      };
      settings.migrateSourcesFormats(testSettings);
      expect(testSettings.formats).toContainEqual({ name: 'Phone', scope: 'private' });
    });

    test('adds In-Person to formats as private scope when removed from sources', () => {
      const testSettings = {
        sources: [{ name: 'In-Person', scope: 'private' }],
        formats: [{ name: 'Expo', scope: 'event' }]
      };
      settings.migrateSourcesFormats(testSettings);
      expect(testSettings.formats).toContainEqual({ name: 'In-Person', scope: 'private' });
    });

    test('does not duplicate Phone in formats if already present', () => {
      const testSettings = {
        sources: [{ name: 'Phone', scope: 'private' }],
        formats: [{ name: 'Phone', scope: 'private' }]
      };
      settings.migrateSourcesFormats(testSettings);
      const phoneFormats = testSettings.formats.filter(f => f.name === 'Phone');
      expect(phoneFormats.length).toBe(1);
    });

    test('does not duplicate In-Person in formats if already present (case-insensitive)', () => {
      const testSettings = {
        sources: [{ name: 'In-Person', scope: 'private' }],
        formats: [{ name: 'in-person', scope: 'private' }]
      };
      settings.migrateSourcesFormats(testSettings);
      const inPersonFormats = testSettings.formats.filter(f => f.name.toLowerCase() === 'in-person');
      expect(inPersonFormats.length).toBe(1);
    });

    test('returns true when sources were removed', () => {
      const testSettings = {
        sources: [{ name: 'Phone', scope: 'private' }],
        formats: [{ name: 'Expo', scope: 'event' }]
      };
      const result = settings.migrateSourcesFormats(testSettings);
      expect(result).toBe(true);
    });
  });

  describe('migrateSourcesFormats — flag behavior', () => {
    test('skips migration when legacySourcesMigrated is true', () => {
      const testSettings = {
        legacySourcesMigrated: true,
        sources: [
          { name: 'Phone', scope: 'private' },
          { name: 'In-Person', scope: 'private' }
        ],
        formats: []
      };
      const result = settings.migrateSourcesFormats(testSettings);
      expect(result).toBe(false);
      expect(testSettings.sources.length).toBe(2);
    });

    test('does not modify sources when flag is true', () => {
      const testSettings = {
        legacySourcesMigrated: true,
        sources: [{ name: 'Phone', scope: 'private' }],
        formats: [{ name: 'Expo', scope: 'event' }]
      };
      settings.migrateSourcesFormats(testSettings);
      expect(testSettings.sources[0].name).toBe('Phone');
    });

    test('does not modify formats when flag is true', () => {
      const testSettings = {
        legacySourcesMigrated: true,
        sources: [{ name: 'Phone', scope: 'private' }],
        formats: [{ name: 'Expo', scope: 'event' }]
      };
      settings.migrateSourcesFormats(testSettings);
      expect(testSettings.formats.length).toBe(1);
      expect(testSettings.formats[0].name).toBe('Expo');
    });

    test('sets legacySourcesMigrated to true after migration', () => {
      const testSettings = {
        sources: [{ name: 'Referral', scope: 'event' }],
        formats: [{ name: 'Expo', scope: 'event' }]
      };
      settings.migrateSourcesFormats(testSettings);
      expect(testSettings.legacySourcesMigrated).toBe(true);
    });
  });

  describe('migrateSourcesFormats — substring handling', () => {
    test('does NOT remove "iPhone Reading" (Phone is substring)', () => {
      const testSettings = {
        sources: [
          { name: 'iPhone Reading', scope: 'event' },
          { name: 'Phone', scope: 'private' }
        ],
        formats: [{ name: 'Expo', scope: 'event' }]
      };
      settings.migrateSourcesFormats(testSettings);
      expect(testSettings.sources.find(s => s.name === 'iPhone Reading')).toBeDefined();
    });

    test('does NOT remove "In-Person Deluxe" (In-Person is substring)', () => {
      const testSettings = {
        sources: [
          { name: 'In-Person Deluxe', scope: 'private' },
          { name: 'In-Person', scope: 'private' }
        ],
        formats: [{ name: 'Expo', scope: 'event' }]
      };
      settings.migrateSourcesFormats(testSettings);
      expect(testSettings.sources.find(s => s.name === 'In-Person Deluxe')).toBeDefined();
    });

    test('does NOT remove "Telephone" (contains Phone substring)', () => {
      const testSettings = {
        sources: [
          { name: 'Telephone', scope: 'private' },
          { name: 'Phone', scope: 'private' }
        ],
        formats: [{ name: 'Expo', scope: 'event' }]
      };
      settings.migrateSourcesFormats(testSettings);
      expect(testSettings.sources.find(s => s.name === 'Telephone')).toBeDefined();
    });

    test('does NOT remove "My Phone App" (contains Phone)', () => {
      const testSettings = {
        sources: [{ name: 'My Phone App', scope: 'event' }],
        formats: [{ name: 'Expo', scope: 'event' }]
      };
      settings.migrateSourcesFormats(testSettings);
      expect(testSettings.sources.find(s => s.name === 'My Phone App')).toBeDefined();
    });
  });

  describe('migrateSourcesFormats — initializes formats from defaults', () => {
    test('initializes formats from defaults when formats key is missing', () => {
      const testSettings = {
        sources: [{ name: 'Referral', scope: 'event' }]
      };
      settings.migrateSourcesFormats(testSettings);
      expect(testSettings.formats).toBeDefined();
      expect(testSettings.formats.length).toBe(settings.defaults.formats.length);
    });

    test('initialized formats match default values', () => {
      const testSettings = {
        sources: [{ name: 'Referral', scope: 'event' }]
      };
      settings.migrateSourcesFormats(testSettings);
      settings.defaults.formats.forEach((defaultFormat, i) => {
        expect(testSettings.formats[i].name).toBe(defaultFormat.name);
        expect(testSettings.formats[i].scope).toBe(defaultFormat.scope);
      });
    });

    test('does not re-initialize formats when formats already exist', () => {
      const testSettings = {
        sources: [{ name: 'Phone', scope: 'private' }],
        formats: [{ name: 'Custom', scope: 'all' }]
      };
      settings.migrateSourcesFormats(testSettings);
      // Should still have Custom plus the migrated Phone
      expect(testSettings.formats.find(f => f.name === 'Custom')).toBeDefined();
    });

    test('returns true when formats were initialized from defaults', () => {
      const testSettings = {
        sources: [{ name: 'Referral', scope: 'event' }]
      };
      const result = settings.migrateSourcesFormats(testSettings);
      expect(result).toBe(true);
    });
  });

  describe('addFormat', () => {
    test('appends a new format with name "New Format" and scope "all"', () => {
      const originalLength = settings.get('formats').length;
      settings.addFormat();
      const formats = settings.get('formats');
      expect(formats.length).toBe(originalLength + 1);
      const added = formats[formats.length - 1];
      expect(added).toEqual({ name: 'New Format', scope: 'all' });
    });

    test('preserves existing formats when adding', () => {
      const original = [...settings.get('formats')];
      settings.addFormat();
      const formats = settings.get('formats');
      original.forEach((f, i) => {
        expect(formats[i].name).toBe(f.name);
        expect(formats[i].scope).toBe(f.scope);
      });
    });

    test('persists after add', () => {
      settings.addFormat();
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('updateFormat', () => {
    test('updates name at given index', () => {
      settings.updateFormat(0, 'name', 'NewExpo');
      const formats = settings.get('formats');
      expect(formats[0].name).toBe('NewExpo');
    });

    test('updates scope at given index', () => {
      settings.updateFormat(0, 'scope', 'all');
      const formats = settings.get('formats');
      expect(formats[0].scope).toBe('all');
    });

    test('trims whitespace from name', () => {
      settings.updateFormat(0, 'name', '  Trimmed  ');
      const formats = settings.get('formats');
      expect(formats[0].name).toBe('Trimmed');
    });

    test('preserves other formats when updating one', () => {
      const originalSecond = settings.get('formats')[1];
      settings.updateFormat(0, 'name', 'Changed');
      const formats = settings.get('formats');
      expect(formats[1].name).toBe(originalSecond.name);
      expect(formats[1].scope).toBe(originalSecond.scope);
    });

    test('persists after update', () => {
      mockLocalStorage.setItem.mockClear();
      settings.updateFormat(0, 'name', 'Updated');
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });
  });

  describe('deleteFormat', () => {
    test('removes format at given index', () => {
      const originalLength = settings.get('formats').length;
      const secondFormat = settings.get('formats')[1];
      settings.deleteFormat(0);
      const formats = settings.get('formats');
      expect(formats.length).toBe(originalLength - 1);
      expect(formats[0].name).toBe(secondFormat.name);
    });

    test('preserves order of remaining formats', () => {
      const original = [...settings.get('formats')];
      settings.deleteFormat(1);
      const formats = settings.get('formats');
      expect(formats[0].name).toBe(original[0].name);
      expect(formats[1].name).toBe(original[2].name);
    });

    test('persists after delete', () => {
      mockLocalStorage.setItem.mockClear();
      settings.deleteFormat(0);
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    test('can delete the last remaining format', () => {
      // Reduce to 1 format
      while (settings.get('formats').length > 1) {
        settings.deleteFormat(0);
      }
      settings.deleteFormat(0);
      expect(settings.get('formats').length).toBe(0);
    });
  });

  describe('updateFormat — duplicate name rejection (case-insensitive, same scope)', () => {
    test('rejects duplicate name within same scope', () => {
      // formats[0] is Expo (event), formats[1] is Fair (event)
      settings.updateFormat(1, 'name', 'Expo');
      const formats = settings.get('formats');
      // Name should NOT have changed to Expo (rejected)
      expect(formats[1].name).toBe('Fair');
    });

    test('rejects duplicate name case-insensitively within same scope', () => {
      // formats[0] is Expo (event), try to rename formats[1] to "expo"
      settings.updateFormat(1, 'name', 'expo');
      const formats = settings.get('formats');
      expect(formats[1].name).toBe('Fair');
    });

    test('allows same name in different scope', () => {
      // formats[0] is Expo (event), change formats[6] Phone (private) to "Expo"
      settings.updateFormat(6, 'name', 'Expo');
      const formats = settings.get('formats');
      expect(formats[6].name).toBe('Expo');
    });

    test('shows error snackbar on duplicate rejection', () => {
      global.showSnackbar.mockClear();
      settings.updateFormat(1, 'name', 'Expo');
      expect(global.showSnackbar).toHaveBeenCalledWith('Name already in use', 'error');
    });
  });

  describe('updateFormat — empty name removal', () => {
    test('removes format when name is set to empty string', () => {
      const originalLength = settings.get('formats').length;
      settings.updateFormat(0, 'name', '');
      const formats = settings.get('formats');
      expect(formats.length).toBe(originalLength - 1);
    });

    test('removes format when name is whitespace only', () => {
      const originalLength = settings.get('formats').length;
      settings.updateFormat(0, 'name', '   ');
      const formats = settings.get('formats');
      expect(formats.length).toBe(originalLength - 1);
    });

    test('preserves other formats after empty-name removal', () => {
      const original = [...settings.get('formats')];
      settings.updateFormat(0, 'name', '');
      const formats = settings.get('formats');
      expect(formats[0].name).toBe(original[1].name);
    });
  });

  describe('migrateSourcesFormats — integration with loadSettings', () => {
    test('migration runs on load and persists immediately', () => {
      const legacyData = JSON.stringify({
        sources: [
          { name: 'Referral', scope: 'event' },
          { name: 'Phone', scope: 'private' },
          { name: 'In-Person', scope: 'private' }
        ]
      });
      mockLocalStorage.store = {};
      mockLocalStorage.store['tarotTrackerSettings'] = legacyData;
      mockLocalStorage.setItem.mockClear();

      const freshStore = new SettingsStore();
      
      // Phone/In-Person removed from sources
      const sources = freshStore.get('sources');
      expect(sources.find(s => s.name === 'Phone')).toBeUndefined();
      expect(sources.find(s => s.name === 'In-Person')).toBeUndefined();
      
      // Formats contain Phone and In-Person
      const formats = freshStore.get('formats');
      expect(formats.find(f => f.name === 'Phone')).toBeDefined();
      expect(formats.find(f => f.name === 'In-Person')).toBeDefined();
      
      // Persisted
      expect(mockLocalStorage.setItem).toHaveBeenCalled();
    });

    test('migration does not run again on second load (flag set)', () => {
      // First load triggers migration
      const legacyData = JSON.stringify({
        sources: [
          { name: 'Phone', scope: 'private' }
        ]
      });
      mockLocalStorage.store = {};
      mockLocalStorage.store['tarotTrackerSettings'] = legacyData;
      const firstStore = new SettingsStore();
      
      // Capture what was persisted
      const persistedJson = mockLocalStorage.store['tarotTrackerSettings'];
      const persisted = JSON.parse(persistedJson);
      expect(persisted.legacySourcesMigrated).toBe(true);
      
      // Second load from the persisted data
      mockLocalStorage.setItem.mockClear();
      const secondStore = new SettingsStore();
      const sources = secondStore.get('sources');
      // Phone should still be gone (from first migration)
      expect(sources.find(s => s.name === 'Phone')).toBeUndefined();
    });
  });
});
