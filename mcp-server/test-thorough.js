import { TarotTrackerMCPServer } from './server.js';

const server = new TarotTrackerMCPServer();
let passed = 0;
let failed = 0;

function assert(condition, label, detail = '') {
    if (condition) {
        console.log(`  ✓ ${label}`);
        passed++;
    } else {
        console.error(`  ✗ ${label}${detail ? ': ' + detail : ''}`);
        failed++;
    }
}

async function call(tool, args) {
    const result = await server.callTool(tool, args);
    return JSON.parse(result.content[0].text);
}

async function run() {
    console.log('=== V2 Tools Thorough Test ===\n');

    // ── list_sessions_v2 ──────────────────────────────────────────────
    console.log('list_sessions_v2');
    {
        const r = await call('list_sessions_v2', { user_name: 'Amanda' });
        assert(Array.isArray(r.sessions), 'returns sessions array');
        assert(r.sessions.length > 0, 'has sessions');
        const s = r.sessions[0];
        assert('readings_count' in s, 'has readings_count');
        assert('total_earnings' in s, 'has total_earnings');
        assert('tips_total' in s, 'has tips_total');
        assert('base_total' in s, 'has base_total');
        assert(s.session_date >= r.sessions[r.sessions.length - 1].session_date, 'ordered desc by date');

        // date range filter
        const r2 = await call('list_sessions_v2', { user_name: 'Amanda', start_date: '2026-04-01', end_date: '2026-04-30' });
        assert(r2.sessions.every(s => s.session_date >= '2026-04-01' && s.session_date <= '2026-04-30'), 'date range filter works');

        // location filter
        const r3 = await call('list_sessions_v2', { user_name: 'Amanda', location: 'denver' });
        assert(r3.sessions.every(s => s.location.toLowerCase().includes('denver')), 'location filter works');
        assert(r3.sessions.length > 0, 'denver sessions found');
    }

    // ── list_readings_v2 ──────────────────────────────────────────────
    console.log('\nlist_readings_v2');
    {
        const r = await call('list_readings_v2', { user_name: 'Amanda', limit: 10 });
        assert(Array.isArray(r.readings), 'returns readings array');
        const rd = r.readings[0];
        assert('time_of_day_et' in rd, 'has time_of_day_et');
        assert('effective_price' in rd, 'has effective_price');
        assert('total_earnings' in rd, 'has total_earnings');
        assert('day_of_week_name' in rd, 'has day_of_week_name');
        assert('location' in rd, 'has location (from join)');
        assert('session_date' in rd, 'has session_date (from join)');

        // payment filter (case insensitive)
        const cash = await call('list_readings_v2', { user_name: 'Amanda', payment: 'cash' });
        assert(cash.readings.every(r => r.payment?.toLowerCase() === 'cash'), 'payment filter case-insensitive');

        // source filter
        const referral = await call('list_readings_v2', { user_name: 'Amanda', source: 'referral' });
        assert(referral.readings.length > 0, 'referral source filter returns results');

        // tip range filter
        const tipped = await call('list_readings_v2', { user_name: 'Amanda', min_tip: 20 });
        assert(tipped.readings.every(r => r.tip >= 20), 'min_tip filter works');

        // time_of_day filter
        const evening = await call('list_readings_v2', { user_name: 'Amanda', time_of_day: 'evening' });
        assert(evening.readings.every(r => r.time_of_day_et === 'evening'), 'time_of_day filter works');
        assert(evening.readings.length > 0, 'evening readings found');

        const morning = await call('list_readings_v2', { user_name: 'Amanda', time_of_day: 'morning' });
        assert(morning.readings.every(r => r.time_of_day_et === 'morning'), 'morning filter works');
    }

    // ── get_session_details_v2 ────────────────────────────────────────
    console.log('\nget_session_details_v2');
    {
        // Get a known session with readings
        const sessions = await call('list_sessions_v2', { user_name: 'Amanda', location: 'Denver Spring 26', limit: 1 });
        const sessionId = sessions.sessions[0].id;
        const expectedCount = sessions.sessions[0].readings_count;

        const r = await call('get_session_details_v2', { session_id: sessionId });
        assert('session' in r, 'has session object');
        assert('readings' in r, 'has readings array');
        assert('summary' in r, 'has summary object');
        assert(r.readings.length === expectedCount, `reading count matches (${r.readings.length} == ${expectedCount})`);
        assert('total_earnings' in r.summary, 'summary has total_earnings');
        assert('tips_total' in r.summary, 'summary has tips_total');
    }

    // ── get_user_summary_v2 ───────────────────────────────────────────
    console.log('\nget_user_summary_v2');
    {
        const r = await call('get_user_summary_v2', { user_name: 'Amanda' });
        assert('totals' in r, 'has totals');
        assert('locations' in r, 'has locations array');
        assert(r.totals.sessions_count > 0, 'has session count');
        assert(r.totals.readings_count > 0, 'has reading count');
        assert(r.totals.total_earnings > 0, 'has total earnings');
        assert(Array.isArray(r.locations), 'locations is array');
        assert(r.locations.length > 0, 'has locations');

        // date range
        const r2 = await call('get_user_summary_v2', { user_name: 'Amanda', start_date: '2026-04-01', end_date: '2026-04-30' });
        assert(r2.totals.sessions_count < r.totals.sessions_count, 'date range reduces session count');
        assert(r2.totals.readings_count > 0, 'april has readings');

        // sanity check totals
        const sessions = await call('list_sessions_v2', { user_name: 'Amanda' });
        const sessionTotal = sessions.sessions.reduce((sum, s) => sum + Number(s.readings_count), 0);
        assert(r.totals.readings_count === sessionTotal, `summary readings_count matches sum of sessions (${r.totals.readings_count} == ${sessionTotal})`);
    }

    // ── cross-tool consistency ────────────────────────────────────────
    console.log('\ncross-tool consistency');
    {
        // Denver Spring 26 - count should match across tools
        const sessions = await call('list_sessions_v2', { user_name: 'Amanda', location: 'Denver Spring 26' });
        const totalFromSessions = sessions.sessions.reduce((sum, s) => sum + Number(s.readings_count), 0);

        const readings = await call('list_readings_v2', { user_name: 'Amanda', location: 'Denver Spring 26' });
        assert(readings.readings.length === totalFromSessions, `Denver reading count consistent across tools (${readings.readings.length} == ${totalFromSessions})`);

        // Earnings consistency for a single session
        const s = sessions.sessions[0];
        const details = await call('get_session_details_v2', { session_id: s.id });
        assert(
            Math.abs(Number(details.summary.total_earnings) - Number(s.total_earnings)) < 0.01,
            `session earnings consistent between list and details (${details.summary.total_earnings} == ${s.total_earnings})`
        );
    }

    console.log(`\n${'─'.repeat(40)}`);
    console.log(`${passed + failed} tests: ${passed} passed, ${failed} failed`);
    if (failed > 0) process.exit(1);
}

run().catch(err => { console.error(err); process.exit(1); });
