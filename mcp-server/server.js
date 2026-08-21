import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uuindvqgdblkjzvjsyrz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1aW5kdnFnZGJsa2p6dmpzeXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MDU5MDEsImV4cCI6MjA3MzM4MTkwMX0.vONUZEm1w2X4V033_cewR4JjtDXBCIYjTfWzUF5H7bQ';

function getSupabase() {
  return createClient(supabaseUrl, supabaseKey);
}

// Day-of-week name → number mapping (PostgreSQL dow: 0=Sunday)
const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };

// FilterMap for list_sessions_v2 — each key maps to a Supabase query builder operation
const sessionFilterMap = {
  location: (q, v) => q.ilike('location', `%${v}%`),
  format: (q, v) => q.ilike('format', `%${v.trim()}%`),
  start_date: (q, v) => q.gte('end_date', v),       // overlap: session ends on or after filter start
  end_date: (q, v) => q.lte('start_date', v),        // overlap: session starts on or before filter end
  session_duration_days: (q, v) => q.eq('session_duration_days', v),
  // day_of_week handled separately (requires subquery)
};

// FilterMap for list_readings_v2 — each key maps to a Supabase query builder operation
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

export class TarotTrackerMCPServer {
  constructor() {
    this.tools = [
      {
        name: 'list_sessions_v2',
        description: 'V2: List sessions with pre-aggregated summary data from database view (faster, more accurate)',
        inputSchema: {
          type: 'object',
          properties: {
            user_name: { type: 'string', description: 'User name' },
            user_id: { type: 'string', description: 'User UUID (preferred over user_name)' },
            search_by: { type: 'string', description: 'JSON object with field:value pairs. Available fields: location, format, start_date, end_date, day_of_week (sunday-saturday), session_duration_days' },
            start_date: { type: 'string', description: 'Start date (YYYY-MM-DD) — filters sessions overlapping this date' },
            end_date: { type: 'string', description: 'End date (YYYY-MM-DD) — filters sessions overlapping this date' },
            location: { type: 'string', description: 'Location filter (partial match)' },
            format: { type: 'string', description: 'Session format filter (e.g., Expo, Shop, Party, Phone, In-Person)' },
            day_of_week: { type: 'string', description: 'Filter by day of week: sunday|monday|tuesday|wednesday|thursday|friday|saturday' },
            session_duration_days: { type: 'number', description: 'Filter by session duration in days (1 = single day)' },
            limit: { type: 'number', description: 'Max results', default: 50 }
          },
          required: ['user_name']
        }
      },
      {
        name: 'list_readings_v2',
        description: 'V2: List individual readings from normalized table with session context (direct query, no JSONB unpacking)',
        inputSchema: {
          type: 'object',
          properties: {
            user_name: { type: 'string', description: 'User name' },
            user_id: { type: 'string', description: 'User UUID (preferred over user_name)' },
            search_by: { type: 'string', description: 'JSON object with field:value pairs. Available fields: location, payment, source, start_date, end_date, min_tip, max_tip, time_of_day (morning/afternoon/evening), day_of_week (sunday-saturday), session_duration_days, label' },
            start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            location: { type: 'string', description: 'Location filter (partial match)' },
            payment: { type: 'string', description: 'Payment method filter' },
            source: { type: 'string', description: 'Source filter' },
            min_tip: { type: 'number', description: 'Minimum tip amount' },
            max_tip: { type: 'number', description: 'Maximum tip amount' },
            time_of_day: { type: 'string', description: 'Time of day filter: morning, afternoon, evening' },
            day_of_week: { type: 'string', description: 'Filter by day of week: sunday|monday|tuesday|wednesday|thursday|friday|saturday' },
            session_duration_days: { type: 'number', description: 'Filter by session duration in days (1 = single day)' },
            limit: { type: 'number', description: 'Max results', default: 100 }
          },
          required: ['user_name']
        }
      },
      {
        name: 'get_session_details_v2',
        description: 'V2: Get complete session with all readings and summary stats in one call (uses database function)',
        inputSchema: {
          type: 'object',
          properties: {
            session_id: { type: 'string', description: 'Session UUID' }
          },
          required: ['session_id']
        }
      },
      {
        name: 'get_user_summary_v2',
        description: 'V2: Get aggregate statistics for a user across all sessions (uses database function)',
        inputSchema: {
          type: 'object',
          properties: {
            user_name: { type: 'string', description: 'User name' },
            start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' }
          },
          required: ['user_name']
        }
      },
      {
        name: 'calculate_stats',
        description: 'Calculate pre-computed statistics for readings. Use this for ANY question about totals, averages, counts, or comparisons. Returns exact numbers computed by the database.',
        inputSchema: {
          type: 'object',
          properties: {
            user_id: { type: 'string', description: 'User UUID' },
            search_by: { type: 'string', description: 'JSON with filters: location, start_date, end_date, day_of_week, payment, source, time_of_day, format, session_duration_days, label' },
            group_by: { type: 'string', description: 'Group results by: day_of_week, location, date, payment, source, time_of_day, format, label' }
          },
          required: ['user_id']
        }
      }
    ];
  }

