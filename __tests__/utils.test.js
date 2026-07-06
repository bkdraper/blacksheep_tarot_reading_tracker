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

  describe('formatSessionDate', () => {
    test('single day (startDate equals endDate) returns MM/DD format', () => {
      expect(Utils.formatSessionDate('2025-06-20', '2025-06-20')).toBe('06/20');
    });

    test('no end date (null) returns MM/DD format', () => {
      expect(Utils.formatSessionDate('2025-06-20', null)).toBe('06/20');
    });

    test('no end date (undefined) returns MM/DD format', () => {
      expect(Utils.formatSessionDate('2025-06-20', undefined)).toBe('06/20');
    });

    test('no end date (empty string) returns MM/DD format', () => {
      expect(Utils.formatSessionDate('2025-06-20', '')).toBe('06/20');
    });

    test('same month multi-day returns "Mon DD\u2013DD" format', () => {
      expect(Utils.formatSessionDate('2025-06-20', '2025-06-22')).toBe('Jun 20\u201322');
    });

    test('different months returns "Mon DD\u2013Mon DD" format', () => {
      expect(Utils.formatSessionDate('2025-06-30', '2025-07-02')).toBe('Jun 30\u2013Jul 2');
    });

    test('cross-year returns "Mon DD, YYYY\u2013Mon DD, YYYY" format', () => {
      expect(Utils.formatSessionDate('2025-12-31', '2026-01-01')).toBe('Dec 31, 2025\u2013Jan 1, 2026');
    });

    test('empty startDate returns empty string', () => {
      expect(Utils.formatSessionDate('', '2025-06-20')).toBe('');
    });

    test('null startDate returns empty string', () => {
      expect(Utils.formatSessionDate(null, '2025-06-20')).toBe('');
    });
  });
});
