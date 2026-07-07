/**
 * MCP Server calculateStats Tests
 * 
 * Tests the calculateStats handler logic: search_by parsing, RPC call,
 * error handling, no_data response, and group_by passthrough.
 * 
 * Since mcp-server/server.js is ESM ("type": "module"), we can't directly
 * import it in Jest's CJS environment. Instead, we reconstruct the handler
 * logic in CJS and verify via mocked Supabase RPC calls, plus read source
 * patterns via fs.readFileSync.
 */

const fs = require('fs');
const path = require('path');

describe('MCP Server — calculateStats', () => {

  // ─── RPC mock ───────────────────────────────────────────────────────

  let mockRpcResult;
  let rpcCalls;
  let mockSupabase;

  function createMockSupabase() {
    rpcCalls = [];
    return {
      rpc: jest.fn((fnName, params) => {
        rpcCalls.push({ fnName, params });
        return Promise.resolve(mockRpcResult);
      })
    };
  }

  // ─── Reconstructed calculateStats handler ───────────────────────────

  async function calculateStats(args, supabase) {
    const { user_id, search_by, group_by } = args;

    // Parse search_by: string → JSON.parse, object → use directly, invalid → empty
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
    mockRpcResult = { data: null, error: null };
    mockSupabase = createMockSupabase();
  });

  // ─── 1. Valid search_by parsing ─────────────────────────────────────

  describe('search_by parsing', () => {

    test('valid JSON string is parsed and passed as p_filters', async () => {
      mockRpcResult = { data: { stats: { reading_count: 5 } }, error: null };

      await calculateStats({
        user_id: 'user-123',
        search_by: '{"location":"Denver","payment":"Cash"}'
      }, mockSupabase);

      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].params.p_filters).toEqual({ location: 'Denver', payment: 'Cash' });
    });

    test('object search_by is used directly (not re-parsed)', async () => {
      mockRpcResult = { data: { stats: { reading_count: 3 } }, error: null };

      await calculateStats({
        user_id: 'user-123',
        search_by: { format: 'Expo', start_date: '2025-06-01' }
      }, mockSupabase);

      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].params.p_filters).toEqual({ format: 'Expo', start_date: '2025-06-01' });
    });

    test('invalid JSON string falls back to empty filters', async () => {
      mockRpcResult = { data: { stats: { reading_count: 0 } }, error: null };

      await calculateStats({
        user_id: 'user-123',
        search_by: 'not valid json {'
      }, mockSupabase);

      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].params.p_filters).toEqual({});
    });

    test('undefined search_by results in empty filters', async () => {
      mockRpcResult = { data: { stats: { reading_count: 10 } }, error: null };

      await calculateStats({
        user_id: 'user-123'
      }, mockSupabase);

      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].params.p_filters).toEqual({});
    });

    test('null search_by results in empty filters', async () => {
      mockRpcResult = { data: { stats: { reading_count: 10 } }, error: null };

      await calculateStats({
        user_id: 'user-123',
        search_by: null
      }, mockSupabase);

      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].params.p_filters).toEqual({});
    });

    test('empty string search_by results in empty filters', async () => {
      mockRpcResult = { data: { stats: { reading_count: 10 } }, error: null };

      await calculateStats({
        user_id: 'user-123',
        search_by: ''
      }, mockSupabase);

      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].params.p_filters).toEqual({});
    });
  });

  // ─── 2. group_by passthrough ────────────────────────────────────────

  describe('group_by passthrough', () => {

    test('group_by value is passed as p_group_by to RPC', async () => {
      mockRpcResult = { data: { grouped: [] }, error: null };

      await calculateStats({
        user_id: 'user-123',
        group_by: 'day_of_week'
      }, mockSupabase);

      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].params.p_group_by).toBe('day_of_week');
    });

    test('undefined group_by is passed as null', async () => {
      mockRpcResult = { data: { stats: {} }, error: null };

      await calculateStats({
        user_id: 'user-123'
      }, mockSupabase);

      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].params.p_group_by).toBeNull();
    });

    test('null group_by is passed as null', async () => {
      mockRpcResult = { data: { stats: {} }, error: null };

      await calculateStats({
        user_id: 'user-123',
        group_by: null
      }, mockSupabase);

      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].params.p_group_by).toBeNull();
    });

    test('various group_by values pass through correctly', async () => {
      const groupByValues = ['location', 'date', 'payment', 'source', 'time_of_day', 'format'];

      for (const gb of groupByValues) {
        rpcCalls = [];
        mockRpcResult = { data: { grouped: [] }, error: null };

        await calculateStats({
          user_id: 'user-123',
          group_by: gb
        }, mockSupabase);

        expect(rpcCalls[0].params.p_group_by).toBe(gb);
      }
    });
  });

  // ─── 3. user_id passthrough ─────────────────────────────────────────

  describe('user_id passthrough', () => {

    test('user_id is passed as p_user_id to RPC', async () => {
      mockRpcResult = { data: { stats: {} }, error: null };

      await calculateStats({
        user_id: 'abc-def-ghi'
      }, mockSupabase);

      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].params.p_user_id).toBe('abc-def-ghi');
    });
  });

  // ─── 4. RPC calls calculate_reading_stats ───────────────────────────

  describe('RPC function name', () => {

    test('calls calculate_reading_stats RPC', async () => {
      mockRpcResult = { data: { stats: {} }, error: null };

      await calculateStats({ user_id: 'user-123' }, mockSupabase);

      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].fnName).toBe('calculate_reading_stats');
    });
  });

  // ─── 5. no_data response ───────────────────────────────────────────

  describe('no_data response', () => {

    test('returns friendly message when data.error is "no_data"', async () => {
      mockRpcResult = { data: { error: 'no_data' }, error: null };

      const result = await calculateStats({
        user_id: 'user-123',
        search_by: '{"location":"Nonexistent Place"}'
      }, mockSupabase);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual({ message: 'No readings found matching those filters.' });
    });

    test('no_data response does not include raw data', async () => {
      mockRpcResult = { data: { error: 'no_data' }, error: null };

      const result = await calculateStats({ user_id: 'user-123' }, mockSupabase);
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).not.toHaveProperty('error');
      expect(parsed).toHaveProperty('message');
    });
  });

  // ─── 6. RPC error handling ──────────────────────────────────────────

  describe('RPC error handling', () => {

    test('RPC error returns error message in content', async () => {
      mockRpcResult = { data: null, error: { message: 'function does not exist' } };

      const result = await calculateStats({ user_id: 'user-123' }, mockSupabase);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual({ error: 'function does not exist' });
    });

    test('RPC error takes priority over data', async () => {
      // Even if data exists, error should be checked first
      mockRpcResult = { data: { stats: { reading_count: 5 } }, error: { message: 'timeout' } };

      const result = await calculateStats({ user_id: 'user-123' }, mockSupabase);
      const parsed = JSON.parse(result.content[0].text);

      expect(parsed).toEqual({ error: 'timeout' });
      expect(parsed).not.toHaveProperty('stats');
    });
  });

  // ─── 7. Successful response ─────────────────────────────────────────

  describe('successful response', () => {

    test('returns data as pretty-printed JSON on success', async () => {
      const statsData = {
        stats: { reading_count: 17, total_earnings: 554, avg_tip: 8.5 }
      };
      mockRpcResult = { data: statsData, error: null };

      const result = await calculateStats({ user_id: 'user-123' }, mockSupabase);

      expect(result.content).toHaveLength(1);
      expect(result.content[0].type).toBe('text');
      const parsed = JSON.parse(result.content[0].text);
      expect(parsed).toEqual(statsData);
    });

    test('successful response is pretty-printed (2-space indent)', async () => {
      const statsData = { stats: { reading_count: 3 } };
      mockRpcResult = { data: statsData, error: null };

      const result = await calculateStats({ user_id: 'user-123' }, mockSupabase);

      // Verify it's pretty-printed with 2-space indent
      expect(result.content[0].text).toBe(JSON.stringify(statsData, null, 2));
    });

    test('combined search_by and group_by produce valid RPC call', async () => {
      mockRpcResult = { data: { grouped: [{ day: 'Monday', count: 5 }] }, error: null };

      await calculateStats({
        user_id: 'user-123',
        search_by: '{"start_date":"2025-01-01","end_date":"2025-06-30"}',
        group_by: 'day_of_week'
      }, mockSupabase);

      expect(rpcCalls).toHaveLength(1);
      expect(rpcCalls[0].fnName).toBe('calculate_reading_stats');
      expect(rpcCalls[0].params).toEqual({
        p_user_id: 'user-123',
        p_filters: { start_date: '2025-01-01', end_date: '2025-06-30' },
        p_group_by: 'day_of_week'
      });
    });
  });

  // ─── 8. Source pattern verification ─────────────────────────────────

  describe('server.js source patterns', () => {
    let serverSource;

    beforeAll(() => {
      const serverPath = path.join(__dirname, '..', 'mcp-server', 'server.js');
      serverSource = fs.readFileSync(serverPath, 'utf-8');
    });

    test('calculateStats method exists in server.js', () => {
      expect(serverSource).toMatch(/async\s+calculateStats\s*\(args\)/);
    });

    test('calculateStats calls calculate_reading_stats RPC', () => {
      expect(serverSource).toMatch(/rpc\(['"`]calculate_reading_stats['"`]/);
    });

    test('calculateStats is wired in callTool switch', () => {
      expect(serverSource).toMatch(/case\s+['"`]calculate_stats['"`].*calculateStats/);
    });

    test('calculate_stats tool definition exists in tools array', () => {
      expect(serverSource).toMatch(/name:\s*['"`]calculate_stats['"`]/);
    });

    test('tool schema requires user_id', () => {
      // The required array should contain 'user_id'
      expect(serverSource).toMatch(/required:\s*\[['"`]user_id['"`]\]/);
    });

    test('RPC receives p_user_id, p_filters, p_group_by params', () => {
      expect(serverSource).toMatch(/p_user_id:\s*user_id/);
      expect(serverSource).toMatch(/p_filters:\s*filters/);
      expect(serverSource).toMatch(/p_group_by:\s*group_by\s*\|\|\s*null/);
    });

    test('error check comes before no_data check', () => {
      // In the source, 'if (error)' should appear before 'if (data?.error'
      const errorIdx = serverSource.indexOf("if (error) {", serverSource.indexOf('calculateStats'));
      const noDataIdx = serverSource.indexOf("if (data?.error === 'no_data')", serverSource.indexOf('calculateStats'));
      expect(errorIdx).toBeGreaterThan(-1);
      expect(noDataIdx).toBeGreaterThan(-1);
      expect(errorIdx).toBeLessThan(noDataIdx);
    });
  });
});
