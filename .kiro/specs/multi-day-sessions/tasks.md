# Implementation Plan: Multi-Day Sessions

## Overview

Replace the single `session_date` column with a `start_date`/`end_date` pair, enabling sessions that span multiple calendar days. Implementation proceeds database-first through all layers, with testing consolidated at the end per project rules.

## Tasks

- [x] 1. Database schema changes — add start_date and end_date columns
  - [x] 1.1 Write and apply Supabase migration: add `start_date` (date, nullable) and `end_date` (date, nullable) columns to `blacksheep_reading_tracker_sessions`
  - [x] 1.2 Add CHECK constraint `end_date >= start_date` on the sessions table
  - [x] 1.3 Validate columns exist and constraint works by running test INSERT/UPDATE queries (end_date < start_date should fail)

- [x] 2. Reading timestamp local clock conversion
  - [x] 2.1 Add `tz_offset` integer column (nullable) to `blacksheep_reading_tracker_readings`
  - [x] 2.2 Change `timestamp` column from `timestamptz` to `timestamp without time zone` (ALTER COLUMN ... TYPE timestamp without time zone USING timestamp AT TIME ZONE 'UTC') — this strips the timezone info but keeps the raw UTC value for now
  - [x] 2.3 Query all distinct session locations and build a location→timezone offset mapping; present list with best guesses for user confirmation (leave ambiguous ones blank for user to fill in)
  - [x] 2.4 After user confirms timezone mapping, backfill each reading's timestamp: convert from UTC to local by adding the session's timezone offset (e.g., `timestamp + interval '${offset} hours'`); set `tz_offset` column to the confirmed offset value
  - [x] 2.5 Update frontend reading creation: replace `new Date().toISOString()` with local clock time string (no 'Z' suffix, no offset); include `tz_offset` in the insert payload
  - [x] 2.6 Update frontend `formatTimestamp()`: display stored timestamp directly instead of `new Date(timestamp).toLocaleTimeString()` conversion
  - [x] 2.7 Validate: spot-check several readings across different locations to confirm timestamps now show correct local time

- [x] 3. Session date range population — copy session_date to start_date/end_date
  - [x] 3.1 Write migration SQL that copies `session_date` into both `start_date` and `end_date` for each session row individually (skip NULLs with warning) — this is a dumb placeholder population, NOT the real end_date
  - [x] 3.2 After population, ALTER columns to NOT NULL
  - [x] 3.3 Validate migration: confirm zero rows with NULL start_date or end_date, zero rows where end_date < start_date, total row count unchanged

- [x] 4. Collapse migration — safe sandbox approach
  - [x] 4.1 Record snapshot timestamp, create backup snapshots: `sessions_backup` (frozen copy of production sessions) and `readings_backup` (frozen copy of production readings); verify row counts match originals
  - [x] 4.2 Create temp workspace tables: `sessions_temp` and `readings_temp` (full copies of production, NO FK constraints on temp tables)
  - [x] 4.3 Iterate each session in `sessions_temp` one at a time: determine real end_date from latest reading timestamp in `readings_temp` (end_date = GREATEST(start_date, latest_reading_date)); if no readings, end_date stays as start_date
  - [x] 4.4 Identify merge groups in `sessions_temp` using consecutive-day grouping logic (same user_id, location, format, type on consecutive calendar days)
  - [x] 4.5 Process one merge group at a time in temp: update surviving session's start_date/end_date, reassign readings in `readings_temp` from removed sessions to survivor, validate per-group (reading count, timestamps preserved, dates correct), then delete empty sessions from `sessions_temp`
  - [x] 4.6 Final validation of temp tables: no orphaned readings, no sessions with end_date < start_date, total reading count matches backup
  - [x] 4.7 Delta reconciliation: find any readings/sessions added to production after snapshot timestamp (`created_at > snapshot_time`), incorporate them into the promotion step
  - [x] 4.8 Promote diff to production (children first, parents after): (a) update session_id on production readings that were reassigned, (b) update start_date/end_date on surviving sessions, (c) delete merged-away sessions from production (IDs in backup but not in temp)
  - [x] 4.9 Produce summary report: merge groups processed, sessions merged, readings reassigned, delta items reconciled, any failures
  - [x] 4.10 Drop temp workspace tables (`sessions_temp`, `readings_temp`); retain backup tables (`sessions_backup`, `readings_backup`) for burn-in — cleanup deferred to future project

