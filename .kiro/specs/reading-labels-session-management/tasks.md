# Implementation Plan: Reading Labels & Session Management

## Overview

Three full-stack features implemented in a single release: reading labels (client names on private readings), session soft delete, and session type change post-creation. Implementation proceeds layer-by-layer: database migrations first, then frontend modules, then MCP server/Bedrock updates, and finally consolidated testing.

## Tasks

- [x] 1. Database migrations — columns, views, and functions
  - [x] 1.1 Add `label` column to readings table and `deleted_at` column to sessions table
    - Apply migration adding nullable `label text` column to `blacksheep_reading_tracker_readings`
    - Apply migration adding nullable `deleted_at timestamp without time zone` column to `blacksheep_reading_tracker_sessions`
    - _Requirements: 1.1, 1.4, 4.1_

  - [x] 1.2 Update `readings_with_context` view to include `label` and exclude soft-deleted sessions
    - Add `r.label` to SELECT list
    - Add `WHERE s.deleted_at IS NULL` filter on the sessions join
    - _Requirements: 1.2, 4.3_

  - [x] 1.3 Update `session_summaries` view to exclude soft-deleted sessions
    - Add `WHERE s.deleted_at IS NULL` before GROUP BY
    - _Requirements: 4.2_

  - [x] 1.4 Update `get_session_with_readings` function to include `label` in reading objects
    - Add `'label', r.label` to the `json_build_object` call in the readings subquery
    - _Requirements: 1.3_

  - [x] 1.5 Update `get_user_summary` function to exclude soft-deleted sessions
    - Add `AND s.deleted_at IS NULL` to both WHERE clauses (main query and locations subquery)
    - _Requirements: 4.4_

  - [x] 1.6 Update `calculate_reading_stats` function for label filter and group_by support
    - Add filter: `IF p_filters->>'label' IS NOT NULL THEN v_where := v_where || format(' AND r.label ILIKE %L', '%' || (p_filters->>'label') || '%'); END IF;`
    - Add group_by: `WHEN 'label' THEN 'r.label'` to the `v_group_col` CASE expression
    - Note: soft-delete exclusion is automatic via the `readings_with_context` view
    - _Requirements: 3.4, 3.5, 4.5_

- [x] 2. Checkpoint — Verify database migrations
  - Ensure all migrations applied successfully. Verify `readings_with_context` returns `label`, `session_summaries` excludes soft-deleted rows, and `calculate_reading_stats` accepts `label` filter/group_by. Ask the user if questions arise.

- [x] 3. Frontend — Session soft delete
  - [x] 3.1 Add `deleteSession()` and `confirmDeleteSession()` methods to session-store.js
    - `confirmDeleteSession()` shows confirmation dialog with location and date
    - `deleteSession()` sets `deleted_at` to current ISO timestamp via Supabase update
    - On success: call `startOver()`, show success snackbar
    - On network error: enqueue `update_session` with `{ deleted_at }` payload to offlineQueue, still call `startOver()`, show info snackbar
    - Must follow Supabase error handling pattern: destructure `error`, `if (error) throw error;`
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 3.2 Replace session bar pencil with 3-dot context menu containing Edit and Delete
    - Replace `btn-session-edit` pencil icon (`fa-pencil-alt`) with `fa-ellipsis-vertical` (⋮) icon
    - On click, show a small dropdown/popover anchored to the button with two items:
      - "Edit Session" (pencil icon) — calls `openSessionSheet('edit', this._type || 'event')`
      - "Delete Session" (trash icon, danger-colored) — calls `confirmDeleteSession()`
    - Dropdown closes on outside click or after action selection
    - Add `openSessionMenu()` and `closeSessionMenu()` methods to session-store.js
    - _Requirements: 5.6_

  - [x] 3.3 Ensure `showLoadSession()` excludes soft-deleted sessions from the list
    - Verify it queries `session_summaries` (which now has `WHERE deleted_at IS NULL`)
    - No code change expected if it already queries the view — confirm and document
    - _Requirements: 5.7_