  async handleRequest(request) {
    const { method, params, id } = request;

    switch (method) {
      case 'initialize':
        return {
          jsonrpc: '2.0',
          id,
          result: {
            protocolVersion: '2025-06-18',
            capabilities: { tools: {} },
            serverInfo: { name: 'Tarot Tracker MCP Server', version: '2.0.0' }
          }
        };
      
      case 'tools/list':
        return { jsonrpc: '2.0', id, result: { tools: this.tools } };
      
      case 'tools/call':
        const toolResult = await this.callTool(params.name, params.arguments);
        return { jsonrpc: '2.0', id, result: toolResult };
      
      default:
        return { jsonrpc: '2.0', id, error: { code: -32601, message: `Unknown method: ${method}` } };
    }
  }

  async callTool(toolName, args, forBedrock = false) {
    let result;
    
    switch(toolName) {
      case 'list_sessions_v2': result = await this.listSessionsV2(args); break;
      case 'list_readings_v2': result = await this.listReadingsV2(args); break;
      case 'get_session_details_v2': result = await this.getSessionDetailsV2(args); break;
      case 'get_user_summary_v2': result = await this.getUserSummaryV2(args); break;
      case 'calculate_stats': result = await this.calculateStats(args); break;
      default: throw new Error(`Unknown tool: ${toolName}`);
    }
    
    return forBedrock ? JSON.parse(result.content[0].text) : result;
  }

  // ============================================================================
  // V2 TOOLS - Use normalized tables with database views/functions
  // ============================================================================

  // Fuzzy location fallback - called when a location filter returns 0 results
  async fuzzyLocationSuggestions(user_id, user_name, location) {
    console.log('[FUZZY] searching for:', location, 'user_id:', user_id, 'user_name:', user_name);
    const supabase = getSupabase();
    const { data } = await supabase.rpc('search_locations_fuzzy', {
      p_user_name: user_name || '',
      p_search_term: location,
      p_limit: 5,
      p_user_id: user_id || null
    });
    const suggestions = (data || []).map(r => r.location);
    console.log('[FUZZY] suggestions:', JSON.stringify(suggestions));
    return suggestions;
  }

