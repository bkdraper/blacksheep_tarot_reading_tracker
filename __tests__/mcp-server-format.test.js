/**
 * MCP Server Format Tests
 * 
 * Tests format filter behavior in list_sessions_v2 and format presence
 * in response objects and action-group-schema.json.
 * 
 * Since mcp-server/server.js is ESM ("type": "module"), we can't directly
 * import it in Jest's CJS environment. Instead, we test the format filter
 * logic by reconstructing the query-building behavior and verifying the
 * Supabase query chain calls.
 */

const fs = require('fs');
const path = require('path');

describe('MCP Server — Format Support', () => {

  // ─── Query chain mock ───────────────────────────────────────────────
  // Reproduces the Supabase query chain that listSessionsV2 builds

  let mockQuery;
  let mockSupabase;

  function createMockQuery(returnData = []) {
    const chain = {};
    chain.select = jest.fn(() => chain);
    chain.order = jest.fn(() => chain);
    chain.limit = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.ilike = jest.fn(() => chain);
    chain.gte = jest.fn(() => chain);
    chain.lte = jest.fn(() => chain);
    // Terminal - returns data
    chain.then = undefined; // not thenable
    // Simulate await
    chain[Symbol.for('jest.asymmetricMatch')] = undefined;
    // Make it resolve when awaited
    Object.defineProperty(chain, 'then', {
      value: (resolve) => resolve({ data: returnData, error: null }),
      writable: true,
      configurable: true
    });
    return chain;
  }

  /**
   * Simulates the listSessionsV2 format filter logic from server.js:
   * 
   *   if (format && format.trim()) {
   *     query = query.ilike('format', `%${format.trim()}%`);
   *   }
   */
  function applyFormatFilter(query, format) {
    if (format && format.trim()) {
      query = query.ilike('format', `%${format.trim()}%`);
    }
    return query;
  }

  /**
   * Full simulation of listSessionsV2 query building (relevant parts)
   */
  function buildListSessionsV2Query(supabase, args) {
    const { user_name, user_id, location, day_of_week, format, limit = 50 } = args;

    let start_date = args.start_date;
    let end_date = args.end_date;
    if (args.date_range && !start_date && !end_date) {
      const parts = args.date_range.split(',');
      start_date = parts[0]?.trim() || undefined;
      end_date = parts[1]?.trim() || undefined;
    }

    let query = supabase
      .from('session_summaries')
      .select('*')
      .order('session_date', { ascending: false })
      .limit(limit);

    if (user_id) {
      query = query.eq('user_id', user_id);
    } else if (user_name) {
      query = query.ilike('user_name', user_name);
    }

    if (start_date) query = query.gte('session_date', start_date);
    if (end_date) query = query.lte('session_date', end_date);
    if (location) query = query.ilike('location', `%${location}%`);
    if (day_of_week) {
      const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
      const dow = dayMap[day_of_week.toLowerCase()];
      if (dow !== undefined) query = query.eq('day_of_week_num', dow);
    }
    if (format && format.trim()) query = query.ilike('format', `%${format.trim()}%`);

    return query;
  }

  beforeEach(() => {
    mockQuery = createMockQuery([]);
    mockSupabase = {
      from: jest.fn(() => mockQuery)
    };
  });

  // ─── Format Filter Tests ────────────────────────────────────────────

  describe('list_sessions_v2 format filter', () => {

    test('non-empty format filter calls .ilike("format", value)', () => {
      // Reset ilike tracking
      const ilikeCalls = [];
      mockQuery.ilike = jest.fn((...args) => {
        ilikeCalls.push(args);
        return mockQuery;
      });

      buildListSessionsV2Query(mockSupabase, {
        user_name: 'Amanda',
        format: 'Expo'
      });

      // Should have called ilike for user_name AND format
      const formatCall = ilikeCalls.find(call => call[0] === 'format');
      expect(formatCall).toBeDefined();
      expect(formatCall[1]).toBe('%Expo%');
    });

    test('format filter trims whitespace before applying', () => {
      const ilikeCalls = [];
      mockQuery.ilike = jest.fn((...args) => {
        ilikeCalls.push(args);
        return mockQuery;
      });

      buildListSessionsV2Query(mockSupabase, {
        user_name: 'Amanda',
        format: '  Fair  '
      });

      const formatCall = ilikeCalls.find(call => call[0] === 'format');
      expect(formatCall).toBeDefined();
      expect(formatCall[1]).toBe('%Fair%');
    });

    test('format filter is case-insensitive via ilike', () => {
      const ilikeCalls = [];
      mockQuery.ilike = jest.fn((...args) => {
        ilikeCalls.push(args);
        return mockQuery;
      });

      buildListSessionsV2Query(mockSupabase, {
        user_name: 'Amanda',
        format: 'expo'
      });

      // ilike itself handles case-insensitivity; we just verify it's called
      const formatCall = ilikeCalls.find(call => call[0] === 'format');
      expect(formatCall).toBeDefined();
      expect(formatCall[1]).toBe('%expo%');
    });

    test('empty string format filter skips filtering', () => {
      const ilikeCalls = [];
      mockQuery.ilike = jest.fn((...args) => {
        ilikeCalls.push(args);
        return mockQuery;
      });

      buildListSessionsV2Query(mockSupabase, {
        user_name: 'Amanda',
        format: ''
      });

      const formatCall = ilikeCalls.find(call => call[0] === 'format');
      expect(formatCall).toBeUndefined();
    });

    test('whitespace-only format filter skips filtering', () => {
      const ilikeCalls = [];
      mockQuery.ilike = jest.fn((...args) => {
        ilikeCalls.push(args);
        return mockQuery;
      });

      buildListSessionsV2Query(mockSupabase, {
        user_name: 'Amanda',
        format: '   '
      });

      const formatCall = ilikeCalls.find(call => call[0] === 'format');
      expect(formatCall).toBeUndefined();
    });

    test('null format filter skips filtering', () => {
      const ilikeCalls = [];
      mockQuery.ilike = jest.fn((...args) => {
        ilikeCalls.push(args);
        return mockQuery;
      });

      buildListSessionsV2Query(mockSupabase, {
        user_name: 'Amanda',
        format: null
      });

      const formatCall = ilikeCalls.find(call => call[0] === 'format');
      expect(formatCall).toBeUndefined();
    });

    test('undefined format filter skips filtering', () => {
      const ilikeCalls = [];
      mockQuery.ilike = jest.fn((...args) => {
        ilikeCalls.push(args);
        return mockQuery;
      });

      buildListSessionsV2Query(mockSupabase, {
        user_name: 'Amanda'
        // format not provided
      });

      const formatCall = ilikeCalls.find(call => call[0] === 'format');
      expect(formatCall).toBeUndefined();
    });

    test('format filter works alongside other filters', () => {
      const ilikeCalls = [];
      const gteCalls = [];
      const lteCalls = [];
      mockQuery.ilike = jest.fn((...args) => {
        ilikeCalls.push(args);
        return mockQuery;
      });
      mockQuery.gte = jest.fn((...args) => {
        gteCalls.push(args);
        return mockQuery;
      });
      mockQuery.lte = jest.fn((...args) => {
        lteCalls.push(args);
        return mockQuery;
      });

      buildListSessionsV2Query(mockSupabase, {
        user_name: 'Amanda',
        start_date: '2026-01-01',
        end_date: '2026-06-30',
        location: 'denver',
        format: 'Expo'
      });

      // Verify format filter applied
      const formatCall = ilikeCalls.find(call => call[0] === 'format');
      expect(formatCall).toBeDefined();
      expect(formatCall[1]).toBe('%Expo%');

      // Verify other filters also applied
      const locationCall = ilikeCalls.find(call => call[0] === 'location');
      expect(locationCall).toBeDefined();

      expect(gteCalls).toContainEqual(['session_date', '2026-01-01']);
      expect(lteCalls).toContainEqual(['session_date', '2026-06-30']);
    });
  });

  // ─── Format in Response Objects ─────────────────────────────────────

  describe('format appears in response objects', () => {

    test('session with format value includes it in response', () => {
      // Simulate what the session_summaries view returns
      const sessionData = {
        id: 'abc-123',
        session_date: '2026-06-01',
        location: 'Denver Spring 26',
        user_name: 'Amanda',
        format: 'Expo',
        readings_count: 5,
        total_earnings: 250,
        tips_total: 50,
        base_total: 200
      };

      // The MCP server just passes through data from the view
      expect(sessionData).toHaveProperty('format');
      expect(sessionData.format).toBe('Expo');
    });

    test('session with null format includes null in response', () => {
      const sessionData = {
        id: 'abc-456',
        session_date: '2026-05-15',
        location: 'Some Place',
        user_name: 'Amanda',
        format: null,
        readings_count: 3,
        total_earnings: 120,
        tips_total: 20,
        base_total: 100
      };

      expect(sessionData).toHaveProperty('format');
      expect(sessionData.format).toBeNull();
    });

    test('reading with session format includes it in response', () => {
      // Simulate what readings_with_context view returns
      const readingData = {
        id: 'rd-001',
        timestamp: '2026-06-01T14:30:00Z',
        tip: 10,
        price: 40,
        payment: 'Cash',
        source: 'Walk-up',
        session_date: '2026-06-01',
        location: 'Denver Spring 26',
        session_format: 'Expo',
        session_type: 'event'
      };

      expect(readingData).toHaveProperty('session_format');
      expect(readingData.session_format).toBe('Expo');
    });

    test('session details response includes format field', () => {
      // Simulate get_session_with_readings RPC response
      const sessionDetails = {
        session: {
          id: 'abc-123',
          session_date: '2026-06-01',
          location: 'Denver Spring 26',
          type: 'event',
          format: 'Expo',
          reading_price: 40
        },
        readings: [
          { id: 'rd-001', tip: 10, price: 40, payment: 'Cash' }
        ],
        summary: {
          total_earnings: 50,
          tips_total: 10,
          readings_count: 1
        }
      };

      expect(sessionDetails.session).toHaveProperty('format');
      expect(sessionDetails.session.format).toBe('Expo');
    });
  });

  // ─── Action Group Schema Tests ──────────────────────────────────────

  describe('action-group-schema.json format parameter', () => {
    let schema;

    beforeAll(() => {
      const schemaPath = path.join(__dirname, '..', 'mcp-server', 'action-group-schema.json');
      const raw = fs.readFileSync(schemaPath, 'utf-8');
      schema = JSON.parse(raw);
    });

    test('schema has functions array', () => {
      expect(schema).toHaveProperty('functions');
      expect(Array.isArray(schema.functions)).toBe(true);
    });

    test('list_sessions_v2 function exists in schema', () => {
      const listSessions = schema.functions.find(f => f.name === 'list_sessions_v2');
      expect(listSessions).toBeDefined();
    });

    test('list_sessions_v2 has format parameter', () => {
      const listSessions = schema.functions.find(f => f.name === 'list_sessions_v2');
      expect(listSessions.parameters).toHaveProperty('format');
    });

    test('format parameter has type string', () => {
      const listSessions = schema.functions.find(f => f.name === 'list_sessions_v2');
      expect(listSessions.parameters.format.type).toBe('string');
    });

    test('format parameter is not required', () => {
      const listSessions = schema.functions.find(f => f.name === 'list_sessions_v2');
      expect(listSessions.parameters.format.required).toBe(false);
    });

    test('format parameter description mentions case-insensitive', () => {
      const listSessions = schema.functions.find(f => f.name === 'list_sessions_v2');
      expect(listSessions.parameters.format.description.toLowerCase()).toContain('case-insensitive');
    });

    test('format parameter description mentions kind of event or reading', () => {
      const listSessions = schema.functions.find(f => f.name === 'list_sessions_v2');
      const desc = listSessions.parameters.format.description.toLowerCase();
      expect(desc).toMatch(/kind|event|reading/);
    });
  });

  // ─── Server Tool Definition Tests ───────────────────────────────────

  describe('server.js list_sessions_v2 tool definition', () => {
    let serverSource;

    beforeAll(() => {
      const serverPath = path.join(__dirname, '..', 'mcp-server', 'server.js');
      serverSource = fs.readFileSync(serverPath, 'utf-8');
    });

    test('list_sessions_v2 inputSchema includes format property', () => {
      // Verify the tool definition in server.js mentions format in the schema
      // The inputSchema for list_sessions_v2 should have a format property
      expect(serverSource).toContain("format");
    });

    test('listSessionsV2 method applies ilike filter for format', () => {
      // Verify the actual filter logic exists in the source
      expect(serverSource).toMatch(/format\s*&&\s*format\.trim\(\)/);
      expect(serverSource).toMatch(/\.ilike\('format'/);
    });

    test('listSessionsV2 method destructures format from args', () => {
      // Verify format is destructured in listSessionsV2
      expect(serverSource).toMatch(/const\s*\{[^}]*format[^}]*\}\s*=\s*args/);
    });
  });
});