- [x] 4. Frontend — Session type change
  - [x] 4.1 Add type selector UI to session edit interface
    - Add event/private toggle buttons to session edit sheet
    - Style active button to indicate current selection
    - Onclick sets `session.type = 'event'` or `session.type = 'private'`
    - _Requirements: 7.1_

  - [x] 4.2 Implement type change logic with format validation in session-store.js
    - Modify `type` setter to detect actual type changes
    - When type changes: validate current format against `FORMAT_RULES` for new type
    - If format invalid: clear `this._format = null`, notify user format was invalidated
    - Call `updateUI()` and `save()` after change
    - Skip DB update if selected type matches current type
    - _Requirements: 6.2, 6.3, 7.2, 7.3_

  - [x] 4.3 Add `_persistTypeChange()` method to session-store.js
    - Persist type (and cleared format if applicable) to Supabase
    - On network error: enqueue `update_session` with `{ type }` payload to offlineQueue
    - Must follow Supabase error handling pattern
    - _Requirements: 7.2, 7.7_

  - [x] 4.4 Update readings UI to respond to type changes (show/hide labels, update source filtering)
    - When type changes to `'private'`: label inputs become visible on existing readings
    - When type changes to `'event'`: label inputs become hidden on existing readings
    - Source filtering updates immediately to show sources matching new type
    - _Requirements: 7.4, 7.5, 7.6_

- [x] 5. Frontend — Reading label
  - [x] 5.1 Add label input field rendering in `updateReadingsList()` in session-store.js
    - Conditionally render label input for each reading when `this._type === 'private'`
    - Hide label input when `this._type === 'event'`
    - Input has 44px minimum touch target height
    - Input placeholder shows session location
    - Onchange calls `session.updateReading(index, 'label', this.value)`
    - _Requirements: 2.1, 2.2, 2.6, 2.7_

  - [x] 5.2 Modify `addReading()` in session-store.js to set label default for private sessions
    - If `this._type === 'private'`: set `reading.label = reading.label || this._location`
    - Include `label` in the Supabase insert payload when defined
    - _Requirements: 2.3_

  - [x] 5.3 Implement label update via `updateReading()` in session-store.js
    - Handle `field === 'label'` in updateReading method
    - Update UI immediately on change
    - Persist to DB; on failure revert to previous value, show error, enqueue to offlineQueue
    - _Requirements: 2.4, 2.5_

- [x] 6. Checkpoint — Verify frontend features
  - Ensure all frontend changes work together: soft delete with confirmation, type change with format clearing, label input showing/hiding by type. Manually test in browser. Ask the user if questions arise.

- [x] 7. MCP server and Bedrock Agent updates
  - [x] 7.1 Add `label` filter to `readingFilterMap` in server.js
    - Add entry: `label: (q, v) => q.ilike('label', \`%${v}%\`)`
    - Add `label` to `search_by` description in `list_readings_v2` inputSchema
    - _Requirements: 3.1, 3.2_

  - [x] 7.2 Add `label` group_by and filter support to `calculate_stats` tool in server.js
    - Add `'label'` to valid `group_by` values
    - Add `label` to `search_by` description in `calculate_stats` inputSchema
    - _Requirements: 3.4, 3.5_

  - [x] 7.3 Verify `get_session_details_v2` returns label (no code change expected)
    - Tool calls `get_session_with_readings` RPC which was updated in task 1.4
    - Confirm label appears in response
    - _Requirements: 3.3_

  - [x] 7.4 Update action-group-schema.json for Bedrock Agent
    - Add `label` to `search_by` descriptions for `list_readings_v2` and `calculate_stats`
    - Add `label` to valid `group_by` values for `calculate_stats`
    - _Requirements: 3.6_

  - [x] 7.5 Update bedrock-agent-system-prompt.txt
    - Add `label` parameter documentation to `list_readings_v2` section
    - Add `label` to `calculate_stats` filter and group_by documentation
    - Add `<label_awareness>` section explaining label semantics and query patterns
    - Add note that session type can be changed after creation
    - _Requirements: 3.7, 8.4_

