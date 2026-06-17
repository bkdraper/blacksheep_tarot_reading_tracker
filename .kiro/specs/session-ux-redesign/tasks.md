# Implementation Plan: Session UX Redesign

## Overview

Replace the collapsible "Event Settings" panel with a slim session bar, hamburger popup menu, and bottom sheet for session creation/editing. Introduce session types (event/private) with a new database column, type-driven source filtering, and unified sources with scope tags in SettingsStore.

Implementation follows the design's specified order: DB migration → SettingsStore → Session Bar → Hamburger Menu → Session Sheet → Source Picker wiring → Legacy panel removal → SessionStore persistence.

## Tasks

- [x] 1. Database migration — add `type` column
  - [x] 1.1 Write SQL migration to add `type` text column to `blacksheep_reading_tracker_sessions`
    - Add column with DEFAULT 'event'
    - Backfill existing rows: `UPDATE ... SET type = 'event' WHERE type IS NULL`
    - Apply NOT NULL constraint after backfill
    - No CHECK constraint (per design spec)
    - Output as a `.sql` file in project root for manual execution in Supabase SQL editor
    - _Requirements: 5.1, 5.2, 5.3_

- [x] 2. SettingsStore — unified sources and price presets
  - [x] 2.1 Refactor `settings-store.js` defaults to use scoped source objects
    - Change `sources` default from string[] to object[] with `{name, scope}` format
    - Default sources: Referral (event), Renu (event), POG (event), Repeat (all), Phone (private), In-Person (private)
    - Add `privatePricePresets` default: [60, 120, 150]
    - Bump version in index.html, README.md, and development-rules.md
    - _Requirements: 7.4, 7.5, 7.6_

  - [x] 2.2 Implement legacy sources migration in SettingsStore
    - Add `migrateSources(settings)` method
    - If `sources` is a flat string array, convert each entry to `{ name: entry, scope: 'event' }`
    - Call migration on settings load (in constructor or load method)
    - Save immediately after migration
    - _Requirements: 8.5_

  - [x] 2.3 Add sources customization UI with scope dropdowns
    - Update `showSourcesSheet()` to render each source row with name input + scope selector (Event/Private/All)
    - Update `updateSource(index, field, value)` to handle scope changes
    - Wire add/edit/delete to the new object format
    - _Requirements: 8.1_

  - [x] 2.4 Add private price presets customization UI
    - Implement `customizePrivatePricePresets()`, `showPrivatePricePresetsSheet()`, `closePrivatePricePresetsSheet()`
    - Implement `updatePrivatePricePreset(index, value)`, `deletePrivatePricePreset(index)`, `addPrivatePricePreset()`
    - Add HTML for presets settings section in index.html
    - _Requirements: 8.2, 8.4_

  - [x] 2.5 Remove `toggleSettings` and `collapseSettings` wrapper methods from SettingsStore
    - Delete method definitions
    - Remove any internal calls to these methods
    - _Requirements: 9.2_

  - [ ]* 2.6 Write property test for type-driven source picker selection
    - **Property 5: Type-driven source picker selection**
    - Generate random source arrays with various scopes + random session type
    - Assert filtered results match `scope === sessionType || scope === 'all'` in original order
    - Use fast-check, minimum 100 iterations
    - **Validates: Requirements 7.1, 7.2**

  - [x] 2.7 Write unit tests for SettingsStore changes
    - Test default sources are object[] format with correct scopes
    - Test legacy migration converts string[] to object[] with scope 'event'
    - Test privatePricePresets default is [60, 120, 150]
    - Test add/edit/delete sources in new format
    - All Supabase calls mocked
    - _Requirements: 7.4, 7.5, 7.6, 8.5_

- [x] 3. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 4. Session bar component
  - [x] 4.1 Add session bar HTML and CSS to index.html
    - Add `#session-bar` div with location, price, date spans and edit button
    - Implement flex layout with CSS overflow truncation on location
    - Price, date, edit icon get `flex-shrink: 0` (never compress)
    - Location gets `flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis`
    - No-session state: `opacity: 0.5` class on location text
    - Edit icon hidden when no session, touch target 44px minimum
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.6_

  - [x] 4.2 Implement `updateSessionBar()` method in SessionStore
    - No session: show "(no active session)" with `no-session` class, hide price/date/edit
    - Event: show "📍 {location}" + "· ${price}" + "· MM/DD"
    - Private: show "👤 {clientName}" + "· ${price}" + "· MM/DD"
    - Wire edit pencil click to open Session Sheet in edit mode
    - Tap on bar text area (non-edit-icon) performs no action
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 1.7_

  - [ ]* 4.3 Write property test for session bar display formatting
    - **Property 1: Session bar display formatting**
    - Generate random {type, location (0-200 chars), price (0.01-9999), date} tuples
    - Assert location element has correct emoji prefix ("📍" for event, "👤" for private)
    - Assert price element text matches "· $" + price pattern
    - Assert date element text matches "· MM/DD" pattern
    - Use fast-check, minimum 100 iterations
    - **Validates: Requirements 1.2, 1.3**