  async listSessionsV2(args) {
    console.log('[listSessionsV2] args:', JSON.stringify(args));
    const supabase = getSupabase();
    const { user_name, user_id, limit = 50 } = args;

    // Build filters object from search_by param OR from individual params (backward compat)
    let filters = {};
    if (args.search_by) {
      // search_by takes priority — parse JSON string if needed
      if (typeof args.search_by === 'string') {
        try { filters = JSON.parse(args.search_by); console.log('[listSessionsV2] parsed search_by:', JSON.stringify(filters)); }
        catch(e) { console.warn('[listSessionsV2] failed to parse search_by:', args.search_by); filters = {}; }
      } else {
        filters = args.search_by;
      }
    } else {
      // Backward compatibility: map individual params into filters object
      if (args.location) filters.location = args.location;
      if (args.format) filters.format = args.format;
      if (args.day_of_week) filters.day_of_week = args.day_of_week;
      if (args.session_duration_days !== undefined) filters.session_duration_days = args.session_duration_days;
      // Support combined date_range param (Bedrock action group has 5-param limit)
      if (args.date_range && !args.start_date && !args.end_date) {
        const parts = args.date_range.split(',');
        if (parts[0]?.trim()) filters.start_date = parts[0].trim();
        if (parts[1]?.trim()) filters.end_date = parts[1].trim();
        console.log('[listSessionsV2] parsed date_range:', args.date_range, '→ start:', filters.start_date, 'end:', filters.end_date);
      } else {
        if (args.start_date) filters.start_date = args.start_date;
        if (args.end_date) filters.end_date = args.end_date;
      }
      console.log('[listSessionsV2] mapped individual params to filters:', JSON.stringify(filters));
    }

    console.log('[listSessionsV2] user_id:', user_id, '| user_name:', user_name, '| limit:', limit, '| filters:', JSON.stringify(filters));

    let query = supabase
      .from('session_summaries')
      .select('*')
      .order('start_date', { ascending: false })
      .limit(limit);

    if (user_id) {
      console.log('[listSessionsV2] filtering by user_id:', user_id);
      query = query.eq('user_id', user_id);
    } else if (user_name) {
      console.log('[listSessionsV2] filtering by user_name:', user_name);
      query = query.ilike('user_name', user_name);
    } else {
      console.warn('[listSessionsV2] no user context - returning empty');
      return { content: [{ type: 'text', text: JSON.stringify({ sessions: [], warning: 'No user context provided' }) }] };
    }

    // Handle day_of_week separately (requires subquery against readings_with_context)
    if (filters.day_of_week) {
      const dow = dayMap[filters.day_of_week.toLowerCase()];
      console.log('[listSessionsV2] day_of_week:', filters.day_of_week, '→ dow_num:', dow);
      if (dow !== undefined) {
        // Query readings_with_context for session_ids that have readings on this day
        let readingsQuery = supabase
          .from('readings_with_context')
          .select('session_id')
          .eq('day_of_week_num', dow);
        if (user_id) readingsQuery = readingsQuery.eq('user_id', user_id);
        else if (user_name) readingsQuery = readingsQuery.ilike('user_name', user_name);

        const { data: readingRows, error: readingsError } = await readingsQuery;
        if (readingsError) {
          console.error('[listSessionsV2] day_of_week subquery error:', readingsError.message);
        } else {
          const sessionIds = [...new Set(readingRows.map(r => r.session_id))];
          console.log('[listSessionsV2] day_of_week matched', sessionIds.length, 'sessions');
          if (sessionIds.length === 0) {
            // No sessions match — return empty
            return { content: [{ type: 'text', text: JSON.stringify({ sessions: [] }, null, 2) }] };
          }
          query = query.in('id', sessionIds);
        }
      }
    }

    // Apply all other filters via the filterMap (skip day_of_week, already handled)
    for (const [field, value] of Object.entries(filters)) {
      if (field === 'day_of_week') continue; // already handled above
      if (value === undefined || value === null || value === '') continue;
      const filterFn = sessionFilterMap[field];
      if (filterFn) {
        console.log('[listSessionsV2] applying filter:', field, '=', value);
        query = filterFn(query, value);
      } else {
        console.log('[listSessionsV2] ignoring unknown filter field:', field);
      }
    }

    console.log('[listSessionsV2] executing query...');
    const t = Date.now();
    const { data, error } = await query;
    console.log('[listSessionsV2] query completed in', Date.now() - t, 'ms | rows:', data?.length ?? 'null', '| error:', error?.message ?? 'none');

    if (error) throw new Error(`Database error: ${error.message}`);

    if (filters.location && data.length === 0) {
      console.log('[listSessionsV2] no results for location, trying fuzzy...');
      const suggestions = await this.fuzzyLocationSuggestions(user_id, user_name, filters.location);
      return { content: [{ type: 'text', text: JSON.stringify({ no_results: true, searched_for: filters.location, suggestions }, null, 2) }] };
    }

    console.log('[listSessionsV2] returning', data.length, 'sessions');
    return { content: [{ type: 'text', text: JSON.stringify({ sessions: data }, null, 2) }] };
  }

