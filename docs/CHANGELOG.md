# Changelog

## v4.3.2 - Load Session: Search, Filters & Type Badges
- Added search input to Load Session sheet for filtering by location (case-insensitive)
- Added type filter toggle buttons (All / Events / Private) with one-active-at-a-time behavior
- Added type badges to session tiles using Font Awesome icons (fa-store for Event, fa-user for Private)
- Stored fetched sessions in `_loadedSessions` for client-side filtering
- Added `filterLoadedSessions()` method combining type filter + search
- Shows "No matching sessions" when filtered results are empty
- Light gray background on Load Session sheet to distinguish session cards
- Unit tests for filtering, search, combined filter+search, badge display

## v4.3.1 - Impersonation Display & Switch User in Profile Menu
- Admin impersonation now shows "(as Username)" below profile button when viewing another user's data
- Moved "Switch User" from legacy event settings panel to profile dropdown menu (admin-only)
- Switch User item hidden for non-admin users (same `auth.isAdmin()` check)
- Updates on user switch via `showUserSelection()` flow

## v4.3.0 - Legacy Event Settings Panel Removal
- Removed entire `#event-settings` HTML block and associated CSS
- Removed `toggleSettings`, `collapseSettings`, `expandSettings` methods from SessionStore
- Removed all event listener bindings and onclick references to removed methods
- Updated `updateUI()` to no longer reference `#event-settings` elements
- Cleaned all remaining references across codebase (no runtime errors from dangling refs)

## v4.2.9 - Source Picker Type-Driven Filtering
- Updated `openSourceSheet()` in ReadingsManager to filter by session type scope
- Sources filtered: `scope === sessionType || scope === 'all'`
- Empty filtered result shows "No sources configured" message
- Source order preserved from settings array
- Unit tests for event/private/empty filtering scenarios

## v4.2.8 - App Mode Behavior (Readings Section Visibility)
- No active session: readings section hidden (add button, totals, readings log)
- Active session: readings section visible
- Timer section always visible regardless of session state
- Wired to `updateUI()` — triggers on session create, load, and end
- On app load with persisted session: show readings section immediately
- Unit tests for mode transitions

## v4.2.7 - SessionStore Type Property & Persistence
- Added `_type` property with getter/setter (default 'event')
- Setter normalizes: only 'private' stays, everything else → 'event'
- Updated `saveToLocalStorage()` to include type field
- Updated `loadFromStorage()` to read/normalize type from localStorage
- Updated `createSession()` to accept and persist type parameter
- Updated `loadExistingSession()` to read type from DB record
- Invalid type values default to 'event' with console log

## v4.2.6 - End Session & Hamburger Menu Tests
- Implemented `endSession()` with confirmation dialog
- On confirm: clears sessionId, location, readings, type; updates bar; hides readings
- On cancel: closes dialog, no action
- Unit tests: menu item order, disabled state, overlay close, action routing

## v4.2.5 - Hamburger Popup Menu
- Added `#btn-hamburger` in header upper-left
- Four menu items: New Event, New Private Reading, Load Session, End Session
- Positioned popup (not full-screen drawer) with overlay
- `toggleHamburgerMenu()`, `closeHamburgerMenu()`, action methods
- End Session disabled when no active session
- Overlay click closes without triggering actions
- Touch targets 44px, fonts 16px+

## v4.2.4 - Session Creation/Editing Bottom Sheet
- Added session sheet HTML (overlay + sheet + dynamic fields + save button)
- `openSessionSheet(mode, type)` renders fields dynamically by type
- Event: Location, Date, Price input; Private: Client Name, Date, Price presets, Source toggles
- Edit mode pre-fills from current session, locks type
- `saveSessionSheet()` with validation (≥1 non-whitespace char, valid date)
- Visual error indicators (red border) on invalid fields
- `closeSessionCreationSheet()` hides sheet and clears errors

## v4.2.3 - Session Bar Component
- Added `#session-bar` with location, price, date spans and edit button
- Flex layout with CSS overflow truncation on location
- No-session state: opacity 0.5, hides price/date/edit
- Event: "📍 {location}" · ${price} · MM/DD
- Private: "👤 {clientName}" · ${price} · MM/DD
- Edit pencil opens session sheet in edit mode
- `updateSessionBar()` method in SessionStore

## v4.2.2 - SettingsStore Sources Customization & Private Presets
- Sources settings UI with scope dropdowns (Event/Private/All)
- Private price presets customization UI (add/edit/delete)
- `showPrivatePricePresetsSheet()`, `updatePrivatePricePreset()`, etc.
- Removed `toggleSettings` and `collapseSettings` wrapper methods

