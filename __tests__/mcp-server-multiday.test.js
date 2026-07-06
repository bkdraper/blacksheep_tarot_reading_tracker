/**
 * MCP Server Multi-Day Session Tests
 * 
 * Tests overlap filter logic (sessionFilterMap), day_of_week handling,
 * getUserSummaryV2 RPC params, and search_by JSON parsing.
 * 
 * Since mcp-server/server.js is ESM ("type": "module"), we can't directly
 * import it in Jest's CJS environment. Instead, we reconstruct the filter
 * logic in CJS and verify Supabase query chain calls, plus read source
 * patterns via fs.readFileSync.
 */

const fs = require('fs');
const path = require('path');

describe('MCP Server — Multi-Day Session Support', () => {

  // ─── Query chain mock ───────────────────────────────────────────────

  let mockQuery;

  function createMockQuery(returnData = []) {
    const chain = {};
    chain.select = jest.fn(() => chain);
    chain.order = jest.fn(() => chain);
    chain.limit = jest.fn(() => chain);
    chain.eq = jest.fn(() => chain);
    chain.ilike = jest.fn(() => chain);
    chain.gte = jest.fn(() => chain);
    chain.lte = jest.fn(() => chain);
    chain.in = jest.fn(() => chain);
    // Make it resolve when awaited
    Object.defineProperty(chain, 'then', {
      value: (resolve) => resolve({ data: returnData, error: null }),
      writable: true,
      configurable: true
    });
    return chain;
  }

  // ─── Reconstructed sessionFilterMap from server.js ──────────────────

  const sessionFilterMap = {
    location: (q, v) => q.ilike('location', `%${v}%`),
    format: (q, v) => q.ilike('format', `%${v.trim()}%`),
    start_date: (q, v) => q.gte('end_date', v),       // overlap: session ends on or after filter start
    end_date: (q, v) => q.lte('start_date', v),        // overlap: session starts on or before filter end
    session_duration_days: (q, v) => q.eq('session_duration_days', v),
  };

  beforeEach(() => {
    mockQuery = createMockQuery([]);
  });

  // ─── 1. Session Overlap Filter Logic ────────────────────────────────

  describe('sessionFilterMap overlap logic', () => {

    test('multi-day session found by mid-range query: start_date calls .gte("end_date", value)', () => {
      const gteCalls = [];
      mockQuery.gte = jest.fn((...args) => {
        gteCalls.push(args);
        return mockQuery;
      });

      // A session spanning Jun 20–22: start_date='2025-06-20', end_date='2025-06-22'
      // Filter with start_date='2025-06-21' should call .gte('end_date', '2025-06-21')
      // The session's end_date (22) >= filter start (21), so it matches
      sessionFilterMap.start_date(mockQuery, '2025-06-21');

      expect(gteCalls).toHaveLength(1);
      expect(gteCalls[0]).toEqual(['end_date', '2025-06-21']);
    });

    test('multi-day session found by end_date filter: end_date calls .lte("start_date", value)', () => {
      const lteCalls = [];
      mockQuery.lte = jest.fn((...args) => {
        lteCalls.push(args);
        return mockQuery;
      });

      // Filter with end_date='2025-06-21' should call .lte('start_date', '2025-06-21')
      // A session starting Jun 20: start_date (20) <= filter end (21), so it matches
      sessionFilterMap.end_date(mockQuery, '2025-06-21');

      expect(lteCalls).toHaveLength(1);
      expect(lteCalls[0]).toEqual(['start_date', '2025-06-21']);
    });

    test('both start and end filters combine for overlap window', () => {
      const gteCalls = [];
      const lteCalls = [];
      mockQuery.gte = jest.fn((...args) => {
        gteCalls.push(args);
        return mockQuery;
      });
      mockQuery.lte = jest.fn((...args) => {
        lteCalls.push(args);
        return mockQuery;
      });

      // Filtering start_date='2025-06-20' AND end_date='2025-06-25'
      // Should apply BOTH .gte('end_date', '2025-06-20') AND .lte('start_date', '2025-06-25')
      sessionFilterMap.start_date(mockQuery, '2025-06-20');
      sessionFilterMap.end_date(mockQuery, '2025-06-25');

      expect(gteCalls).toHaveLength(1);
      expect(gteCalls[0]).toEqual(['end_date', '2025-06-20']);
      expect(lteCalls).toHaveLength(1);
      expect(lteCalls[0]).toEqual(['start_date', '2025-06-25']);
    });

    test('single-day session behaves same as before: start_date still uses .gte("end_date", value)', () => {
      const gteCalls = [];
      mockQuery.gte = jest.fn((...args) => {
        gteCalls.push(args);
        return mockQuery;
      });

      // A single-day session: start_date='2025-06-20', end_date='2025-06-20'
      // Filter with start_date='2025-06-20' calls .gte('end_date', '2025-06-20')
      // end_date (20) >= filter (20) → matches
      sessionFilterMap.start_date(mockQuery, '2025-06-20');

      expect(gteCalls).toHaveLength(1);
      expect(gteCalls[0]).toEqual(['end_date', '2025-06-20']);
    });

    test('session_duration_days filter calls .eq("session_duration_days", value)', () => {
      const eqCalls = [];
      mockQuery.eq = jest.fn((...args) => {
        eqCalls.push(args);
        return mockQuery;
      });

      sessionFilterMap.session_duration_days(mockQuery, 3);

      expect(eqCalls).toHaveLength(1);
      expect(eqCalls[0]).toEqual(['session_duration_days', 3]);
    });
  });

  // ─── 2. day_of_week filter uses readings_with_context ───────────────

  describe('day_of_week filter targets readings_with_context', () => {
    let serverSource;

    beforeAll(() => {
      const serverPath = path.join(__dirname, '..', 'mcp-server', 'server.js');
      serverSource = fs.readFileSync(serverPath, 'utf-8');
    });

    test('day_of_week subquery queries readings_with_context view', () => {
      // In listSessionsV2, day_of_week is handled by querying readings_with_context
      expect(serverSource).toMatch(/from\(['"`]readings_with_context['"`]\)/);
      // And it applies .eq('day_of_week_num', dow)
      expect(serverSource).toMatch(/\.eq\(['"`]day_of_week_num['"`],\s*dow\)/);
    });

    test('day_of_week filter is excluded from sessionFilterMap iteration', () => {
      // The server skips day_of_week in the filter loop: "if (field === 'day_of_week') continue;"
      expect(serverSource).toMatch(/field\s*===\s*['"`]day_of_week['"`]\)\s*continue/);
    });
  });

  // ─── 3. getUserSummaryV2 overlap filtering ──────────────────────────

  describe('getUserSummaryV2 passes date params to RPC', () => {
    let serverSource;

    beforeAll(() => {
      const serverPath = path.join(__dirname, '..', 'mcp-server', 'server.js');
      serverSource = fs.readFileSync(serverPath, 'utf-8');
    });

    test('getUserSummaryV2 calls rpc with p_start_date and p_end_date', () => {
      // Verify it passes date params to get_user_summary RPC
      expect(serverSource).toMatch(/rpc\(['"`]get_user_summary['"`]/);
      expect(serverSource).toMatch(/p_start_date:\s*start_date\s*\|\|\s*null/);
      expect(serverSource).toMatch(/p_end_date:\s*end_date\s*\|\|\s*null/);
    });

    test('getUserSummaryV2 passes user params to RPC', () => {
      expect(serverSource).toMatch(/p_user_name:/);
      expect(serverSource).toMatch(/p_user_id:\s*user_id\s*\|\|\s*null/);
    });
  });

  // ─── 4. search_by JSON parsing ─────────────────────────────────────

  describe('search_by JSON parsing and backward compatibility', () => {

    // Reconstruct the filter-application loop from server.js
    function applySessionFilters(query, filters) {
      for (const [field, value] of Object.entries(filters)) {
        if (field === 'day_of_week') continue;
        if (value === undefined || value === null || value === '') continue;
        const filterFn = sessionFilterMap[field];
        if (filterFn) {
          query = filterFn(query, value);
        }
        // Unknown fields are silently ignored (no error thrown)
      }
      return query;
    }

    // Reconstruct search_by parsing from server.js
    function parseSearchBy(args) {
      let filters = {};
      if (args.search_by) {
        if (typeof args.search_by === 'string') {
          try { filters = JSON.parse(args.search_by); }
          catch(e) { filters = {}; }
        } else {
          filters = args.search_by;
        }
      } else {
        if (args.location) filters.location = args.location;
        if (args.format) filters.format = args.format;
        if (args.start_date) filters.start_date = args.start_date;
        if (args.end_date) filters.end_date = args.end_date;
        if (args.session_duration_days !== undefined) filters.session_duration_days = args.session_duration_days;
      }
      return filters;
    }

    test('search_by JSON string is parsed and filters applied', () => {
      const gteCalls = [];
      const ilikeCalls = [];
      mockQuery.gte = jest.fn((...args) => { gteCalls.push(args); return mockQuery; });
      mockQuery.ilike = jest.fn((...args) => { ilikeCalls.push(args); return mockQuery; });

      const args = {
        user_name: 'Amanda',
        search_by: '{"location":"Denver","start_date":"2025-06-01"}'
      };

      const filters = parseSearchBy(args);
      applySessionFilters(mockQuery, filters);

      expect(ilikeCalls).toContainEqual(['location', '%Denver%']);
      expect(gteCalls).toContainEqual(['end_date', '2025-06-01']);
    });

    test('unknown fields in search_by are silently ignored', () => {
      const args = {
        user_name: 'Amanda',
        search_by: '{"location":"Denver","bogus_field":"whatever","another_unknown":123}'
      };

      const filters = parseSearchBy(args);

      // Should not throw
      expect(() => applySessionFilters(mockQuery, filters)).not.toThrow();

      // Only location filter should have been applied
      const ilikeCalls = [];
      mockQuery.ilike = jest.fn((...args) => { ilikeCalls.push(args); return mockQuery; });
      applySessionFilters(mockQuery, filters);
      expect(ilikeCalls).toContainEqual(['location', '%Denver%']);
    });

    test('backward compatibility: individual params work when search_by not provided', () => {
      const gteCalls = [];
      const lteCalls = [];
      const ilikeCalls = [];
      mockQuery.gte = jest.fn((...args) => { gteCalls.push(args); return mockQuery; });
      mockQuery.lte = jest.fn((...args) => { lteCalls.push(args); return mockQuery; });
      mockQuery.ilike = jest.fn((...args) => { ilikeCalls.push(args); return mockQuery; });

      const args = {
        user_name: 'Amanda',
        location: 'Denver',
        start_date: '2025-06-01',
        end_date: '2025-06-30'
      };

      const filters = parseSearchBy(args);
      applySessionFilters(mockQuery, filters);

      expect(ilikeCalls).toContainEqual(['location', '%Denver%']);
      expect(gteCalls).toContainEqual(['end_date', '2025-06-01']);
      expect(lteCalls).toContainEqual(['start_date', '2025-06-30']);
    });

    test('malformed search_by JSON falls back to empty filters', () => {
      const args = {
        user_name: 'Amanda',
        search_by: 'not valid json {'
      };

      const filters = parseSearchBy(args);
      expect(filters).toEqual({});
    });

    test('search_by as object (not string) is used directly', () => {
      const args = {
        user_name: 'Amanda',
        search_by: { format: 'Expo', session_duration_days: 3 }
      };

      const filters = parseSearchBy(args);
      expect(filters).toEqual({ format: 'Expo', session_duration_days: 3 });
    });
  });

  // ─── 5. Verify server.js source patterns ───────────────────────────

  describe('server.js source pattern verification', () => {
    let serverSource;

    beforeAll(() => {
      const serverPath = path.join(__dirname, '..', 'mcp-server', 'server.js');
      serverSource = fs.readFileSync(serverPath, 'utf-8');
    });

    test('sessionFilterMap.start_date calls .gte("end_date", v) for overlap logic', () => {
      // The filter map line: start_date: (q, v) => q.gte('end_date', v),
      expect(serverSource).toMatch(/start_date:\s*\(q,\s*v\)\s*=>\s*q\.gte\(['"`]end_date['"`],\s*v\)/);
    });

    test('sessionFilterMap.end_date calls .lte("start_date", v) for overlap logic', () => {
      // The filter map line: end_date: (q, v) => q.lte('start_date', v),
      expect(serverSource).toMatch(/end_date:\s*\(q,\s*v\)\s*=>\s*q\.lte\(['"`]start_date['"`],\s*v\)/);
    });

    test('listSessionsV2 orders by start_date not session_date', () => {
      // Should find: .order('start_date', { ascending: false })
      expect(serverSource).toMatch(/\.order\(['"`]start_date['"`],\s*\{\s*ascending:\s*false\s*\}\)/);
    });

    test('day_of_week filter queries readings_with_context view', () => {
      // from('readings_with_context') should appear in the day_of_week handling block
      expect(serverSource).toMatch(/from\(['"`]readings_with_context['"`]\)/);
    });

    test('getUserSummaryV2 passes date params to get_user_summary RPC', () => {
      expect(serverSource).toMatch(/rpc\(['"`]get_user_summary['"`]/);
      expect(serverSource).toMatch(/p_start_date/);
      expect(serverSource).toMatch(/p_end_date/);
    });

    test('sessionFilterMap includes session_duration_days', () => {
      expect(serverSource).toMatch(/session_duration_days:\s*\(q,\s*v\)\s*=>\s*q\.eq\(['"`]session_duration_days['"`],\s*v\)/);
    });

    test('readingFilterMap includes day_of_week with day_of_week_num', () => {
      // readingFilterMap's day_of_week entry should call .eq('day_of_week_num', dow)
      expect(serverSource).toMatch(/day_of_week:\s*\(q,\s*v\)\s*=>/);
      expect(serverSource).toMatch(/q\.eq\(['"`]day_of_week_num['"`],\s*dow\)/);
    });
  });
});
