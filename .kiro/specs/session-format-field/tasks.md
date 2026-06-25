# Implementation Plan: Session Format Field

## Overview

Add a `format` dimension to sessions across all layers: database schema, client-side stores (SettingsStore and SessionStore), UI (session sheet and session bar), MCP server, and Bedrock agent. The implementation proceeds bottom-up — database first, then data layer, then UI, then backend services. Build it, manually test it, then write automated tests at the end.

## Tasks

- [x] 1. Database migration — add format column, update views, backfill legacy data
  - [x] 1.1 Apply database migration via Supabase MCP
    - Add `format` text column (nullable, no default) to `blacksheep_reading_tracker_sessions`
    - Recreate `session_summaries` view to include `format`
    - Recreate `readings_with_context` view to include session `format`
    - Backfill: set `format = 'Phone'` for private sessions with Phone-source readings
    - Backfill: set `format = 'In-Person'` for private sessions with In-Person-source readings
    - Backfill: set `format = 'Expo'` for event sessions with a season in the location name
    - Backfill: set `format = 'Shop'` for remaining event sessions (no season keyword)
    - Backfill: set `format = 'Party'` for specific party sessions
    - Respect existing non-null format values (do not overwrite)
    - For sessions with both sources, use source from most recent reading
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 2. SettingsStore — format defaults, settings sheet, and source migration
  - [x] 2.1 Add format defaults and remove Phone/In-Person from sources defaults
    - Add `formats` array to `defaults` object with 9 entries (6 event + 3 private)
    - Remove `{ name: 'Phone', scope: 'private' }` and `{ name: 'In-Person', scope: 'private' }` from `defaults.sources`
    - Bump version in index.html, README.md, and development-rules.md
    - _Requirements: 3.1, 3.2, 3.3, 4.1_

  - [x] 2.2 Implement `migrateSourcesFormats()` in SettingsStore
    - Check `legacySourcesMigrated` flag — if true, skip migration
    - Remove sources with `name` exactly "Phone" or "In-Person" (case-sensitive, no substring matches)
    - Add removed sources to `formats` array as `{ name, scope: 'private' }` if not already present
    - Initialize `formats` from defaults if not present in loaded settings
    - Set `legacySourcesMigrated = true` flag and persist immediately
    - Call from `loadSettings()` after `migrateSources()`
    - _Requirements: 4.2, 4.3, 4.4, 11.1, 11.2, 11.3, 11.4, 11.5, 11.6, 11.7_

  - [x] 2.3 Implement formats settings bottom sheet UI
    - Add "Kinds of events/readings" section with "Customize" button to settings drawer
    - Implement `showFormatsSheet()` — bottom sheet listing all formats with name input (maxlength 30), scope dropdown (Event/Private/All), and delete button per row
    - Implement `addFormat()` — appends `{ name: 'New Format', scope: 'all' }`
    - Implement `updateFormat(index, field, value)` — trim name, validate length 1–30, reject duplicates (case-insensitive same scope), persist
    - Implement `deleteFormat(index)` — remove entry, persist, re-render
    - Implement `closeFormatsSheet()`
    - Remove empty-name entries on change event
    - All touch targets 44px min, fonts 16px+
    - _Requirements: 3.4, 3.5, 3.6, 3.7, 3.8, 3.9, 10.1, 10.2, 10.3, 10.4, 10.5, 10.6, 10.7_

- [x] 3. SessionStore — format state, persistence, and session sheet integration
  - [x] 3.1 Add format state and persistence to SessionStore
    - Add `this._format = null` in constructor
    - Add getter/setter with `updateUI()` and `debouncedSave()` calls
    - Modify `saveToLocalStorage()` to include `format` key
    - Modify `loadFromStorage()` to read `state.format` (default null)
    - Modify `loadExistingSession()` to read format from DB row
    - Modify `endSession()` to reset `this._format = null`
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

  - [x] 3.2 Add format selector to session sheet UI
    - In `openSessionSheet()`, render format toggle buttons filtered by session type scope
    - Label: "Kind of event" for event type, "Kind of reading" for private type
    - Filter formats: show only those with scope matching session type or scope `all`
    - Hide selector if no matching formats exist
    - Implement `selectSessionFormat(name)` — toggles active class on buttons
    - Default selection: "Expo" for event, "In-Person" for private
    - Edit mode: pre-fill with session's current format value (even if not in current settings)
    - Validate format selection before save (required field)
    - Touch targets 44px min on format buttons
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5, 5.6, 5.7, 5.8, 5.9, 5.10_

  - [x] 3.3 Add format to session save payload and session bar display
    - Modify `saveSessionSheet()` to include `format` in Supabase insert/update payload
    - Add `<span id="session-bar-format">` to index.html between location and price
    - In `updateSessionBar()`: display format with "· " prefix, truncate at 20 chars + "…", hide when null/empty
    - Use `Utils.sanitize()` for format display text
    - _Requirements: 6.1, 6.2, 7.1, 7.2, 7.3_

