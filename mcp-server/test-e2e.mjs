/**
 * test-e2e-bedrock.mjs
 * 
 * Emulates the full chain:
 *   Frontend (gpsy-chat.js) → Chat Proxy Lambda → Bedrock Agent → Bedrock Lambda (bedrockHandler)
 * 
 * Simulates exactly what Bedrock sends to the Lambda action group handler,
 * including the warm-instance multi-call pattern that was causing failures.
 */

import { handler as bedrockHandler } from './bedrock_lambda.js';

const USER_ID   = 'be1fbf1b-ccb4-42c7-9704-48a56f804e67';
const USER_NAME = 'Amanda Madden';
const SESSION_ID = 'test-e2e-session-' + Date.now();
const LOADED_SESSION = '1aeb4c9b-240b-493d-8ade-3f4579bc4dc6';

let passed = 0;
let failed = 0;

function assert(label, condition, detail = '') {
  if (condition) {
    console.log(`  OK ${label}`);
    passed++;
  } else {
    console.error(`  FAIL ${label}${detail ? ': ' + detail : ''}`);
    failed++;
  }
}

// SUCCESS = responseState omitted (Bedrock convention) or explicitly not FAILURE/REPROMPT
function assertSuccess(label, response) {
  const state = response?.response?.functionResponse?.responseState;
  assert(label, !state || (state !== 'FAILURE' && state !== 'REPROMPT'), `responseState was: ${state}`);
}

/**
 * Builds the event Bedrock sends to the Lambda action group handler.
 * Call 1 of a turn: promptSessionAttributes populated.
 * Call 2+: promptSessionAttributes is {}.
 */
function makeBedrockEvent({ toolName, parameters, isFirstCall = true, inputText = 'test query' }) {
  return {
    messageVersion: '1.0',
    function: toolName,
    parameters,
    sessionId: SESSION_ID,
    agent: { name: 'TarotTrackerAgent', version: '39', id: '0LC3MUMHNN', alias: '3T7P4GYJYK' },
    actionGroup: 'TarotDataTools',
    sessionAttributes: {},
    promptSessionAttributes: isFirstCall ? {
      current_user_id: USER_ID,
      current_date: '2026-05-04',
      timezone: 'America/Denver',
      current_loaded_session: LOADED_SESSION,
      current_user: USER_NAME
    } : {},
    inputText: `[Context: user_id=${USER_ID}, user_name=${USER_NAME}, today=2026-05-04, timezone=America/Denver, loaded_session=${LOADED_SESSION}. When user says "my" or "I", use user_id=${USER_ID} in all tool calls.] ${inputText}`
  };
}

function parseBody(response) {
  try {
    return JSON.parse(response.response.functionResponse.responseBody.TEXT.body);
  } catch {
    return null;
  }
}

// ── Tests ─────────────────────────────────────────────────────────────────────

async function testSingleCall() {
  console.log('\n── Test 1: Single call (cold start simulation) ──────────────────');
  const event = makeBedrockEvent({
    toolName: 'list_sessions_v2',
    parameters: [{ name: 'user_id', type: 'string', value: USER_ID }],
    isFirstCall: true,
    inputText: 'whats my latest gig'
  });

  const response = await bedrockHandler(event, {});
  const body = parseBody(response);

  assertSuccess('responseState is SUCCESS', response);
  assert('body is parseable JSON', body !== null);
  assert('sessions array present', Array.isArray(body?.sessions), JSON.stringify(body)?.substring(0, 100));
  assert('sessions not empty', body?.sessions?.length > 0, `got ${body?.sessions?.length}`);
  assert('first session has location', !!body?.sessions?.[0]?.location);
  assert('first session has total_earnings', body?.sessions?.[0]?.total_earnings !== undefined);
}

