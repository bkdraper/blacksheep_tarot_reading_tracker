import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://uuindvqgdblkjzvjsyrz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1aW5kdnFnZGJsa2p6dmpzeXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MDU5MDEsImV4cCI6MjA3MzM4MTkwMX0.vONUZEm1w2X4V033_cewR4JjtDXBCIYjTfWzUF5H7bQ';
const supabase = createClient(supabaseUrl, supabaseKey);

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
      case 'list_sessions': result = await this.listSessions(args); break;
      case 'list_readings': result = await this.listReadings(args); break;
      case 'search_locations': result = await this.searchLocations(args); break;
      case 'aggregate_readings': result = await this.aggregateReadings(args); break;
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
}
