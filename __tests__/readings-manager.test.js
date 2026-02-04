// Mock DOM and globals
global.document = {
  getElementById: jest.fn(() => ({ 
    value: '', 
    classList: { add: jest.fn(), remove: jest.fn() },
    style: { display: '' },
    textContent: '',
    innerHTML: ''
  })),
  querySelector: jest.fn(() => ({ style: { display: '' } })),
  querySelectorAll: jest.fn(() => [])
};

global.window = {
  session: {
    hasValidSession: true,
    addReading: jest.fn(),
    removeReading: jest.fn(),
    readings: []
  },
  settings: {
    get: jest.fn(() => ['Cash', 'CC'])
  },
  vibrate: jest.fn(),
  showSnackbar: jest.fn(),
  showSheet: jest.fn(),
  hideSheet: jest.fn()
};

const fs = require('fs');
const path = require('path');

describe('ReadingsManager', () => {
  let ReadingsManager;
  let manager;

  beforeAll(() => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'modules', 'readings-manager.js'), 'utf8');
    ReadingsManager = eval(`(function() { ${code}; return ReadingsManager; })()`);
  });

  beforeEach(() => {
    manager = new ReadingsManager();
  });

  test('should instantiate', () => {
    expect(manager).toBeDefined();
  });

  test('should have addReading method', () => {
    expect(typeof manager.addReading).toBe('function');
  });

  test('should have removeReading method', () => {
    expect(typeof manager.removeReading).toBe('function');
  });

  test('should have deleteReading method', () => {
    expect(typeof manager.deleteReading).toBe('function');
  });

  test('should have openPaymentSheet method', () => {
    expect(typeof manager.openPaymentSheet).toBe('function');
  });

  test('should have closePaymentSheet method', () => {
    expect(typeof manager.closePaymentSheet).toBe('function');
  });

  test('should have openSourceSheet method', () => {
    expect(typeof manager.openSourceSheet).toBe('function');
  });

  test('should have closeSourceSheet method', () => {
    expect(typeof manager.closeSourceSheet).toBe('function');
  });
});