- [x] 8. Checkpoint — Verify MCP server and Bedrock changes
  - Run `node mcp-server/test-tools.js` smoke test. Verify label filter and group_by work. Ensure soft-deleted sessions are excluded from query results. Ask the user if questions arise.

- [x] 9. Consolidated testing
  - [x] 9.1 Write unit tests for session-store.js — deleteSession and type change
    - Test `deleteSession()`: Supabase update called with `deleted_at`, `startOver()` called on success
    - Test `deleteSession()` offline: `offlineQueue.enqueue` called with correct payload, `startOver()` still called
    - Test type change format validation: event→private clears "Expo" but keeps "In-Person"
    - Test type change format validation: private→event clears "Phone" but keeps "Shop"
    - Test `_persistTypeChange()`: Supabase update called, offline fallback on error
    - Test type change skip: no DB call when selected type matches current type
    - All Supabase calls mocked (no live DB)
    - _Requirements: 5.1, 5.3, 5.4, 5.5, 6.2, 6.3, 7.2, 7.7_

  - [x] 9.2 Write unit tests for session-store.js — reading label logic
    - Test `addReading()` private session: label defaults to location
    - Test `addReading()` event session: no label set
    - Test `updateReading()` with label field: UI updates, DB persist, revert on failure
    - Test label included in Supabase insert payload
    - All Supabase calls mocked
    - _Requirements: 2.3, 2.4, 2.5_

  - [x] 9.3 Write unit tests for readings-manager.js — label input rendering
    - Test label input rendered for private sessions
    - Test label input hidden for event sessions
    - Test label input onchange calls `updateReading(index, 'label', value)`
    - Test label input has 44px minimum height
    - _Requirements: 2.1, 2.2, 2.7_

  - [x] 9.4 Write unit tests for offline-queue.js — new operation payloads
    - Test `update_session` with `{ deleted_at }` payload flushes correctly
    - Test `update_session` with `{ type }` payload flushes correctly
    - Test `update_reading` with `{ field: 'label', value }` flushes correctly
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

  - [x] 9.5 Write MCP server tests for label filter and group_by
    - Test `list_readings_v2` with `label` filter applies ILIKE
    - Test `calculate_stats` with `label` in search_by
    - Test `calculate_stats` with `group_by: 'label'`
    - Follow existing ESM testing pattern (reconstruct filter logic in CJS)
    - _Requirements: 3.2, 3.4, 3.5_

- [x] 10. Final checkpoint — Ensure all tests pass
  - Run `npm test` and ensure all tests pass. Run `node mcp-server/test-e2e.mjs` for E2E verification. Bump version to v4.7.0. Ask the user if questions arise.

## Notes

- All tests use Jest with mocked Supabase calls — no live database interactions
- No property-based testing per project rules; thorough example-based tests only
- Testing is consolidated at the end per project conventions
- Format validation rules: event = ['Expo', 'Shop', 'Party'], private = ['In-Person', 'Phone']
- Offline queue requires no structural changes — existing `update_session` and `update_reading` types handle all new operations
- The `readings_with_context` view change automatically excludes soft-deleted sessions from `calculate_reading_stats` (queries the view)
- Supabase error handling: ALWAYS destructure `error` and `if (error) throw error;` after every data operation
- Timestamps use local clock time (no Z suffix) per project convention
- Version bump to v4.7.0 happens at final checkpoint

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["1.2", "1.3", "1.4", "1.5"] },
    { "id": 2, "tasks": ["1.6"] },
    { "id": 3, "tasks": ["3.1", "4.1", "5.1"] },
    { "id": 4, "tasks": ["3.2", "3.3", "4.2", "5.2"] },
    { "id": 5, "tasks": ["4.3", "4.4", "5.3"] },
    { "id": 6, "tasks": ["7.1", "7.2", "7.3", "7.4", "7.5"] },
    { "id": 7, "tasks": ["9.1", "9.2", "9.3", "9.4", "9.5"] }
  ]
}
```
