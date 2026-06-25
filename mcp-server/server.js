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
        name: 'list_sessions',
        description: 'List sessions with summary data',
        inputSchema: {
          type: 'object',
          properties: {
            user_name: { type: 'string', description: 'User name' },
            start_date: { type: 'string', description: 'Start date (YYYY-MM-DD)' },
            end_date: { type: 'string', description: 'End date (YYYY-MM-DD)' },
            location: { type: 'string', description: 'Location filter (partial match)' },
            limit: { type: 'number', description: 'Max results', default: 50 }
          },
          required: ['user_name']
        }
      },
      {
        name: 'list_readings',
        description: 'List individual reading records with full details including local time conversion',
        inputSchema: {
          type: 'object',
          properties: {
            user_name: { type: 'string', description: 'User name' },
            filters: { 
              type: 'object', 
              description: 'Filters: start_date, end_date, location, payment, source, day_of_week (sunday|monday|tuesday|wednesday|thursday|friday|saturday)',
              additionalProperties: true
            },
            timezone: { 
              type: 'string', 
              description: 'IANA timezone (e.g., America/New_York, America/Chicago). Defaults to America/New_York',
              default: 'America/New_York'
            },
            limit: { type: 'number', description: 'Max results (optional - returns all if not specified)' }
          },
          required: ['user_name']
        }
      },
      {
        name: 'search_locations',
        description: 'Search for unique locations by partial name',
        inputSchema: {
          type: 'object',
          properties: {
            user_name: { type: 'string', description: 'User name' },
            search_term: { type: 'string', description: 'Partial location name' },
            limit: { type: 'number', description: 'Max results', default: 20 }
          },
          required: ['user_name', 'search_term']
        }
      },
      {
        name: 'aggregate_readings',
        description: 'Aggregate readings with dynamic grouping, filtering, and sorting. Use day_of_week filter to find events on specific days (e.g., "friday", "saturday"). The server calculates day of week from dates - do not try to calculate this yourself.',
        inputSchema: {
          type: 'object',
          properties: {
            user_name: { type: 'string', description: 'User name' },
            filters: { 
              type: 'object', 
              description: 'Filters: start_date, end_date, location, payment, source, min_tip, max_tip, min_price, max_price, day_of_week (sunday|monday|tuesday|wednesday|thursday|friday|saturday)',
              additionalProperties: true
            },
            options: {
              type: 'object',
              description: 'Aggregation options: group_by, aggregate, sort_by',
              additionalProperties: true
            },
            limit: { type: 'number', description: 'Max results' }
          },
          required: ['user_name']
        }
      },
      // V2 Tools - Use normalized tables with database views/functions
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
      // Legacy tools (JSONB-based)
      case 'list_sessions': result = await this.listSessions(args); break;
      case 'list_readings': result = await this.listReadings(args); break;
      case 'search_locations': result = await this.searchLocations(args); break;
      case 'aggregate_readings': result = await this.aggregateReadings(args); break;
      // V2 tools (normalized table-based)
      case 'list_sessions_v2': result = await this.listSessionsV2(args); break;
      case 'list_readings_v2': result = await this.listReadingsV2(args); break;
      case 'get_session_details_v2': result = await this.getSessionDetailsV2(args); break;
      case 'get_user_summary_v2': result = await this.getUserSummaryV2(args); break;
      default: throw new Error(`Unknown tool: ${toolName}`);
    }
    
    return forBedrock ? JSON.parse(result.content[0].text) : result;
  }

  async listSessions(args) {
    const { user_name, start_date, end_date, location, limit = 50 } = args;
    
    let query = supabase.from('blacksheep_reading_tracker_sessions').select('*').ilike('user_name', user_name).order('session_date', { ascending: false }).limit(limit);
    if (start_date) query = query.gte('session_date', start_date);
    if (end_date) query = query.lte('session_date', end_date);
    if (location) query = query.ilike('location', `%${location}%`);
    
    const { data, error } = await query;
    if (error) throw new Error(`Database error: ${error.message}`);
    
    const sessions = data.map(s => ({
      session_date: s.session_date,
      location: s.location,
      readings_count: (s.readings || []).length,
      reading_price: s.reading_price
    }));
    
    return { content: [{ type: 'text', text: JSON.stringify({ sessions }, null, 2) }] };
  }

  async listReadings(args) {
    const { user_name, filters = {}, limit, timezone = 'America/New_York' } = args;
    const { start_date, end_date, location, payment, source, day_of_week } = filters;
    
    let query = supabase.from('blacksheep_reading_tracker_sessions')
      .select('*')
      .ilike('user_name', user_name)
      .order('session_date', { ascending: false })
      .limit(10000);  // Explicit large limit to override Supabase default
    
    if (start_date) query = query.gte('session_date', start_date);
    if (end_date) query = query.lte('session_date', end_date);
    if (location) query = query.ilike('location', `%${location}%`);
    
    const { data, error } = await query;
    if (error) throw new Error(`Database error: ${error.message}`);
    
    // Filter by day of week if specified
    let sessions = data;
    if (day_of_week) {
      const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
      const targetDay = dayMap[day_of_week.toLowerCase()];
      if (targetDay !== undefined) {
        sessions = sessions.filter(s => {
          const date = new Date(s.session_date + 'T00:00:00');
          return date.getDay() === targetDay;
        });
      }
    }
    
    const readings = [];
    sessions.forEach(s => {
      (s.readings || []).forEach(r => {
        if (payment && r.payment?.toLowerCase() !== payment.toLowerCase()) return;
        if (source && r.source?.toLowerCase() !== source.toLowerCase()) return;
        
        // Parse UTC timestamp and convert to local time
        const utcDate = new Date(r.timestamp);
        const localTime = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
        const hour = localTime.getHours();
        const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
        
        readings.push({
          session_date: s.session_date,
          location: s.location,
          timestamp_utc: r.timestamp,
          timestamp_local: localTime.toISOString().slice(0, 19).replace('T', ' '),
          hour_local: hour,
          time_of_day: timeOfDay,
          price: r.price || s.reading_price || 40,
          tip: r.tip || 0,
          payment: r.payment,
          source: r.source
        });
      });
    });
    
    // Apply limit only if specified (no default limit)
    const finalReadings = limit ? readings.slice(0, limit) : readings;
    
    return { content: [{ type: 'text', text: JSON.stringify({ readings: finalReadings, timezone }, null, 2) }] };
  }

  async searchLocations(args) {
    const { user_name, search_term, limit = 20 } = args;
    
    const { data, error } = await supabase.from('blacksheep_reading_tracker_sessions').select('location').ilike('user_name', user_name).ilike('location', `%${search_term}%`).limit(limit);
    if (error) throw new Error(`Database error: ${error.message}`);
    
    const locations = [...new Set(data.map(s => s.location))];
    return { content: [{ type: 'text', text: JSON.stringify({ locations }, null, 2) }] };
  }

  async aggregateReadings(args) {
    const { user_name, filters = {}, options = {}, limit, timezone = 'America/New_York' } = args;
    const { group_by = [], aggregate = ['count', 'sum_earnings'], sort_by } = options;
    const { day_of_week, payment, source } = filters;
    
    // Get all sessions
    let query = supabase.from('blacksheep_reading_tracker_sessions')
      .select('*')
      .ilike('user_name', user_name)
      .order('session_date', { ascending: false })
      .limit(10000);
    
    if (filters.start_date) query = query.gte('session_date', filters.start_date);
    if (filters.end_date) query = query.lte('session_date', filters.end_date);
    if (filters.location) query = query.ilike('location', `%${filters.location}%`);
    
    const { data, error } = await query;
    if (error) throw new Error(`Database error: ${error.message}`);
    
    // Filter by day of week if specified
    let sessions = data;
    if (day_of_week) {
      const dayMap = { sunday: 0, monday: 1, tuesday: 2, wednesday: 3, thursday: 4, friday: 5, saturday: 6 };
      const targetDay = dayMap[day_of_week.toLowerCase()];
      if (targetDay !== undefined) {
        sessions = sessions.filter(s => {
          const date = new Date(s.session_date + 'T00:00:00');
          return date.getDay() === targetDay;
        });
      }
    }
    
    // If no grouping, return overall totals
    if (group_by.length === 0) {
      let totalReadings = 0;
      let totalEarnings = 0;
      
      sessions.forEach(s => {
        (s.readings || []).forEach(r => {
          if (payment && r.payment?.toLowerCase() !== payment.toLowerCase()) return;
          if (source && r.source?.toLowerCase() !== source.toLowerCase()) return;
          
          totalReadings++;
          totalEarnings += (r.price || s.reading_price || 40) + (r.tip || 0);
        });
      });
      
      return { content: [{ type: 'text', text: JSON.stringify({ 
        count: totalReadings,
        sum_earnings: totalEarnings,
        avg_earnings: totalReadings > 0 ? totalEarnings / totalReadings : 0
      }, null, 2) }] };
    }
    
    // Check if grouping by time_of_day - if so, expand to reading level
    if (group_by.includes('time_of_day')) {
      const readings = [];
      sessions.forEach(s => {
        (s.readings || []).forEach(r => {
          if (payment && r.payment?.toLowerCase() !== payment.toLowerCase()) return;
          if (source && r.source?.toLowerCase() !== source.toLowerCase()) return;
          
          const utcDate = new Date(r.timestamp);
          const localTime = new Date(utcDate.toLocaleString('en-US', { timeZone: timezone }));
          const hour = localTime.getHours();
          const timeOfDay = hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
          
          readings.push({
            time_of_day: timeOfDay,
            price: r.price || s.reading_price || 40,
            tip: r.tip || 0,
            earnings: (r.price || s.reading_price || 40) + (r.tip || 0)
          });
        });
      });
      
      // Group by time_of_day
      const grouped = {};
      readings.forEach(r => {
        if (!grouped[r.time_of_day]) grouped[r.time_of_day] = [];
        grouped[r.time_of_day].push(r);
      });
      
      const results = Object.entries(grouped).map(([time_of_day, items]) => ({
        time_of_day,
        count: items.length,
        sum_earnings: items.reduce((sum, r) => sum + r.earnings, 0),
        avg_earnings: items.reduce((sum, r) => sum + r.earnings, 0) / items.length
      }));
      
      return { content: [{ type: 'text', text: JSON.stringify({ results }, null, 2) }] };
    }
    
    // Session-level aggregation (original logic)
    const results = sessions.map(s => {
      const readings = s.readings || [];
      const readingsCount = readings.length;
      const baseTotal = readings.reduce((sum, r) => sum + (r.price || s.reading_price || 40), 0);
      const tipsTotal = readings.reduce((sum, r) => sum + (r.tip || 0), 0);
      const earnings = baseTotal + tipsTotal;
      
      return {
        session_date: s.session_date,
        location: s.location,
        readings_count: readingsCount,
        reading_price: s.reading_price,
        base_total: baseTotal,
        tips_total: tipsTotal,
        total_earnings: earnings
      };
    });
    
    const limited = limit ? results.slice(0, limit) : results;
    return { content: [{ type: 'text', text: JSON.stringify({ results: limited }, null, 2) }] };
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
