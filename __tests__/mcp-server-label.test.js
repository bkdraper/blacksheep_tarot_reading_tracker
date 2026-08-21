/**
 * MCP Server Label Filter & Group_By Tests
 * 
 * Tests the label filter in readingFilterMap (list_readings_v2) and
 * label support in calculateStats (search_by and group_by).
 * 
 * Since mcp-server/server.js is ESM ("type": "module"), we can't directly
 * import it in Jest's CJS environment. Instead, we reconstruct the filter
 * logic in CJS and verify via mocked Supabase query chain calls, plus read
 * source patterns via fs.readFileSync.
 * 
 * Requirements: 3.2, 3.4, 3.5
 */

const fs = require('fs');
const path = require('path');

describe('MCP Server — Label Filter & Group_By', () => {

  // ─── Query chain mock ───────────────────────────────────────────────

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
    // Make it resolve when awaited
    Object.defineProperty(chain, 'then', {
      value: (resolve) => resolve({ data: returnData, error: null }),
      writable: true,
      configurable: true
    });
    return chain;
  }

  // ─── Reconstructed readingFilterMap from server.js ──────────────────

  const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

  const readingFilterMap = {
    location: (q, v) => q.ilike('location', `%${v}%`),
    payment: (q, v) => q.eq('payment', v),
    source: (q, v) => q.eq('source', v),
    start_date: (q, v) => q.gte('reading_date', v),
    end_date: (q, v) => q.lte('reading_date', v),
    min_tip: (q, v) => q.gte('tip', v),
    max_tip: (q, v) => q.lte('tip', v),
    time_of_day: (q, v) => q.eq('time_of_day', v),
    day_of_week: (q, v) => { const dow = dayMap[v.toLowerCase()]; return dow !== undefined ? q.eq('day_of_week_num', dow) : q; },
    session_duration_days: (q, v) => q.eq('session_duration_days', v),
    label: (q, v) => q.ilike('label', `%${v}%`),
  };

  // ─── Reconstructed listReadingsV2 query builder ─────────────────────

  function buildListReadingsV2Query(supabase, args) {
    const { user_name, user_id, limit = 100 } = args;

    // Build filters from search_by
    let filters = {};
    if (args.search_by) {
      if (typeof args.search_by === 'string') {
        try { filters = JSON.parse(args.search_by); } catch(e) { filters = {}; }
      } else {
        filters = args.search_by;
      }
    }

    let query = supabase
      .from('readings_with_context')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (user_id) {
      query = query.eq('user_id', user_id);
    } else if (user_name) {
      query = query.ilike('user_name', user_name);
    }

    // Apply all filters via the filterMap
    for (const [field, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') continue;
      const filterFn = readingFilterMap[field];
      if (filterFn) {
        query = filterFn(query, value);
      }
    }

    return query;
  }

  // ─── Reconstructed calculateStats handler ───────────────────────────

  let rpcCalls;

  function createMockRpcSupabase(rpcResult) {
    rpcCalls = [];
    return {
      rpc: jest.fn((fnName, params) => {
        rpcCalls.push({ fnName, params });
        return Promise.resolve(rpcResult);
      })
    };
  }

  async function calculateStats(args, supabase) {
    const { user_id, search_by, group_by } = args;

    let filters = {};
    if (search_by) {
      try {
        filters = typeof search_by === 'string' ? JSON.parse(search_by) : search_by;
      } catch (e) {
        filters = {};
      }
    }

    const { data, error } = await supabase.rpc('calculate_reading_stats', {
      p_user_id: user_id,
      p_filters: filters,
      p_group_by: group_by || null
    });

    if (error) {
      return { content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }] };
    }

    if (data?.error === 'no_data') {
      return { content: [{ type: 'text', text: JSON.stringify({ message: 'No readings found matching those filters.' }) }] };
    }

    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  beforeEach(() => {
    mockQuery = createMockQuery([]);
    mockSupabase = {
      from: jest.fn(() => mockQuery)
    };
  });

  // ─── 1. list_readings_v2 label filter via readingFilterMap ──────────

  describe('list_readings_v2 — label filter applies ILIKE', () => {

    test('label filter calls .ilike("label", "%value%")', () => {
      const ilikeCalls = [];
      mockQuery.ilike = jest.fn((...args) => {
        ilikeCalls.push(args);
        return mockQuery;
      });

      buildListReadingsV2Query(mockSupabase, {
        user_name: 'Amanda',
        search_by: '{"label":"Sarah"}'
      });

      const labelCall = ilikeCalls.find(call => call[0] === 'label');
      expect(labelCall).toBeDefined();
      expect(labelCall[1]).toBe('%Sarah%');
    });

    test('label filter is case-insensitive partial match via ILIKE', () => {
      const ilikeCalls = [];
      mockQuery.ilike = jest.fn((...args) => {
        ilikeCalls.push(args);
        return mockQuery;
      });

      buildListReadingsV2Query(mockSupabase, {
        user_id: 'user-123',
        search_by: '{"label":"john"}'
      });

      const labelCall = ilikeCalls.find(call => call[0] === 'label');
      expect(labelCall).toBeDefined();
      expect(labelCall[1]).toBe('%john%');
    });

    test('label filter works alongside other filters', () => {
      const ilikeCalls = [];
      const eqCalls = [];
      mockQuery.ilike = jest.fn((...args) => {
        ilikeCalls.push(args);
        return mockQuery;
      });
      mockQuery.eq = jest.fn((...args) => {
        eqCalls.push(args);
        return mockQuery;
      });

      buildListReadingsV2Query(mockSupabase, {
        user_id: 'user-123',
        search_by: '{"label":"Sarah","payment":"Cash","location":"Denver"}'
      });

      const labelCall = ilikeCalls.find(call => call[0] === 'label');
      expect(labelCall).toBeDefined();
      expect(labelCall[1]).toBe('%Sarah%');

      const locationCall = ilikeCalls.find(call => call[0] === 'location');
      expect(locationCall).toBeDefined();
      expect(locationCall[1]).toBe('%Denver%');

      const paymentCall = eqCalls.find(call => call[0] === 'payment');
      expect(paymentCall).toBeDefined();
      expect(paymentCall[1]).toBe('Cash');
    });

    test('empty label value is skipped (not applied)', () => {
      const ilikeCalls = [];
      mockQuery.ilike = jest.fn((...args) => {
        ilikeCalls.push(args);
        return mockQuery;
      });

      buildListReadingsV2Query(mockSupabase, {
        user_name: 'Amanda',
        search_by: '{"label":""}'
      });

      const labelCall = ilikeCalls.find(call => call[0] === 'label');
      expect(labelCall).toBeUndefined();
    });

    test('null label value is skipped (not applied)', () => {
      const ilikeCalls = [];
      mockQuery.ilike = jest.fn((...args) => {
        ilikeCalls.push(args);
        return mockQuery;
      });

      buildListReadingsV2Query(mockSupabase, {
        user_name: 'Amanda',
        search_by: '{"label":null}'
      });

      const labelCall = ilikeCalls.find(call => call[0] === 'label');
      expect(labelCall).toBeUndefined();
    });

    test('label filter with object search_by (not string)', () => {
      const ilikeCalls = [];
      mockQuery.ilike = jest.fn((...args) => {
        ilikeCalls.push(args);
        return mockQuery;
      });

      buildListReadingsV2Query(mockSupabase, {
        user_name: 'Amanda',
        search_by: { label: 'Mike' }
      });

      const labelCall = ilikeCalls.find(call => call[0] === 'label');
      expect(labelCall).toBeDefined();
      expect(labelCall[1]).toBe('%Mike%');
    });
  });

  // ─── 2. calculateStats with label in search_by ─────────────────────

  describe('calculate_stats — label in search_by', () => {

    test('label filter is passed as p_filters to RPC', async () => {
      const mockRpcSupabase = createMockRpcSupabase({
        data: { stats: { reading_count: 3, total_earnings: 120 } },
        error: null
      });

      await calculateStats({
        user_id: 'user-123',
        search_by: '{"label":"Sarah"}'
      }, mockRpcSupabase);

      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].params.p_filters).toEqual({ label: 'Sarah' });
    });

    test('label filter combined with other filters passes all to RPC', async () => {
      const mockRpcSupabase = createMockRpcSupabase({
        data: { stats: { reading_count: 2, total_earnings: 80 } },
        error: null
      });

      await calculateStats({
        user_id: 'user-123',
        search_by: '{"label":"John","location":"Denver","start_date":"2026-01-01"}'
      }, mockRpcSupabase);

      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].params.p_filters).toEqual({
        label: 'John',
        location: 'Denver',
        start_date: '2026-01-01'
      });
    });

    test('label filter with object search_by is used directly', async () => {
      const mockRpcSupabase = createMockRpcSupabase({
        data: { stats: { reading_count: 5 } },
        error: null
      });

      await calculateStats({
        user_id: 'user-123',
        search_by: { label: 'amanda' }
      }, mockRpcSupabase);

      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].params.p_filters).toEqual({ label: 'amanda' });
    });

    test('label filter returns successful stats response', async () => {
      const statsData = {
        stats: { reading_count: 4, total_earnings: 200, avg_tip: 12.5 }
      };
      const mockRpcSupabase = createMockRpcSupabase({ data: statsData, error: null });

      const result = await calculateStats({
        user_id: 'user-123',
        search_by: '{"label":"Sarah"}'
      }, mockRpcSupabase);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(statsData);
    });

    test('label filter with no matching data returns no_data message', async () => {
      const mockRpcSupabase = createMockRpcSupabase({
        data: { error: 'no_data' },
        error: null
      });

      const result = await calculateStats({
        user_id: 'user-123',
        search_by: '{"label":"NonexistentClient"}'
      }, mockRpcSupabase);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual({ message: 'No readings found matching those filters.' });
    });
  });

  // ─── 3. calculateStats with group_by: 'label' ──────────────────────

  describe('calculate_stats — group_by: label', () => {

    test('group_by "label" is passed as p_group_by to RPC', async () => {
      const mockRpcSupabase = createMockRpcSupabase({
        data: { grouped: [{ label: 'Sarah', count: 3 }, { label: 'John', count: 2 }] },
        error: null
      });

      await calculateStats({
        user_id: 'user-123',
        group_by: 'label'
      }, mockRpcSupabase);

      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].params.p_group_by).toBe('label');
    });

    test('group_by "label" combined with label filter passes both', async () => {
      const mockRpcSupabase = createMockRpcSupabase({
        data: { grouped: [{ label: 'Sarah M', count: 2 }] },
        error: null
      });

      await calculateStats({
        user_id: 'user-123',
        search_by: '{"label":"Sarah"}',
        group_by: 'label'
      }, mockRpcSupabase);

      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].params.p_filters).toEqual({ label: 'Sarah' });
      expect(rpcCalls[0].params.p_group_by).toBe('label');
    });

    test('group_by "label" returns per-client breakdown', async () => {
      const groupedData = {
        stats: { reading_count: 10, total_earnings: 500 },
        grouped: [
          { label: 'Sarah', reading_count: 5, total_earnings: 250 },
          { label: 'John', reading_count: 3, total_earnings: 150 },
          { label: 'Mike', reading_count: 2, total_earnings: 100 }
        ]
      };
      const mockRpcSupabase = createMockRpcSupabase({ data: groupedData, error: null });

      const result = await calculateStats({
        user_id: 'user-123',
        group_by: 'label'
      }, mockRpcSupabase);

      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(groupedData);
      expect(parsed.grouped).toHaveLength(3);
    });

    test('group_by "label" with date range filter', async () => {
      const mockRpcSupabase = createMockRpcSupabase({
        data: { grouped: [] },
        error: null
      });

      await calculateStats({
        user_id: 'user-123',
        search_by: '{"start_date":"2026-01-01","end_date":"2026-06-30"}',
        group_by: 'label'
      }, mockRpcSupabase);

      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].params).toEqual({
        p_user_id: 'user-123',
        p_filters: { start_date: '2026-01-01', end_date: '2026-06-30' },
        p_group_by: 'label'
      });
    });
  });

  // ─── 4. Source pattern verification ─────────────────────────────────

  describe('server.js source patterns — label support', () => {
    let serverSource;

    beforeAll(() => {
      const serverPath = path.join(__dirname, '..', 'mcp-server', 'server.js');
      serverSource = fs.readFileSync(serverPath, 'utf-8');
    });

    test('readingFilterMap has label entry using ilike', () => {
      expect(serverSource).toMatch(/label:\s*\(q,\s*v\)\s*=>\s*q\.ilike\('label'/);
    });

    test('label filter wraps value in % wildcards', () => {
      expect(serverSource).toMatch(/ilike\('label',\s*`%\$\{v\}%`\)/);
    });

    test('list_readings_v2 search_by description includes label', () => {
      // The tool inputSchema description should mention label
      expect(serverSource).toMatch(/Available fields:.*label/);
    });

    test('calculate_stats search_by description includes label', () => {
      expect(serverSource).toMatch(/JSON with filters:.*label/);
    });

    test('calculate_stats group_by description includes label', () => {
      expect(serverSource).toMatch(/Group results by:.*label/);
    });

    test('readingFilterMap label entry matches expected pattern exactly', () => {
      // Verify the exact pattern: label: (q, v) => q.ilike('label', `%${v}%`)
      const labelFilterRegex = /label:\s*\(q,\s*v\)\s*=>\s*q\.ilike\(\s*'label',\s*`%\$\{v\}%`\s*\)/;
      expect(serverSource).toMatch(labelFilterRegex);
    });
  });
});
