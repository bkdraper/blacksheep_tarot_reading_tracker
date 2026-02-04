const fs = require('fs');
const path = require('path');

describe('Utils', () => {
  let Utils;

  beforeAll(() => {
    const code = fs.readFileSync(path.join(__dirname, '..', 'modules', 'utils.js'), 'utf8');
    Utils = eval(`(function() { ${code}; return Utils; })()`);
  });

  describe('normalizeDate', () => {
    test('should convert YYYY-MM-DD to MM/DD/YYYY', () => {
      expect(Utils.normalizeDate('2024-03-15')).toBe('3/15/2024');
    });

    test('should convert YY-MM-DD to MM/DD/YYYY', () => {
      expect(Utils.normalizeDate('24-03-15')).toBe('3/15/2024');
    });

    test('should return null for empty string', () => {
      expect(Utils.normalizeDate('')).toBeNull();
    });

    test('should return null for null', () => {
      expect(Utils.normalizeDate(null)).toBeNull();
    });

    test('should return input for non-matching format', () => {
      expect(Utils.normalizeDate('03/15/2024')).toBe('03/15/2024');
    });
  });

  describe('isDevelopmentMode', () => {
    test('should return boolean', () => {
      const result = Utils.isDevelopmentMode();
      expect(typeof result).toBe('boolean');
    });
  });

  describe('vibrate', () => {
    test('should be a function', () => {
      expect(typeof Utils.vibrate).toBe('function');
    });
  });

  describe('showSnackbar', () => {
    test('should be a function', () => {
      expect(typeof Utils.showSnackbar).toBe('function');
    });
  });

  describe('showToast', () => {
    test('should be a function', () => {
      expect(typeof Utils.showToast).toBe('function');
    });
  });

  describe('showSheet', () => {
    test('should be a function', () => {
      expect(typeof Utils.showSheet).toBe('function');
    });
  });

  describe('hideSheet', () => {
    test('should be a function', () => {
      expect(typeof Utils.hideSheet).toBe('function');
    });
  });
});
