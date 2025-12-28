import { createClient } from '@supabase/supabase-js';

// Supabase configuration
const supabaseUrl = 'https://uuindvqgdblkjzvjsyrz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1aW5kdnFnZGJsa2p6dmpzeXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MDU5MDEsImV4cCI6MjA3MzM4MTkwMX0.vONUZEm1w2X4V033_cewR4JjtDXBCIYjTfWzUF5H7bQ';
const supabase = createClient(supabaseUrl, supabaseKey);

export class TarotTrackerMCPServer {
  constructor() {
    this.tools = [
      {
        name: 'get_session_summary',
        description: 'Get earnings summary for a user and date range',
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
        name: 'get_top_locations',
        description: 'Get best performing locations by earnings',
        inputSchema: {
          type: 'object',
          properties: {
            user_name: { type: 'string', description: 'User name' },
            limit: { type: 'number', description: 'Number of locations to return', default: 5 }
          },
          required: ['user_name']
        }
      },
      {
        name: 'get_recent_sessions',
        description: 'Get recent sessions for a user',
        inputSchema: {
          type: 'object',
          properties: {
            user_name: { type: 'string', description: 'User name' },
            limit: { type: 'number', description: 'Number of sessions to return', default: 10 }
          },
          required: ['user_name']
        }
      }
    ];
  }

  async handleRequest(request) {
    const { method, params } = request;

    switch (method) {
      case 'tools/list':
        return { tools: this.tools };
      
      case 'tools/call':
        return await this.callTool(params.name, params.arguments);
      
      default:
        throw new Error(`Unknown method: ${method}`);
    }
  }

  async callTool(toolName, args) {
    switch (toolName) {
      case 'get_session_summary':
        return await this.getSessionSummary(args);
      
      case 'get_top_locations':
        return await this.getTopLocations(args);
      
      case 'get_recent_sessions':
        return await this.getRecentSessions(args);
      
      default:
        throw new Error(`Unknown tool: ${toolName}`);
    }
  }

  async getSessionSummary(args) {
    const { user_name, start_date, end_date } = args;
    
    let query = supabase
      .from('blacksheep_reading_tracker_sessions')
      .select('*')
      .eq('user_name', user_name);
    
    if (start_date) query = query.gte('session_date', start_date);
    if (end_date) query = query.lte('session_date', end_date);
    
    const { data, error } = await query;
    
    if (error) throw new Error(`Database error: ${error.message}`);
    
    // Calculate totals
    let totalReadings = 0;
    let totalEarnings = 0;
    
    data.forEach(session => {
      const readings = session.readings || [];
      totalReadings += readings.length;
      
      readings.forEach(reading => {
        const price = reading.price || session.reading_price || 40;
        const tip = reading.tip || 0;
        totalEarnings += price + tip;
      });
    });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({
          user_name,
          sessions_count: data.length,
          total_readings: totalReadings,
          total_earnings: totalEarnings,
          average_per_session: data.length > 0 ? (totalEarnings / data.length).toFixed(2) : 0,
          date_range: { start_date, end_date }
        }, null, 2)
      }]
    };
  }

  async getTopLocations(args) {
    const { user_name, limit = 5 } = args;
    
    const { data, error } = await supabase
      .from('blacksheep_reading_tracker_sessions')
      .select('*')
      .eq('user_name', user_name);
    
    if (error) throw new Error(`Database error: ${error.message}`);
    
    // Group by location and calculate earnings
    const locationStats = {};
    
    data.forEach(session => {
      const location = session.location || 'Unknown';
      const readings = session.readings || [];
      
      if (!locationStats[location]) {
        locationStats[location] = { earnings: 0, sessions: 0, readings: 0 };
      }
      
      locationStats[location].sessions++;
      locationStats[location].readings += readings.length;
      
      readings.forEach(reading => {
        const price = reading.price || session.reading_price || 40;
        const tip = reading.tip || 0;
        locationStats[location].earnings += price + tip;
      });
    });
    
    // Sort by earnings and limit
    const topLocations = Object.entries(locationStats)
      .map(([location, stats]) => ({ location, ...stats }))
      .sort((a, b) => b.earnings - a.earnings)
      .slice(0, limit);
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ top_locations: topLocations }, null, 2)
      }]
    };
  }

  async getRecentSessions(args) {
    const { user_name, limit = 10 } = args;
    
    const { data, error } = await supabase
      .from('blacksheep_reading_tracker_sessions')
      .select('*')
      .eq('user_name', user_name)
      .order('session_date', { ascending: false })
      .limit(limit);
    
    if (error) throw new Error(`Database error: ${error.message}`);
    
    const sessions = data.map(session => {
      const readings = session.readings || [];
      let totalEarnings = 0;
      
      readings.forEach(reading => {
        const price = reading.price || session.reading_price || 40;
        const tip = reading.tip || 0;
        totalEarnings += price + tip;
      });
      
      return {
        date: session.session_date,
        location: session.location,
        readings_count: readings.length,
        total_earnings: totalEarnings
      };
    });
    
    return {
      content: [{
        type: 'text',
        text: JSON.stringify({ recent_sessions: sessions }, null, 2)
      }]
    };
  }
}