async function testWarmInstanceMultiCall() {
  console.log('\n── Test 2: Warm instance multi-call (the bug scenario) ──────────');
  console.log('   Simulates Bedrock calling the same Lambda 3x in one turn');
  console.log('   Call 1: promptSessionAttributes populated');
  console.log('   Call 2+: promptSessionAttributes empty (Bedrock behavior)');

  // Call 1 - first tool call in turn, promptSessionAttributes populated
  const event1 = makeBedrockEvent({
    toolName: 'list_sessions_v2',
    parameters: [{ name: 'user_id', type: 'string', value: USER_ID }],
    isFirstCall: true,
    inputText: 'whats my latest gig'
  });
  const r1 = await bedrockHandler(event1, {});
  const b1 = parseBody(r1);
  console.log('  Call 1 result: sessions =', b1?.sessions?.length ?? 'ERROR');
  assertSuccess('Call 1: SUCCESS', r1);
  assert('Call 1: has sessions', b1?.sessions?.length > 0);

  // Call 2 - same turn, promptSessionAttributes now empty (Bedrock drops it after call 1)
  const event2 = makeBedrockEvent({
    toolName: 'get_session_details_v2',
    parameters: [{ name: 'session_id', type: 'string', value: LOADED_SESSION }],
    isFirstCall: false,
    inputText: 'whats my latest gig'
  });
  const r2 = await bedrockHandler(event2, {});
  const b2 = parseBody(r2);
  console.log('  Call 2 result: session location =', b2?.session?.location ?? 'ERROR');
  assertSuccess('Call 2: SUCCESS', r2);
  assert('Call 2: has session data', b2?.session !== undefined || b2?.readings !== undefined, JSON.stringify(b2)?.substring(0, 100));

  // Call 3 - another tool call, still no promptSessionAttributes
  const event3 = makeBedrockEvent({
    toolName: 'list_sessions_v2',
    parameters: [
      { name: 'user_id', type: 'string', value: USER_ID },
      { name: 'day_of_week', type: 'string', value: 'friday' }
    ],
    isFirstCall: false,
    inputText: 'whats my latest gig'
  });
  const r3 = await bedrockHandler(event3, {});
  const b3 = parseBody(r3);
  console.log('  Call 3 result: friday sessions =', b3?.sessions?.length ?? 'ERROR');
  assertSuccess('Call 3: SUCCESS', r3);
  assert('Call 3: has sessions', b3?.sessions?.length > 0);
  assert('Call 3: all sessions are Friday', b3?.sessions?.every(s => s.day_of_week_name === 'Friday'), 
    `got: ${[...new Set(b3?.sessions?.map(s => s.day_of_week_name))].join(', ')}`);
}

async function testUserIdCachingAcrossCalls() {
  console.log('\n── Test 3: user_id cache - injected on call 2 when missing from params ──');

  // Call 1: user_id in promptSessionAttributes only, NOT in parameters
  const event1 = makeBedrockEvent({
    toolName: 'get_user_summary_v2',
    parameters: [],  // agent didn't pass user_id as a param
    isFirstCall: true,
    inputText: 'how much have i made total'
  });
  const r1 = await bedrockHandler(event1, {});
  const b1 = parseBody(r1);
  console.log('  Call 1 (no user_id param): totals =', b1?.totals?.total_earnings ?? 'ERROR');
  assertSuccess('Call 1: SUCCESS even with no user_id param', r1);
  assert('Call 1: got earnings from cache injection', b1?.totals?.total_earnings > 0);

  // Call 2: no promptSessionAttributes, no user_id param - must use cache
  const event2 = makeBedrockEvent({
    toolName: 'get_user_summary_v2',
    parameters: [],
    isFirstCall: false,
    inputText: 'how much have i made total'
  });
  const r2 = await bedrockHandler(event2, {});
  const b2 = parseBody(r2);
  console.log('  Call 2 (no user_id, no promptAttrs): totals =', b2?.totals?.total_earnings ?? 'ERROR');
  assertSuccess('Call 2: SUCCESS using cached user_id', r2);
  assert('Call 2: same earnings as call 1', b2?.totals?.total_earnings === b1?.totals?.total_earnings);
}