- [x] 5. Hamburger popup menu
  - [x] 5.1 Add hamburger menu HTML and CSS to index.html
    - Add `#btn-hamburger` button in header upper-left
    - Add `#hamburger-overlay` and `#hamburger-menu` divs
    - Four items: "New Event", "New Private Reading", "Load Session", "End Session"
    - Style as positioned popup (not full-screen drawer), z-index per hierarchy
    - Touch targets 44px minimum, fonts 16px+
    - _Requirements: 2.1, 2.3_

  - [x] 5.2 Implement hamburger menu methods in SessionStore
    - `toggleHamburgerMenu()` — show/hide popup + overlay
    - `closeHamburgerMenu()` — hide popup
    - `newEvent()` — close menu, open session sheet type=event
    - `newPrivateReading()` — close menu, open session sheet type=private
    - `showLoadSession()` — close menu, open existing load session sheet
    - "End Session" item disabled styling when `!this.hasValidSession`
    - Overlay click closes menu without triggering any action
    - _Requirements: 2.2, 2.4, 2.5, 2.6, 2.10, 2.11_

  - [x] 5.3 Implement `endSession()` method in SessionStore
    - Show confirmation dialog before clearing session
    - On confirm: clear sessionId, location, readings, type; update session bar to no-session state; hide readings section
    - On cancel: close dialog, no action
    - _Requirements: 2.7, 2.8, 2.9_

  - [ ]* 5.4 Write property test for end session clears all state
    - **Property 8: End session clears all state**
    - Generate random active session states with arbitrary valid fields
    - Call endSession confirm path
    - Assert sessionId is null, location empty, readings empty, bar shows no-session text
    - Use fast-check, minimum 100 iterations
    - **Validates: Requirements 2.8, 4.5**

  - [x] 5.5 Write unit tests for hamburger menu
    - Test menu contains exactly 4 items in correct order
    - Test "End Session" item has disabled class when no active session
    - Test overlay click closes menu
    - Test "New Event" opens session sheet with type=event
    - Test "New Private Reading" opens session sheet with type=private
    - All Supabase calls mocked
    - _Requirements: 2.3, 2.4, 2.5, 2.10, 2.11_

- [x] 6. Session creation/editing bottom sheet
  - [x] 6.1 Add session sheet HTML to index.html
    - Add overlay + sheet with header, dynamic fields container, save button
    - Follow existing sheet pattern (same as payment/source sheets)
    - Z-index: 2001 (sheets level)
    - _Requirements: 3.1, 3.2_

  - [x] 6.2 Implement `openSessionSheet(mode, type)` in SessionStore
    - Render fields dynamically based on type: event fields (Location, Date, Price number input) vs private fields (Client Name, Date, Price presets, Source toggles)
    - Event new: default price from most recent session (any type) or 40
    - Private new: price preset buttons from `privatePricePresets` setting; if empty, show free-form input
    - Private new: source toggles from sources with scope 'private' or 'all'; if none match, omit section
    - Edit mode: pre-fill all fields from current session, lock type (no type change)
    - Set sheet title: "New Event" / "New Private Reading" / "Edit Session"
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 6.3 Implement `saveSessionSheet()` with validation in SessionStore
    - Validate: location/client name must have ≥1 non-whitespace char, date must be valid
    - On invalid: apply visual error indicator (red border) to missing fields, prevent save, remain open
    - On valid: create or update session in DB (include type in payload), save to localStorage, dismiss sheet
    - Update session bar within 1 second of dismiss
    - Use `supabaseClient` for DB calls (not `supabase`)
    - _Requirements: 3.5, 3.6, 3.7, 3.8_

  - [x] 6.4 Implement `closeSessionCreationSheet()` in SessionStore
    - Hide sheet and overlay
    - Clear any error indicators
    - _Requirements: 3.5_

  - [ ]* 6.5 Write property test for session sheet pre-fill correctness
    - **Property 2: Session sheet pre-fill correctness**
    - Generate random session objects with valid fields
    - Call openSessionSheet in edit mode
    - Assert every field matches the input session value, type is locked
    - Use fast-check, minimum 100 iterations
    - **Validates: Requirements 1.5, 3.4**

  - [ ]* 6.6 Write property test for session validation rejects invalid input
    - **Property 6: Session validation rejects invalid input**
    - Generate whitespace-only strings → assert save prevented, error indicator shown
    - Generate strings with ≥1 non-whitespace char → assert validation passes
    - Use fast-check, minimum 100 iterations
    - **Validates: Requirements 3.7, 3.8**

  - [ ]* 6.7 Write property test for default price derivation
    - **Property 7: Default price derivation from session history**
    - Generate arrays of session objects with random prices (possibly empty)
    - Assert default price equals last session's reading_price, or 40 if empty
    - Use fast-check, minimum 100 iterations
    - **Validates: Requirements 3.1**