- [x] 5. Update views and database functions
  - [x] 5.1 Update `session_summaries` view to include `start_date`, `end_date`, and `session_duration_days` columns; derive `day_of_week_num` from `start_date`; retain `session_date` for backwards compat
  - [x] 5.2 Update `readings_with_context` view: derive `day_of_week_num`, `day_of_week_name`, `reading_date`, `hour_local`, and `time_of_day` directly from reading timestamp (no AT TIME ZONE conversion — timestamps are already local); add `session_duration_days`; include `start_date`, `end_date`, and `tz_offset`
  - [x] 5.3 Update `get_session_with_readings` function to return `start_date` and `end_date` in session JSON (alongside `session_date`)
  - [x] 5.4 Update `get_user_summary` function to use date range overlap filtering (`s.end_date >= p_start_date AND s.start_date <= p_end_date`) instead of exact session_date match

- [x] 6. Frontend SessionStore changes
  - [x] 6.1 In `modules/session-store.js`: replace `_sessionDate` property with `_startDate` and `_endDate`; add getters/setters for both
  - [x] 6.2 Update `canCreateSession` getter to require both `_startDate` and `_endDate` non-empty
  - [x] 6.3 Update `hasValidSession` getter to check `_startDate` (endDate not required for validity of active session)
  - [x] 6.4 Update `createSession()` to insert `start_date` and `end_date` instead of `session_date`
  - [x] 6.5 Update `save()` / session update logic to persist `start_date` and `end_date`
  - [x] 6.6 Update `loadExistingSession()` to map `start_date`/`end_date` from DB response to `_startDate`/`_endDate`; fallback to `session_date` for both if new columns missing (backwards compat)
  - [x] 6.7 Update any references to `sessionDate` elsewhere in SessionStore (clear, reset, etc.)
  - [x] 6.8 Bump version in index.html and README.md

- [x] 7. Frontend session sheet UI — dual date inputs
  - [x] 7.1 In `index.html`: replace single session-date input with separate Start Date and End Date inputs (YYYY-MM-DD format, type="date")
  - [x] 7.2 Wire new inputs to SessionStore's `startDate` and `endDate` setters
  - [x] 7.3 Default both inputs to today's date (YYYY-MM-DD) when opening sheet for new session
  - [x] 7.4 Add validation: if end date < start date, show error message and prevent save
  - [x] 7.5 When editing existing session, populate both date inputs from stored startDate/endDate values
  - [x] 7.6 Bump version in index.html and README.md

- [x] 8. Frontend session bar display — smart date formatting
  - [x] 8.1 Create `formatSessionDate(startDate, endDate)` utility function with logic: single day → MM/DD; same month → "Mon DD–DD"; different months → "Mon DD–Mon DD"; cross-year → "Mon DD, YYYY–Mon DD, YYYY"
  - [x] 8.2 Update session bar display to use `formatSessionDate()` with the active session's startDate and endDate
  - [x] 8.3 Update Load Session list to display date ranges using same format for multi-day sessions, MM/DD for single-day
  - [x] 8.4 Bump version in index.html and README.md

- [x] 9. Offline queue payload update
  - [x] 9.1 In `modules/session-store.js`: update the `update_session` payload passed to `offlineQueue.enqueue()` to include `start_date` and `end_date` instead of `session_date`
  - [x] 9.2 Verify `_executeMessage` in offline-queue.js passes payload through to Supabase update correctly (no changes needed to offline-queue module itself, just verify)
  - [x] 9.3 Bump version in index.html and README.md