## v4.2.1 - SettingsStore Unified Sources & Migration
- Refactored sources default from string[] to object[] with `{name, scope}`
- Default sources: Referral (event), Renu (event), POG (event), Repeat (all), Phone (private), In-Person (private)
- Added `privatePricePresets` default: [60, 120, 150]
- `migrateSources()` converts legacy flat arrays to scoped objects
- Unit tests for defaults, migration, add/edit/delete

## v4.2.0 - Session UX Redesign Begins (DB Migration)
- Added `type` text column to `blacksheep_reading_tracker_sessions`
- DEFAULT 'event', backfilled existing rows, NOT NULL constraint
- No CHECK constraint (per design spec)
- SQL migration file for manual execution in Supabase SQL editor

## v4.1.4 - Bedrock Model Migration (Haiku 3.5 → 4.5)
- Migrated Bedrock Agent from Claude Haiku 3.5 (deprecated) to Claude Haiku 4.5
- Must use US inference profile — bare model ID and "Global inference" both fail with 403
- Haiku 4.5 requires AWS Marketplace auto-subscription (needs `aws-marketplace:Subscribe` IAM permission)
- Added `AWSMarketplaceManageSubscriptions` policy to `serverless-admin` IAM user
- Agent alias 3T7P4GYJYK updated to version 42 (Haiku 4.5 US inference)
- No code changes required — proxy_lambda.js agent/alias IDs unchanged
- Pricing: ~$1.00/million input, $5.00/million output (25% more than Haiku 3.5)

## v4.0.1 - Gpsy Lambda Chain Fix & mcp-server Cleanup
- Fixed Gpsy AI chat broken since v4.0.0 day_of_week changes
- Root cause: `bedrock.js` (actual Lambda entrypoint `bedrock.handler`) was never updated - all fixes were going to `bedrock-handler.js` which was never in the call chain
- Fixed `responseState: 'SUCCESS'` - not a valid Bedrock value, caused deserialization errors on every tool response
- Fixed `body` variable scoped inside `try` block in proxy - caused `ReferenceError` in catch handler
- Removed REPROMPT guard on missing `user_name` - Bedrock agent passes `user_id` not `user_name`, so every 2nd+ tool call was getting REPROMPT and returning empty
- Added `sessionUserCache` to inject `user_id` on 2nd+ tool calls when `promptSessionAttributes` is empty (Bedrock only populates it on first call per turn)
- Renamed Lambda files: `index.js` → `mcp_lambda.js`, `bedrock.js` → `bedrock_lambda.js`, `blacksheep_tarot-tracker-bedrock-chat-proxy-lambda.js` → `proxy_lambda.js`
- Updated all three Lambda handler configs in AWS (`mcp_lambda.handler`, `bedrock_lambda.handler`, `proxy_lambda.handler`)
- Added full decision-point logging to `bedrock_lambda.js`, `proxy_lambda.js`, and all v2 methods in `server.js`
- Removed 10 extraneous files: `mcp-handler.js`, `deprecated-bedrock-handler.js`, 4 stale test files, `test-body.json`, `proxy-package.json`, temp log files
- Renamed test files: `test-e2e-bedrock.mjs` → `test-e2e.mjs`, `test-v2-tools.js` → `test-tools.js`, `test-v2-thorough.js` → `test-thorough.js`
- Added `test-e2e.mjs` - full end-to-end test simulating FE → Proxy → Agent → Lambda including warm-instance multi-call scenario (31 assertions)

## v3.99.9 - Profile Menu & RLS Policies
- Changed profile button from direct logout to dropdown menu
- Added profile menu with "Sign Out" option
- Profile button displays Google profile picture (avatar_url) if available
- Falls back to Font Awesome user icon if no profile picture
- Added Auth.toggleProfileMenu() method to show/hide dropdown
- Profile menu closes when clicking outside
- Added RLS policies to user_profiles table (enable RLS, allow authenticated reads)
- Fixed infinite recursion in admin RLS policy (simplified to single policy)
- Admin users see user switcher button in Event Settings
- Regular users do not see user switcher button (UI-level restriction)
- Added CSS for profile picture (.user-profile-pic) and dropdown menu (.profile-menu)
- Auth.updateUI() now manages profile picture visibility and menu state

## v3.99.8 - Gpsy Personality & Prompt Optimization
- Refactored Bedrock Agent system prompt for clarity and conciseness (~57% reduction)
- Added personality section: Gpsy is now a "friendly companion" not just a reporting tool
- Improved tone with warm, conversational language ("that's a solid day!" vs "total earnings")
- Strengthened tool-first approach: check for tools before calculating anything
- Enhanced day-of-week query handling with explicit examples (use `day_of_week` filter)
- Consolidated repetitive formatting rules into single authoritative sections
- Added pre-response checklist for accuracy (11 verification points)
- Updated suggestion buttons to be more conversational ("Show me..." vs terse commands)
- Added "Common Mistakes" section with side-by-side wrong/correct examples
- Emphasized HTML-only output (no plain text, RTF, or markdown)
- Reinforced list formatting rules (never use bullet characters •, -, *)
- Added warmth check to response validation
- Improved template examples with encouraging language