  async listReadingsV2(args) {
    console.log('[listReadingsV2] args:', JSON.stringify(args));
    const supabase = getSupabase();
    const { user_name, user_id, limit = 100 } = args;

    // Build filters object from search_by param OR from individual params (backward compat)
    let filters = {};
    if (args.search_by) {
      // search_by takes priority — parse JSON string if needed
      if (typeof args.search_by === 'string') {
        try { filters = JSON.parse(args.search_by); console.log('[listReadingsV2] parsed search_by:', JSON.stringify(filters)); }
        catch(e) { console.warn('[listReadingsV2] failed to parse search_by:', args.search_by); filters = {}; }
      } else {
        filters = args.search_by;
      }
    } else {
      // Backward compatibility: map individual params into filters object
      // Support legacy 'filters' object param (existing MCP IDE client behavior)
      let legacyFilters = args.filters || {};
      if (typeof legacyFilters === 'string') {
        try { legacyFilters = JSON.parse(legacyFilters); console.log('[listReadingsV2] parsed legacy filters string:', JSON.stringify(legacyFilters)); }
        catch(e) { console.warn('[listReadingsV2] failed to parse legacy filters string:', args.filters); legacyFilters = {}; }
      }
      // Merge legacy filters object with top-level individual params (top-level wins)
      const merged = { ...legacyFilters };
      if (args.start_date) merged.start_date = args.start_date;
      if (args.end_date) merged.end_date = args.end_date;
      if (args.location) merged.location = args.location;
      if (args.payment) merged.payment = args.payment;
      if (args.source) merged.source = args.source;
      if (args.min_tip !== undefined) merged.min_tip = args.min_tip;
      if (args.max_tip !== undefined) merged.max_tip = args.max_tip;
      if (args.time_of_day) merged.time_of_day = args.time_of_day;
      if (args.day_of_week) merged.day_of_week = args.day_of_week;
      if (args.session_duration_days !== undefined) merged.session_duration_days = args.session_duration_days;
      filters = merged;
      console.log('[listReadingsV2] mapped individual/legacy params to filters:', JSON.stringify(filters));
    }

    console.log('[listReadingsV2] user_id:', user_id, '| user_name:', user_name, '| filters:', JSON.stringify(filters), '| limit:', limit);

    let query = supabase
      .from('readings_with_context')
      .select('*')
      .order('timestamp', { ascending: false })
      .limit(limit);

    if (user_id) {
      console.log('[listReadingsV2] filtering by user_id:', user_id);
      query = query.eq('user_id', user_id);
    } else if (user_name) {
      console.log('[listReadingsV2] filtering by user_name:', user_name);
      query = query.ilike('user_name', user_name);
    } else {
      console.warn('[listReadingsV2] no user context - returning empty');
      return { content: [{ type: 'text', text: JSON.stringify({ readings: [], warning: 'No user context provided' }) }] };
    }

    // Apply all filters via the filterMap
    for (const [field, value] of Object.entries(filters)) {
      if (value === undefined || value === null || value === '') continue;
      const filterFn = readingFilterMap[field];
      if (filterFn) {
        console.log('[listReadingsV2] applying filter:', field, '=', value);
        query = filterFn(query, value);
      } else {
        console.log('[listReadingsV2] ignoring unknown filter field:', field);
      }
    }

    console.log('[listReadingsV2] executing query...');
    const t = Date.now();
    const { data, error } = await query;
    console.log('[listReadingsV2] query completed in', Date.now() - t, 'ms | rows:', data?.length ?? 'null', '| error:', error?.message ?? 'none');

    if (error) throw new Error(`Database error: ${error.message}`);

    if (filters.location && data.length === 0) {
      console.log('[listReadingsV2] no results for location, trying fuzzy...');
      const suggestions = await this.fuzzyLocationSuggestions(user_id, user_name, filters.location);
      return { content: [{ type: 'text', text: JSON.stringify({ no_results: true, searched_for: filters.location, suggestions }, null, 2) }] };
    }

    console.log('[listReadingsV2] returning', data.length, 'readings');
    return { content: [{ type: 'text', text: JSON.stringify({ readings: data }, null, 2) }] };
  }

