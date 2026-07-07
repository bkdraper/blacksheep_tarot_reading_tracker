# Implementation Plan: calculate_stats Tool

## Overview

Add a dedicated aggregation tool so Gpsy never does arithmetic. All math happens in Postgres via an RPC function. Lambda is a thin passthrough. Agent calls the tool and reports numbers verbatim.

## Tasks

- [x] 1. Create DB function `calculate_reading_stats`
  - [x] 1.1 Write and apply Supabase migration: create function with signature `(p_user_id uuid, p_filters jsonb DEFAULT '{}', p_group_by text DEFAULT NULL) RETURNS jsonb`
  - [x] 1.2 Implement filter logic: start_date, end_date, location (ILIKE), day_of_week, payment, source, time_of_day, format (ILIKE), session_duration_days
  - [x] 1.3 Implement overall stats computation: reading_count, total_earnings, total_tips, total_base, avg_tip, avg_price, min_tip, max_tip, busiest_hour, busiest_time_of_day
  - [x] 1.4 Implement group_by logic: day_of_week, location, date, payment, source, time_of_day, format — returns overall + per-group stats array sorted by total_earnings desc
  - [x] 1.5 Handle edge cases: no matching readings → return `{"error": "no_data"}`; invalid group_by → return stats without groups
  - [x] 1.6 Validate function works with test queries against live data (spot-check totals against known values)

- [x] 2. Add calculate_stats tool to Lambda server.js
  - [x] 2.1 Add tool definition to tools array with inputSchema (user_id, search_by, group_by)
  - [x] 2.2 Implement `calculateStats` handler method: parse search_by JSON, call supabase.rpc('calculate_reading_stats'), return result as-is
  - [x] 2.3 Handle errors: malformed JSON → empty filters; RPC error → error message; no_data → friendly message
  - [x] 2.4 Wire tool into both MCP handler (mcp_lambda.js) and Bedrock handler (bedrock_lambda.js) via the shared callTool dispatch

- [x] 3. Update Bedrock action group schema (write the per-tool json so kelly can paste into console)
  - [x] 3.1 Add calculate_stats function to action-group-schema.json with user_id, search_by, group_by parameters
  - [x] 3.2 Write descriptions that emphasize: agent MUST use this for any numeric question

- [x] 4. Update Bedrock system prompt
  - [x] 4.1 Add ARITHMETIC RULE section: "You are BAD at arithmetic. NEVER compute. Call calculate_stats."
  - [x] 4.2 Add calculate_stats documentation with search_by fields, group_by options, and examples
  - [x] 4.3 Add routing guidance: aggregate questions → calculate_stats; individual reading details → list_readings_v2; session overview → list_sessions_v2
  - [x] 4.4 Add formatting instruction: grouped results → comparison table; overall stats → conversational

- [x] 5. Tests
  - [x] 5.1 Write calculate_stats handler tests: valid search_by, invalid JSON, group_by passthrough, no_data response, RPC error handling
  - [x] 5.2 Run full test suite (`npm test`) — all tests must pass

- [x] 6. Deployment
  - [x] 6.1 Create lambda.zip (user creates zip)
  - [x] 6.2 Deploy Lambda functions via AWS CLI (all three)
  - [x] 6.3 Update Bedrock Agent: paste system prompt + upload action group schema + Prepare
  - [x] 6.4 Smoke test: ask Gpsy "How much did I make on Friday July 3?" — verify exact match to DB ($507.00, 19 readings)
  - [x] 6.5 Smoke test: ask "Best day at Denver Spring 26?" with group_by — verify grouped response
  - [x] 6.6 Bump version in index.html and README.md

## Task Dependency Graph

```json
{
  "waves": [
    [1],
    [2],
    [3, 4],
    [5],
    [6]
  ]
}
```

- Task 1: DB function (must exist before Lambda can call it)
- Task 2: Lambda tool (depends on DB function)
- Tasks 3+4: Schema and prompt (can be done in parallel, depend on tool existing)
- Task 5: Tests (all implementation complete)
- Task 6: Deployment (tests pass)

## Notes

- NO math in Lambda — it's a pure RPC passthrough
- The DB function queries `readings_with_context` view (already has all computed columns we need)
- `get_user_summary_v2` is NOT replaced — both tools coexist. calculate_stats is more flexible (filters + group_by)
- Bedrock 5-param limit: calculate_stats has 3 params (user_id, search_by, group_by) — well under
- System prompt arithmetic ban is the backstop — even if agent doesn't call the tool, it should at least not hallucinate numbers
