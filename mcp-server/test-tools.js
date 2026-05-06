import { TarotTrackerMCPServer } from './server.js';

const server = new TarotTrackerMCPServer();

async function testV2Tools() {
  console.log('Testing V2 Tools...\n');

  try {
    // Test 1: list_sessions_v2
    console.log('1. Testing list_sessions_v2...');
    const sessionsResult = await server.callTool('list_sessions_v2', {
      user_name: 'Amanda',
      limit: 3
    });
    console.log('✓ Sessions:', JSON.parse(sessionsResult.content[0].text).sessions.length, 'found');
    console.log(sessionsResult.content[0].text.substring(0, 200) + '...\n');

    // Test 2: list_readings_v2
    console.log('2. Testing list_readings_v2...');
    const readingsResult = await server.callTool('list_readings_v2', {
      user_name: 'Amanda',
      limit: 5
    });
    console.log('✓ Readings:', JSON.parse(readingsResult.content[0].text).readings.length, 'found');
    console.log(readingsResult.content[0].text.substring(0, 200) + '...\n');

    // Test 3: get_session_details_v2
    console.log('3. Testing get_session_details_v2...');
    const sessionDetailsResult = await server.callTool('get_session_details_v2', {
      session_id: '881fb364-8df6-4389-a149-143a601327ac'
    });
    const sessionDetails = JSON.parse(sessionDetailsResult.content[0].text);
    console.log('✓ Session details loaded');
    console.log('  Location:', sessionDetails.session.location);
    console.log('  Readings:', sessionDetails.readings.length);
    console.log('  Total earnings:', sessionDetails.summary.total_earnings, '\n');

    // Test 4: get_user_summary_v2
    console.log('4. Testing get_user_summary_v2...');
    const summaryResult = await server.callTool('get_user_summary_v2', {
      user_name: 'Amanda',
      start_date: '2025-01-01',
      end_date: '2026-12-31'
    });
    const summary = JSON.parse(summaryResult.content[0].text);
    console.log('✓ User summary loaded');
    console.log('  Sessions:', summary.totals.sessions_count);
    console.log('  Readings:', summary.totals.readings_count);
    console.log('  Total earnings:', summary.totals.total_earnings);
    console.log('  Locations:', summary.locations.length, '\n');

    // Test 5: Advanced filtering with list_readings_v2
    console.log('5. Testing list_readings_v2 with filters...');
    const filteredResult = await server.callTool('list_readings_v2', {
      user_name: 'Amanda',
      min_tip: 10,
      time_of_day: 'evening',
      limit: 5
    });
    const filtered = JSON.parse(filteredResult.content[0].text);
    console.log('✓ Filtered readings:', filtered.readings.length, 'found');
    if (filtered.readings.length > 0) {
      console.log('  Sample:', filtered.readings[0].tip, 'tip,', filtered.readings[0].time_of_day_et, '\n');
    }

    console.log('✅ All V2 tools working correctly!');

  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error(error.stack);
  }
}

testV2Tools();