- [x] 10. MCP server query changes — search_by refactor, overlap logic, and day_of_week filter
  - [x] 10.1 Refactor `list_sessions_v2` to replace individual filter params (location, format, day_of_week, date_range) with a single `search_by` JSON param; build an allowlist/filterMap that dynamically constructs Supabase queries from field:value pairs (all filtering DB-side, no lambda-side filtering)
  - [x] 10.2 Refactor `list_readings_v2` similarly: replace individual filter params with `search_by` JSON param and dynamic query builder
  - [x] 10.3 In `list_sessions_v2` filterMap: implement date overlap logic — `start_date` → `gte('end_date', v)`, `end_date` → `lte('start_date', v)`
  - [x] 10.4 In `list_sessions_v2` filterMap: implement `day_of_week` filter using subquery or RPC — filter sessions that have at least one reading on the specified day (using readings_with_context view's day_of_week_num)
  - [x] 10.5 In `list_sessions_v2` filterMap: add `session_duration_days` filter (eq on computed view column)
  - [x] 10.6 Ensure responses return `start_date`, `end_date`, and `session_duration_days` fields (view provides them from Task 5)
  - [x] 10.7 In `getSessionDetailsV2`: verify response includes `start_date` and `end_date` from updated function (Task 5.3)
  - [x] 10.8 In `getUserSummaryV2`: verify date filtering uses overlap logic from updated function (Task 5.4)
  - [x] 10.9 Maintain backward compatibility: if old-style individual params are passed (from MCP IDE client), still handle them by mapping to the filterMap internally
  - [x] 10.10 Bump version in index.html and README.md

- [x] 11. Bedrock agent schema and prompt updates
  - [x] 11.1 In `mcp-server/action-group-schema.json`: refactor `list_sessions_v2` to use `user_id`, `search_by` (JSON string), and `limit` params (3 params total, within Bedrock's 5-param limit); document available search_by fields in the description
  - [x] 11.2 In `mcp-server/action-group-schema.json`: refactor `list_readings_v2` similarly with `user_id`, `search_by`, and `limit`
  - [x] 11.3 In `mcp-server/bedrock-agent-system-prompt.txt`: replace all `session_date` references with `start_date`/`end_date` in tool return descriptions
  - [x] 11.4 In system prompt: document the `search_by` JSON format with all available fields and example usage for both tools
  - [x] 11.5 In system prompt: add multi-day session explanation section (sessions can span multiple days, Reading_Timestamp is source of truth for per-day analytics)
  - [x] 11.6 In system prompt: add date range overlap logic instruction (session overlaps query range when session.start_date <= query.end_date AND session.end_date >= query.start_date)
  - [x] 11.7 In system prompt: note that all timestamps returned are local clock time — no timezone conversion needed; day_of_week is derived from Reading_Timestamp
  - [x] 11.8 Bump version in index.html and README.md

- [x] 12. Unit tests (consolidated)
  - [x] 12.1 Write SessionStore tests: startDate/endDate getters/setters, canCreateSession requires both dates, hasValidSession checks startDate, createSession sends start_date/end_date, save sends start_date/end_date, loadExistingSession maps fields, backwards-compat fallback from session_date
  - [x] 12.2 Write date display formatting tests: single day → MM/DD, same month → "Mon DD–DD", different months → "Mon DD–Mon DD", cross-year → "Mon DD, YYYY–Mon DD, YYYY"
  - [x] 12.3 Write session sheet validation tests: end date < start date shows error, both dates default to today, edit mode populates from stored values
  - [x] 12.4 Write MCP server tests: overlap filter logic (multi-day session found by mid-range query, single-day unchanged), day_of_week filter uses reading timestamp, getUserSummary overlap filtering, session_duration_days filtering
  - [x] 12.5 Write offline queue payload tests: update_session payload includes start_date/end_date (not session_date)
  - [x] 12.6 Write timestamp creation tests: verify local clock time string format (no Z suffix), verify tz_offset included in insert payload
  - [x] 12.7 Write formatTimestamp display tests: stored value displayed directly without Date() conversion
  - [x] 12.8 Run full test suite (`npm test`) — all tests must pass

- [x] 13. Deployment
  - [x] 13.1 Run full test suite (`npm test`) to confirm all green
  - [x] 13.2 Zip frontend files for Amplify deploy (exclude .git/, node_modules/, __tests__/, mcp-server/) (ask user to create zip and report back)
  - [x] 13.3 Create lambda.zip in mcp-server/ directory (ask user to create zip and report back)
  - [x] 13.4 Deploy Lambda functions via AWS CLI (all three: bedrock, mcp-server, bedrock-chat-proxy)
  - [x] 13.5 Copy updated bedrock-agent-system-prompt.txt content to AWS Bedrock Agent console (manual)
  - [x] 13.6 Upload site.zip to AWS Amplify console (manual)
  - [x] 13.7 Smoke test production: create a multi-day session, verify display, query via Gpsy, confirm timestamps show local clock time

## Task Dependency Graph

```json
{
  "waves": [
    [1],
    [2],
    [3],
    [4],
    [5],
    [6],
    [7],
    [8],
    [9],
    [10],
    [11],
    [12],
    [13]
  ]
}
```

Tasks are strictly sequential. Each layer depends on the previous:
- Task 1: Database schema (add start_date/end_date columns)
- Task 2: Timestamp fix (convert UTC → local clock time, backfill with location→tz mapping)
- Task 3: Dumb date population (start_date = end_date = session_date placeholder)
- Task 4: Collapse migration (sandbox approach, determine real end_dates, merge groups)
- Task 5: Update views and functions (simplified — no AT TIME ZONE needed)
- Tasks 6–9: Frontend layer (store → sheet UI → bar display → offline queue)
- Tasks 10–11: MCP/Bedrock layer (server queries → agent schema/prompt)
- Task 12: Testing (consolidated, all implementation must be complete)
- Task 13: Deployment (all tests must pass)

## Notes

- `session_date` column is RETAINED (not dropped) for backwards compatibility
- Version must be bumped in index.html and README.md on every code change task
- All Supabase calls in tests must be mocked — no live DB interactions
- Collapse migration processes one merge group at a time, not bulk
- Migration validation is session-by-session with live DB queries
- Deployment: Frontend = manual zip to Amplify, Lambda = AWS CLI, Bedrock prompt = manual copy/paste
- **Task 3 is dumb population only** — sets end_date = session_date as placeholder so NOT NULL can be applied. Task 4 determines real end_dates.
- **Task 4 uses sandbox approach** — all destructive operations happen in temp tables (`sessions_temp`, `readings_temp`). Production is untouched until validation passes. Promotion applies a targeted diff, not a bulk overwrite.
- **Backup tables are retained indefinitely** — `sessions_backup` and `readings_backup` stay in the DB for burn-in. Cleanup is a separate future task.
- **Delta reconciliation** — handles readings/sessions Amanda adds during the migration window. Snapshot timestamp marks the boundary. Items with `created_at > snapshot_time` are incorporated before promotion.
- **Promote order matters** — children (readings) first, then parents (sessions). FK-safe. Update reading session_ids → update session dates → delete merged sessions.
- **End_date determination is per-session, iterative** — each session's end_date is derived from its latest reading timestamp. No single bulk SQL. Sessions without readings keep end_date = start_date.
- **Temp tables have NO FK constraints** — allows free manipulation without constraint ordering concerns. Only production has FKs.
- **Timestamps are local clock time** — `timestamp without time zone`, NOT `timestamptz`. "What time did the clock say?" is the source of truth. No UTC conversion anywhere in the read path.
- **`tz_offset` is reference-only** — stored as integer (hours, e.g., -7 for PDT). Not used in display math. Exists for provenance/auditability.
- **Backfill uses location→timezone mapping** — each distinct session location gets a confirmed timezone offset. Present list for user confirmation during Task 2 execution. Apply offset to convert existing UTC timestamps to local.
- **Views are dramatically simplified** — no `AT TIME ZONE` conversions needed. `reading_date = r.timestamp::date`, `day_of_week_num = EXTRACT(dow FROM r.timestamp::date)`, `hour_local = EXTRACT(hour FROM r.timestamp)`.
- **Frontend stops using Date() for timestamp display** — stored value IS the display value. No toLocaleTimeString() conversion.
- **`session_duration_days`** — computed column in both views: `(s.end_date - s.start_date + 1)`. Lets Lambda filter by session duration without math.
- **`search_by` refactor** — replaces individual filter params on `list_sessions_v2` and `list_readings_v2` with a single JSON param of field:value pairs. Solves Bedrock's 5-param-per-tool limit. Lambda has an allowlist/filterMap that dynamically builds Supabase queries. All filtering DB-side, no lambda-side filtering. Backward compatible with old-style individual params (MCP IDE client).