async function testAllFourTools() {
  console.log('\n── Test 4: All four v2 tools fire correctly ─────────────────────');

  const tools = [
    {
      name: 'list_sessions_v2',
      parameters: [{ name: 'user_id', type: 'string', value: USER_ID }],
      check: b => b?.sessions?.length > 0,
      label: 'sessions > 0'
    },
    {
      name: 'list_readings_v2',
      parameters: [
        { name: 'user_id', type: 'string', value: USER_ID },
        { name: 'filters', type: 'string', value: JSON.stringify({ payment: 'cash' }) }
      ],
      check: b => b?.readings?.length > 0,
      label: 'cash readings > 0'
    },
    {
      name: 'get_session_details_v2',
      parameters: [{ name: 'session_id', type: 'string', value: LOADED_SESSION }],
      check: b => b?.session !== undefined || b?.readings !== undefined,
      label: 'session or readings present'
    },
    {
      name: 'get_user_summary_v2',
      parameters: [{ name: 'user_id', type: 'string', value: USER_ID }],
      check: b => b?.totals?.total_earnings > 0,
      label: 'total_earnings > 0'
    }
  ];

  for (let i = 0; i < tools.length; i++) {
    const t = tools[i];
    const event = makeBedrockEvent({
      toolName: t.name,
      parameters: t.parameters,
      isFirstCall: i === 0,
      inputText: 'test all tools'
    });
    const r = await bedrockHandler(event, {});
    const b = parseBody(r);
    assertSuccess(`${t.name}: SUCCESS`, r);
    assert(`${t.name}: ${t.label}`, t.check(b), JSON.stringify(b)?.substring(0, 80));
  }
}

async function testFiltersPassedAsJsonString() {
  console.log('\n── Test 5: filters passed as JSON string (Bedrock sends strings) ──');

  const event = makeBedrockEvent({
    toolName: 'list_readings_v2',
    parameters: [
      { name: 'user_id', type: 'string', value: USER_ID },
      { name: 'filters', type: 'string', value: '{"time_of_day":"evening","min_tip":10}' }
    ],
    isFirstCall: true,
    inputText: 'show me evening readings with good tips'
  });
  const r = await bedrockHandler(event, {});
  const b = parseBody(r);
  assertSuccess('SUCCESS', r);
  assert('readings present', Array.isArray(b?.readings));
  if (b?.readings?.length > 0) {
    assert('all readings are evening', b.readings.every(r => r.time_of_day_et === 'evening'),
      `got: ${[...new Set(b.readings.map(r => r.time_of_day_et))].join(', ')}`);
    assert('all tips >= 10', b.readings.every(r => r.tip >= 10),
      `min tip found: ${Math.min(...b.readings.map(r => r.tip))}`);
  }
}

async function testNoUserContextReturnsGracefully() {
  console.log('\n── Test 6: No user context - should return gracefully, not crash ──');

  const event = makeBedrockEvent({
    toolName: 'list_sessions_v2',
    parameters: [],  // no user_id, no user_name
    isFirstCall: false,  // no promptSessionAttributes either
    inputText: 'test no user'
  });
  // Use a fresh session ID so cache doesn't help
  event.sessionId = 'no-user-test-' + Date.now();

  const r = await bedrockHandler(event, {});
  assert('Does not throw', r !== null && r !== undefined);
  assertSuccess('Returns gracefully (not FAILURE/REPROMPT)', r);
  const b = parseBody(r);
  console.log('  Result with no user:', JSON.stringify(b)?.substring(0, 100));
}

// ── Run all ───────────────────────────────────────────────────────────────────

async function run() {
  console.log('═══════════════════════════════════════════════════════════════');
  console.log(' E2E Bedrock Handler Test');
  console.log(' Simulates: FE → Proxy → Agent → Lambda (bedrockHandler)');
  console.log(' USER_ID:', USER_ID);
  console.log(' SESSION_ID:', SESSION_ID);
  console.log('═══════════════════════════════════════════════════════════════');

  await testSingleCall();
  await testWarmInstanceMultiCall();
  await testUserIdCachingAcrossCalls();
  await testAllFourTools();
  await testFiltersPassedAsJsonString();
  await testNoUserContextReturnsGracefully();

  console.log('\n═══════════════════════════════════════════════════════════════');
  console.log(` Results: ${passed} passed, ${failed} failed`);
  console.log('═══════════════════════════════════════════════════════════════');
  process.exit(failed > 0 ? 1 : 0);
}

run().catch(err => {
  console.error('Test runner crashed:', err);
  process.exit(1);
});