- [x] 7. Checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 8. Wire source picker to filter by session type scope
  - [x] 8.1 Update `openSourceSheet()` in ReadingsManager
    - Read unified sources from `window.settings.get('sources')`
    - Get session type from `window.session.type`
    - Filter: `sources.filter(s => s.scope === sessionType || s.scope === 'all')`
    - If filtered array is empty, show "No sources configured" message and disable selection
    - Render `sources.map(s => s.name)` as selectable options in original array order
    - Bump version
    - _Requirements: 7.1, 7.2, 7.3_

  - [x] 8.2 Write unit tests for source picker filtering
    - Test event session shows only event + all scoped sources
    - Test private session shows only private + all scoped sources
    - Test empty filtered result shows "no sources" message
    - Test source order preserved from settings array
    - All Supabase calls mocked
    - _Requirements: 7.1, 7.2, 7.3_

- [x] 9. Remove legacy event settings panel
  - [x] 9.1 Remove `#event-settings` HTML block from index.html
    - Remove `.settings-header`, `#settings-content`, `#session-summary`, and all child elements
    - Remove associated CSS rules for the collapsible panel
    - Verify session bar replaces the panel header position in DOM
    - _Requirements: 9.1_

  - [x] 9.2 Remove `toggleSettings`, `collapseSettings`, `expandSettings` from SessionStore
    - Delete method definitions from session-store.js
    - Remove any event listener bindings or onclick references to these methods
    - Update `updateUI()` to no longer reference `#event-settings` elements
    - _Requirements: 9.2, 9.4_

  - [x] 9.3 Clean up all remaining references to removed methods and DOM elements
    - Search codebase for `toggleSettings`, `collapseSettings`, `expandSettings`, `#event-settings`
    - Remove or update any remaining references in index.html, other modules, or tests
    - Ensure no runtime errors from dangling references
    - Bump version
    - _Requirements: 9.3, 9.4_

  - [x] 9.4 Move "Switch User" admin action to the profile menu
    - Add "Switch User" item to `#menu-user-profile` dropdown (above "Sign Out"), visible only to admin users
    - Wire onclick to call `session.showUserSelection()`
    - Ensure item is hidden for non-admin users (use same `auth.isAdmin()` check)
    - Remove the `#admin-user-display` section from the old event-settings panel (if not already removed in 9.1)
    - _Requirements: 9.3_

- [x] 10. SessionStore type property and persistence
  - [x] 10.1 Add `_type` property and getter/setter to SessionStore
    - Default to 'event'
    - Setter normalizes: only 'private' stays as 'private', everything else becomes 'event'
    - Setter calls `updateUI()` and `save()`
    - _Requirements: 5.4, 5.5, 5.6, 6.1_

  - [x] 10.2 Update `saveToLocalStorage()` to include type field
    - Serialize type alongside sessionId, location, sessionDate, price, readings
    - _Requirements: 5.7, 6.1_

  - [x] 10.3 Update `loadFromStorage()` to read and normalize type from localStorage
    - Read type field from stored state
    - If missing or invalid (not "event"/"private"), default to "event" and log to console
    - Configure source picker and price input mode based on restored type
    - _Requirements: 6.2, 6.3_

  - [x] 10.4 Update `createSession()` to accept and persist type parameter
    - Include `type` field in Supabase insert payload
    - Use `supabaseClient` for the insert call
    - _Requirements: 5.4_

  - [x] 10.5 Update `loadExistingSession()` to read type from DB record
    - Read type field from fetched session data
    - Normalize invalid values to "event"
    - Store in `_type` property
    - _Requirements: 5.5, 5.6_

  - [x] 10.6 Show impersonated user name in profile button
    - When admin is viewing as another user (impersonating), display that user's name below the admin's name in the profile button area
    - Show in smaller text or parentheses (e.g., "(as Amanda)")
    - Hidden when not impersonating (admin viewing own data)
    - Update on user switch via `showUserSelection()` flow

