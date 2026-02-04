// Mock DOM and globals
global.document = {
  getElementById: jest.fn(() => ({ 
    classList: { add: jest.fn(), remove: jest.fn(), toggle: jest.fn() },
    style: { display: '' },
    value: ''
  })),
  querySelector: jest.fn(() => ({ classList: { add: jest.fn() } }))
};

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
});
