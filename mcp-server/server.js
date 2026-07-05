import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uuindvqgdblkjzvjsyrz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1aW5kdnFnZGJsa2p6dmpzeXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MDU5MDEsImV4cCI6MjA3MzM4MTkwMX0.vONUZEm1w2X4V033_cewR4JjtDXBCIYjTfWzUF5H7bQ';

function getSupabase() {
  return createClient(supabaseUrl, supabaseKey);
}

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
            start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            location: { type: 'string', description: 'Location filter (partial match)' },
            format: { type: 'string', description: 'Session format filter (e.g., Expo, Shop, Party, Phone, In-Person)' },
            day_of_week: { type: 'string', description: 'Filter by day of week: sunday|monday|tuesday|wednesday|thursday|friday|saturday' },
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
            start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            location: { type: 'string', description: 'Location filter (partial match)' },
            payment: { type: 'string', description: 'Payment method filter' },
            source: { type: 'string', description: 'Source filter' },
            min_tip: { type: 'number', description: 'Minimum tip amount' },
            max_tip: { type: 'number', description: 'Maximum tip amount' },
            time_of_day: { type: 'string', description: 'Time of day filter: morning, afternoon, evening' },
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
    const { user_name, user_id, location, day_of_week, format, limit = 50 } = args;

    // Support combined date_range param (Bedrock action group has 5-param limit)
    let start_date = args.start_date;
    let end_date = args.end_date;
    if (args.date_range && !start_date && !end_date) {
      const parts = args.date_range.split(',');
      start_date = parts[0]?.trim() || undefined;
      end_date = parts[1]?.trim() || undefined;
      console.log('[listSessionsV2] parsed date_range:', args.date_range, '→ start:', start_date, 'end:', end_date);
    }

    console.log('[listSessionsV2] user_id:', user_id, '| user_name:', user_name, '| limit:', limit);

    let query = supabase
      .from('session_summaries')
      .select('*')
      .order('session_date', { ascending: false })
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

    if (start_date) { console.log('[listSessionsV2] start_date:', start_date); query = query.gte('session_date', start_date); }
    if (end_date)   { console.log('[listSessionsV2] end_date:', end_date);     query = query.lte('session_date', end_date); }
    if (location)   { console.log('[listSessionsV2] location:', location);     query = query.ilike('location', `%${location}%`); }
    if (day_of_week) {
      const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
      const dow = dayMap[day_of_week.toLowerCase()];
      console.log('[listSessionsV2] day_of_week:', day_of_week, '→ dow_num:', dow);
      if (dow !== undefined) query = query.eq('day_of_week_num', dow);
    }
    if (format && format.trim()) { console.log('[listSessionsV2] format:', format); query = query.ilike('format', `%${format.trim()}%`); }

    console.log('[listSessionsV2] executing query...');
    const t = Date.now();
    const { data, error } = await query;
    console.log('[listSessionsV2] query completed in', Date.now() - t, 'ms | rows:', data?.length ?? 'null', '| error:', error?.message ?? 'none');

    if (error) throw new Error(`Database error: ${error.message}`);

    if (location && data.length === 0) {
      console.log('[listSessionsV2] no results for location, trying fuzzy...');
      const suggestions = await this.fuzzyLocationSuggestions(user_id, user_name, location);
      return { content: [{ type: 'text', text: JSON.stringify({ no_results: true, searched_for: location, suggestions }, null, 2) }] };
    }

    console.log('[listSessionsV2] returning', data.length, 'sessions');
    return { content: [{ type: 'text', text: JSON.stringify({ sessions: data }, null, 2) }] };
  }

  async listReadingsV2(args) {
    console.log('[listReadingsV2] args:', JSON.stringify(args));
    const supabase = getSupabase();
    let filters = args.filters || {};
    if (typeof filters === 'string') {
      try { filters = JSON.parse(filters); console.log('[listReadingsV2] parsed filters string:', JSON.stringify(filters)); }
      catch(e) { console.warn('[listReadingsV2] failed to parse filters string:', args.filters); filters = {}; }
    }
    const { user_name, user_id, limit = 100 } = args;
    const { start_date, end_date, location, payment, source, min_tip, max_tip, time_of_day } = filters;
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

    if (start_date) { console.log('[listReadingsV2] start_date:', start_date); query = query.gte('session_date', start_date); }
    if (end_date)   { console.log('[listReadingsV2] end_date:', end_date);     query = query.lte('session_date', end_date); }
    if (location)   { console.log('[listReadingsV2] location:', location);     query = query.ilike('location', `%${location}%`); }
    if (payment)    { console.log('[listReadingsV2] payment:', payment);       query = query.ilike('payment', payment); }
    if (source)     { console.log('[listReadingsV2] source:', source);         query = query.ilike('source', source); }
    if (min_tip !== undefined) { console.log('[listReadingsV2] min_tip:', min_tip); query = query.gte('tip', min_tip); }
    if (max_tip !== undefined) { console.log('[listReadingsV2] max_tip:', max_tip); query = query.lte('tip', max_tip); }
    if (time_of_day) { console.log('[listReadingsV2] time_of_day:', time_of_day); query = query.eq('time_of_day_et', time_of_day); }

    console.log('[listReadingsV2] executing query...');
    const t = Date.now();
    const { data, error } = await query;
    console.log('[listReadingsV2] query completed in', Date.now() - t, 'ms | rows:', data?.length ?? 'null', '| error:', error?.message ?? 'none');

    if (error) throw new Error(`Database error: ${error.message}`);

    if (location && data.length === 0) {
      console.log('[listReadingsV2] no results for location, trying fuzzy...');
      const suggestions = await this.fuzzyLocationSuggestions(user_id, user_name, location);
      return { content: [{ type: 'text', text: JSON.stringify({ no_results: true, searched_for: location, suggestions }, null, 2) }] };
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
}