- [x] 11. App mode behavior — readings section visibility
  - [x] 11.1 Implement readings section show/hide logic based on session state
    - No active session: hide readings section (add button, totals, readings log)
    - Active session: show readings section
    - Timer section always visible regardless of session state
    - Wire to `updateUI()` so it triggers on session create, load, and end
    - On app load with persisted session: show readings section immediately
    - Bump version
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 4.6_

  - [x] 11.2 Write unit tests for app mode behavior
    - Test readings section hidden when no session
    - Test readings section visible when session active
    - Test timer visible in both modes
    - Test transition to active mode on session create
    - Test transition to no-session mode on end session
    - All Supabase calls mocked
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 12. Final checkpoint
  - Ensure all tests pass, ask the user if questions arise.

- [x] 13. Load Session sheet — type labels, filtering, and search
  - [x] 13.1 Add type badge, filter toggles, and search input to Load Session sheet
    - Add a search input (`#session-search`) above the sessions list with placeholder "Search sessions..."
    - Add filter toggle buttons below search: "All" (default active), "Events", "Private"
    - In each session tile, add a type badge using Font Awesome icons: `<i class="fas fa-store"></i> Event` or `<i class="fas fa-user"></i> Private` based on `sessionData.type`
    - Badge should be a small pill/tag in the session tile (e.g., after the date or in the details line)
    - Style filter buttons as toggle group (one active at a time), touch targets 44px
    - Add very light gray background to Load Session sheet to distinguish session cards
    - _No new requirements doc entry needed — enhancement to existing Load Session flow_

  - [x] 13.2 Implement filter and search logic in `showLoadSession()`
    - Store fetched sessions data in `this._loadedSessions` for client-side filtering
    - Add `filterLoadedSessions()` method that filters `_loadedSessions` by:
      - Type filter: 'all' shows everything, 'event' shows type=event, 'private' shows type=private
      - Search: case-insensitive substring match against location field
    - Re-render `sessionsList` innerHTML on every filter/search change
    - Wire search input `oninput` to `filterLoadedSessions()`
    - Wire filter button clicks to set active filter and call `filterLoadedSessions()`
    - Show "No matching sessions" message when filtered results are empty
    - Bump version

  - [x] 13.3 Write unit tests for Load Session filtering and search
    - Test type filter "event" shows only event sessions
    - Test type filter "private" shows only private sessions
    - Test type filter "all" shows both types
    - Test search filters by location substring (case-insensitive)
    - Test combined filter + search works correctly
    - Test empty results show "No matching sessions" message
    - Test type badge displays correct emoji for each type
    - All Supabase calls mocked

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation
- Property tests validate universal correctness properties from the design document
- Unit tests validate specific examples and edge cases
- All Supabase calls MUST be mocked in tests — no live DB interactions
- Bump version (index.html, README.md, development-rules.md) on every code change
- SQL migration file is run manually via Supabase SQL editor (not automated)
- Use `supabaseClient` variable name (not `supabase`) to avoid CDN conflict
- Touch targets 44px minimum, fonts 16px+ for mobile
- Z-index: sheets at 2001, overlays at 1999

## Task Dependency Graph

```json
{
  "waves": [
    { "id": 0, "tasks": ["1.1", "2.1"] },
    { "id": 1, "tasks": ["2.2", "2.5"] },
    { "id": 2, "tasks": ["2.3", "2.4", "2.6", "2.7"] },
    { "id": 3, "tasks": ["4.1", "5.1", "10.1"] },
    { "id": 4, "tasks": ["4.2", "5.2", "10.2", "10.3"] },
    { "id": 5, "tasks": ["4.3", "5.3", "10.4", "10.5"] },
    { "id": 6, "tasks": ["5.4", "5.5", "6.1", "10.6", "10.7"] },
    { "id": 7, "tasks": ["6.2", "6.3", "6.4"] },
    { "id": 8, "tasks": ["6.5", "6.6", "6.7"] },
    { "id": 9, "tasks": ["8.1"] },
    { "id": 10, "tasks": ["8.2", "9.1"] },
    { "id": 11, "tasks": ["9.2", "9.3", "9.4"] },
    { "id": 12, "tasks": ["11.1"] },
    { "id": 13, "tasks": ["11.2"] },
    { "id": 14, "tasks": ["13.1"] },
    { "id": 15, "tasks": ["13.2"] },
    { "id": 16, "tasks": ["13.3"] }
  ]
}
```
