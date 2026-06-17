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
    addReading: jest.fn(() => Promise.resolve()),
    removeReading: jest.fn(() => Promise.resolve()),
    readings: [],
    price: 40,
    type: 'event'
  },
  settings: {
    get: jest.fn((key) => {
      if (key === 'sources') return [
        { name: 'Referral', scope: 'event' },
        { name: 'Repeat', scope: 'all' },
        { name: 'Phone', scope: 'private' }
      ];
      if (key === 'paymentMethods') return ['Cash', 'CC'];
      return ['Cash', 'CC'];
    })
  },
  vibrate: jest.fn(),
  showSnackbar: jest.fn(),
  showSheet: jest.fn(),
  hideSheet: jest.fn()
};

global.Utils = {
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
    jest.clearAllMocks();
    // Restore session mock after clearAllMocks wipes the functions
    global.window.session = {
      hasValidSession: true,
      addReading: jest.fn(() => Promise.resolve()),
      removeReading: jest.fn(() => Promise.resolve()),
      updateReading: jest.fn(() => Promise.resolve()),
      readings: [],
      price: 40,
      type: 'event'
    };
    global.window.settings = {
      get: jest.fn((key) => {
        if (key === 'sources') return [
          { name: 'Referral', scope: 'event' },
          { name: 'Repeat', scope: 'all' },
          { name: 'Phone', scope: 'private' }
        ];
        if (key === 'paymentMethods') return ['Cash', 'CC'];
        return ['Cash', 'CC'];
      })
    };
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

  test('addReading should call session.addReading with timestamp and price', async () => {
    await manager.addReading();
    expect(global.window.session.addReading).toHaveBeenCalledWith(
      expect.objectContaining({ tip: 0, price: 40 })
    );
    const call = global.window.session.addReading.mock.calls[0][0];
    expect(call.timestamp).toBeTruthy();
  });

  test('addReading should not call session.addReading when no valid session', async () => {
    global.window.session.hasValidSession = false;
    await manager.addReading();
    expect(global.window.session.addReading).not.toHaveBeenCalled();
  });

  test('selectPaymentMethod should call session.updateReading', () => {
    global.window.session.updateReading = jest.fn(() => Promise.resolve());
    global.window.session.readings = [{ timestamp: new Date().toISOString(), tip: 0 }];
    manager.currentPaymentIndex = 0;
    manager.selectPaymentMethod('Cash');
    expect(global.window.session.updateReading).toHaveBeenCalledWith(0, 'payment', 'Cash');
  });

  test('selectSource should call session.updateReading', () => {
    global.window.session.updateReading = jest.fn(() => Promise.resolve());
    global.window.session.readings = [{ timestamp: new Date().toISOString(), tip: 0 }];
    manager.currentSourceIndex = 0;
    manager.selectSource('referral');
    expect(global.window.session.updateReading).toHaveBeenCalledWith(0, 'source', 'referral');
  });

  describe('Source picker filtering', () => {
    let mockSourceOptions;

    beforeEach(() => {
      mockSourceOptions = { innerHTML: '' };
      global.document.getElementById = jest.fn((id) => {
        if (id === 'sourceOptions') return mockSourceOptions;
        return { value: '', classList: { add: jest.fn(), remove: jest.fn() }, style: { display: '' }, textContent: '', innerHTML: '' };
      });
    });

    test('event session shows only event + all scoped sources', () => {
      global.window.session.type = 'event';
      global.window.settings.get = jest.fn((key) => {
        if (key === 'sources') return [
          { name: 'Referral', scope: 'event' },
          { name: 'Repeat', scope: 'all' },
          { name: 'Phone', scope: 'private' }
        ];
        return [];
      });

      manager.openSourceSheet(0);

      expect(mockSourceOptions.innerHTML).toContain('Referral');
      expect(mockSourceOptions.innerHTML).toContain('Repeat');
      expect(mockSourceOptions.innerHTML).not.toContain('Phone');
    });

    test('private session shows only private + all scoped sources', () => {
      global.window.session.type = 'private';
      global.window.settings.get = jest.fn((key) => {
        if (key === 'sources') return [
          { name: 'Referral', scope: 'event' },
          { name: 'Repeat', scope: 'all' },
          { name: 'Phone', scope: 'private' }
        ];
        return [];
      });

      manager.openSourceSheet(0);

      expect(mockSourceOptions.innerHTML).toContain('Phone');
      expect(mockSourceOptions.innerHTML).toContain('Repeat');
      expect(mockSourceOptions.innerHTML).not.toContain('Referral');
    });

    test('empty filtered result shows "no sources" message', () => {
      global.window.session.type = 'private';
      global.window.settings.get = jest.fn((key) => {
        if (key === 'sources') return [
          { name: 'EventOnly', scope: 'event' }
        ];
        return [];
      });

      manager.openSourceSheet(0);

      expect(mockSourceOptions.innerHTML).toContain('No sources configured');
      expect(mockSourceOptions.innerHTML).not.toContain('<button');
    });

    test('source order preserved from settings array', () => {
      global.window.session.type = 'event';
      global.window.settings.get = jest.fn((key) => {
        if (key === 'sources') return [
          { name: 'Zebra', scope: 'event' },
          { name: 'Alpha', scope: 'all' },
          { name: 'PrivateOnly', scope: 'private' },
          { name: 'Middle', scope: 'event' }
        ];
        return [];
      });

      manager.openSourceSheet(0);

      const zebraPos = mockSourceOptions.innerHTML.indexOf('Zebra');
      const alphaPos = mockSourceOptions.innerHTML.indexOf('Alpha');
      const middlePos = mockSourceOptions.innerHTML.indexOf('Middle');

      expect(zebraPos).toBeLessThan(alphaPos);
      expect(alphaPos).toBeLessThan(middlePos);
      expect(mockSourceOptions.innerHTML).not.toContain('PrivateOnly');
    });
  });
});