- [x] 4. MCP Server — format filter and Bedrock Agent awareness
  - [x] 4.1 Add format filter to MCP server list_sessions_v2
    - Add `format` to `inputSchema.properties` in `list_sessions_v2` tool definition
    - Add filter logic: `if (format && format.trim()) query = query.ilike('format', format.trim())`
    - Format field already appears in response via updated view — no mapping change needed
    - _Requirements: 8.1, 8.2, 8.3, 8.4_

  - [x] 4.2 Verify format exposure in list_readings_v2 and get_session_details_v2
    - Confirm `readings_with_context` view includes format (from task 1.1)
    - Confirm `get_session_with_readings` RPC returns format (automatic from column addition)
    - No code changes expected — just verify after migration
    - _Requirements: 8.5, 8.6_

  - [x] 4.3 Update Bedrock Agent schema and system prompt
    - Add `format` parameter to `list_sessions_v2` in `action-group-schema.json`
    - Update `bedrock-agent-system-prompt.txt`: document format field, add format awareness section, update returns descriptions
    - _Requirements: 9.1, 9.2, 9.3, 9.4_

- [x] 5. Manual testing checkpoint
  - Deploy and manually verify: session creation with format, session bar display, settings sheet, MCP queries
  - Ask the user to confirm everything works before writing automated tests

- [x] 6. Write unit tests for all format features
  - [x] 6.1 SettingsStore format tests
    - Test defaults contain 9 format entries and no Phone/In-Person in sources
    - Test migration removes Phone/In-Person from sources, adds to formats
    - Test migration flag prevents re-execution
    - Test migration ignores substring matches (e.g., "iPhone Reading")
    - Test addFormat, updateFormat, deleteFormat state transitions
    - Test duplicate name rejection (case-insensitive, same scope)
    - Test empty name removal
    - All Supabase calls mocked
    - _Requirements: 3.1–3.9, 4.1–4.4, 11.1–11.7_

  - [x] 6.2 SessionStore format tests
    - Test localStorage round-trip (format persisted and restored)
    - Test missing format key defaults to null
    - Test saveSessionSheet payload includes format
    - Test session bar: null → hidden, short → visible, >20 chars → truncated
    - Test format selector filtering by session type
    - Test format required validation blocks save
    - Test edit mode pre-fills existing format
    - All Supabase calls mocked
    - _Requirements: 5.1–5.10, 6.1–6.6, 7.1–7.3_

  - [x] 6.3 MCP server format tests
    - Test non-empty format filter calls `.ilike('format', value)`
    - Test empty/whitespace format filter skips filtering
    - Test format appears in response objects
    - Test action-group-schema.json contains format parameter
    - All Supabase calls mocked
    - _Requirements: 8.1–8.6, 9.2_

- [x] 7. Load sessions sheet — format filter and badge
  - [x] 7.1 Add format badge to session items in the load sessions list
    - In `filterLoadedSessions()`, add a format badge `<span class="session-format-badge">Format</span>` after the type badge
    - Only show badge when `sessionData.format` is non-null
    - Style with a subtle distinct color (not the same as type badge)
    - Use `Utils.sanitize()` for format text
  - [x] 7.2 Add format filter buttons to load sessions sheet
    - Add a second row of filter buttons below the type filter (All / Expo / Shop / Party / Phone / In-Person / Other)
    - "All" is default active
    - "Other" matches any format not in the listed buttons (covers user-defined formats)
    - Store active format filter in `this._sessionFormatFilter = 'all'`
    - Update `filterLoadedSessions()` to apply format filter after type filter
    - Filter is case-insensitive match
    - Reset format filter to 'all' when `showLoadSession()` is called
    - Add `setSessionFormatFilter(format)` method to toggle active state
    - Touch targets 44px min, consistent with existing filter button styles

- [x] 8. Final checkpoint — Ensure all tests pass
  - Run `npm test` — all tests must pass
  - Bump version if not already bumped
  - Ask the user if questions arise

- [x] 9. Cleanup — migrate context and remove steering file
  - [x] 9.1 Review `.kiro/steering/session-format-field-context.md` for lessons worth keeping
    - Migrate any permanent discoveries to `.kiro/steering/context.md`
    - Delete `.kiro/steering/session-format-field-context.md`
    - Confirm steering file no longer loads

## Notes

- Each task references specific requirements for traceability
- Build first, manually test, then automate — unit tests are a single final phase
- All Supabase calls in tests must be mocked (no live DB interactions)
- Version must be bumped on every code change (index.html, README.md, development-rules.md)
- Database migration (task 1.1) is applied via Supabase MCP tooling, not a code file
- Bedrock system prompt requires manual copy/paste to AWS console after update
- NO property-based testing — use thorough example-based unit tests with good edge cases

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1"] },
    { "id": 1, "tasks": ["2.1"] },
    { "id": 2, "tasks": ["2.2", "2.3"] },
    { "id": 3, "tasks": ["3.1"] },
    { "id": 4, "tasks": ["3.2", "3.3"] },
    { "id": 5, "tasks": ["4.1", "4.2", "4.3"] },
    { "id": 6, "tasks": ["6.1", "6.2", "6.3"] },
    { "id": 7, "tasks": ["7.1", "7.2"] },
    { "id": 8, "tasks": ["8"] },
    { "id": 9, "tasks": ["9.1"] }
  ]
}
```