  async getSessionDetailsV2(args) {
    console.log('[getSessionDetailsV2] args:', JSON.stringify(args));
    const supabase = getSupabase();
    const { session_id } = args;
    console.log('[getSessionDetailsV2] session_id:', session_id);

    console.log('[getSessionDetailsV2] executing rpc...');
    const t = Date.now();
    const { data, error } = await supabase.rpc('get_session_with_readings', { session_uuid: session_id });
    console.log('[getSessionDetailsV2] rpc completed in', Date.now() - t, 'ms | error:', error?.message ?? 'none');

    if (error) throw new Error(`Database error: ${error.message}`);
    console.log('[getSessionDetailsV2] returning data, keys:', data ? Object.keys(data) : 'null');
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async getUserSummaryV2(args) {
    console.log('[getUserSummaryV2] args:', JSON.stringify(args));
    const supabase = getSupabase();
    const { user_name, user_id, start_date, end_date } = args;
    console.log('[getUserSummaryV2] user_id:', user_id, '| user_name:', user_name, '| start_date:', start_date, '| end_date:', end_date);

    console.log('[getUserSummaryV2] executing rpc...');
    const t = Date.now();
    const { data, error } = await supabase.rpc('get_user_summary', {
      p_user_name: user_id ? null : user_name,
      p_user_id: user_id || null,
      p_start_date: start_date || null,
      p_end_date: end_date || null
    });
    console.log('[getUserSummaryV2] rpc completed in', Date.now() - t, 'ms | error:', error?.message ?? 'none');

    if (error) throw new Error(`Database error: ${error.message}`);
    console.log('[getUserSummaryV2] total_earnings:', data?.totals?.total_earnings);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }

  async calculateStats(args) {
    console.log('[calculateStats] args:', JSON.stringify(args));
    const supabase = getSupabase();
    const { user_id, search_by, group_by } = args;

    // Parse search_by: string → JSON.parse, object → use directly, invalid → empty
    let filters = {};
    if (search_by) {
      try {
        filters = typeof search_by === 'string' ? JSON.parse(search_by) : search_by;
        console.log('[calculateStats] parsed filters:', JSON.stringify(filters));
      } catch (e) {
        console.warn('[calculateStats] failed to parse search_by:', search_by, '— using empty filters');
        filters = {};
      }
    }

    console.log('[calculateStats] user_id:', user_id, '| group_by:', group_by || 'none', '| filters:', JSON.stringify(filters));

    console.log('[calculateStats] executing rpc...');
    const t = Date.now();
    const { data, error } = await supabase.rpc('calculate_reading_stats', {
      p_user_id: user_id,
      p_filters: filters,
      p_group_by: group_by || null
    });
    console.log('[calculateStats] rpc completed in', Date.now() - t, 'ms | error:', error?.message ?? 'none');

    if (error) {
      console.error('[calculateStats] RPC error:', error.message);
      return { content: [{ type: 'text', text: JSON.stringify({ error: error.message }) }] };
    }

    if (data?.error === 'no_data') {
      console.log('[calculateStats] no data matched filters');
      return { content: [{ type: 'text', text: JSON.stringify({ message: 'No readings found matching those filters.' }) }] };
    }

    console.log('[calculateStats] returning stats, reading_count:', data?.stats?.reading_count);
    return { content: [{ type: 'text', text: JSON.stringify(data, null, 2) }] };
  }
}