## v3.99.7 - Chat Proxy Lambda Improvements
- Added structured JSON logging to Chat Proxy Lambda (REQUEST, SUCCESS, ERROR types)
- Increased Chat Proxy timeout from 30s to 120s for complex queries
- Added CloudWatch Logs URL to documentation
- Documented Bedrock's lack of real streaming (buffers entire response)
- Added request tracking with requestId, duration, chunkCount, totalBytes
- Improved error logging with stack traces and AWS response details
- Created comprehensive Lambda architecture documentation

## v3.99.6 - ChatGPSY HTML Validation
- Centralized all DOM synchronization in updateUI() as single source of truth
- Removed direct DOM updates from setters (user, location, sessionDate, price)
- Setters now only update internal state and call updateUI()
- updateUI() reads private vars and updates DOM with conditional checks
- Eliminates duplication between setters and updateUI()
- Prevents potential circular update issues
- All 148 tests pass

## v3.99.4 - SessionStore Refactoring & Security
- Refactored SessionStore to consistently use setters for all state changes
- Split save() into save() (localStorage + DB) and saveToLocalStorage() (localStorage only)
- Fixed bug where localStorage wasn't updated when loading existing sessions
- Improved user setter and startOver() to use setters with _loading flag to prevent cascading saves
- Added Utils.sanitize() method to prevent XSS attacks (removes <, >, ; characters)
- Applied sanitization to loadUsers(), showLoadSession(), updateReadingsList()
- Added offline indicator badge in header with red "Offline" display
- Added updateOnlineStatus() function to monitor network changes and trigger sync
- Fixed createSession() to check for duplicates BEFORE insert attempt (not after)
- Added double confirmation to startNewSession() to prevent accidental data loss
- Fixed selectSession() to accept (sessionId, event) parameters explicitly
- Removed redundant test notification code from createSession()
- Network optimization: loadExistingSession() now only updates localStorage, avoiding redundant DB write

## v3.99.3 - CSS Button Consolidation
- Created base button system with `.btn` class and modifiers
- Added button variants: `btn-primary`, `btn-secondary`, `btn-danger`, `btn-ghost`, `btn-link`
- Added size modifiers: `btn-small`, `btn-large`, `btn-xlarge`
- Consolidated ~150 lines of duplicate CSS into reusable classes
- Updated all buttons in HTML and JS modules to use new classes
- Maintained backward compatibility with existing functionality

## v3.99.2 - ID Convention Implementation
- Added IDs to all unique buttons following {type}-{area}-{purpose} convention
- Added IDs to all unique containers following same convention
- Examples: btn-readings-add, btn-timer-start, container-readings-buttons
- IDs are additive (existing classes unchanged) for backward compatibility
- No functional changes, all 60 tests pass

## v3.99.1 - Session Creation UI Bug Fix
- Fixed bug where Add Reading and Delete Reading buttons disappeared after creating new session
- Added `updateUI()` call after successful session creation in SessionStore
- Added comprehensive DOM tests to verify button visibility across all session phases
- Added test for createSession flow that validates UI state changes
- Tests now check for presence/absence of UI elements (buttons, totals, readings list)

## v3.99.0 - Utils Module Extraction
- Extracted Utils class to `modules/utils.js`
- Removed ~100 lines of duplicate utility functions from index.html
- All utility functions now sourced from Utils module
- Integrated AnalyticsNotifier module for analytics notifications
- Reduced index.html from 1153 to 1053 lines (9% reduction)
- Modules export classes to window, index.html instantiates and exposes instances

## v3.97.0 - Code Modularization
- Extracted Timer class to `modules/timer.js`
- Extracted SettingsStore class to `modules/settings-store.js`
- Moved timer functions from index.html to Timer module
- Moved settings drawer functions to SettingsStore module
- Updated HTML onclick handlers to use module methods
- Removed duplicate functions from index.html
- Improved code organization and maintainability

## v3.96.0 - Icon Cleanup
- Removed cluttered icons from Reading Price, Event Name, Event Date labels
- Changed user icon from fa-user (\f007) to fa-id-card (\f2bd)
- Replaced Font Awesome icons in session list with bullet character (•)
- Kept icons in totals table for visual hierarchy
- User icon managed via CSS ::before pseudo-element

## v3.95.0 - Previous Version
(Add previous version notes here as needed)

## Version Management Rules
- **CRITICAL**: Version MUST be bumped on every code change
- Version displayed in header bar for cache-busting
- Update version in: index.html, docs/README.md, .amazonq/rules/tarot-tracker-rules.md, .kiro/steering/development-rules.md
