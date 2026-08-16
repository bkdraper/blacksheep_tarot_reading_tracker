# Tarot Tracker - Development Roadmap

## Overview
Consolidated roadmap for ChatGPSY UX improvements and code refactoring. Focus on mobile-first experience with incremental delivery.

---

## Phase 1: ChatGPSY Quick Wins ✅ COMPLETE
**Goal**: Mobile UX basics (2-3 hours)  
**Status**: 3/3 features complete

### ✅ #11: Empty State
- Empty state with 4 example queries
- Clickable examples that populate input
- Shows "Hi, I'm Gpsy. Ask me anything about your readings"
- Disappears after first message exchange

### ✅ #1: Input Feedback During Send
- Clear input field immediately when user hits send
- Disable input and send button during API call
- Re-enable after response received
- Auto-focus input after completion

### ✅ #4: Mobile Keyboard Handling
- Scroll input into view when keyboard opens
- Prevent input from being hidden behind keyboard
- Smooth scroll animation with 300ms delay

---

## Phase 2: Conversation Enhancements
**Goal**: Persistence and error handling (3-4 hours)  
**Status**: 0/3 features complete

### #3: Message Persistence
**Priority**: Medium | **Effort**: Small
- Store sessionId in localStorage
- Leverage Bedrock's 24-hour session persistence
- Restore conversation on page reload
- Clear button to start fresh conversation

### #5: Error Handling
**Priority**: Medium | **Effort**: Small
- User-friendly error messages
- Retry button for failed requests
- Network status detection
- Timeout handling (30s)

### ✅ #2: Typing Indicators
**Priority**: Low | **Effort**: Small
- Show "Gpsy is typing..." during API call
- Animated dots (already implemented as thinking indicator)
- Replace with response when received

**Note**: Already fully implemented via `showThinking()` method

---

## Phase 3: Advanced Features
**Goal**: Context awareness and quick actions (6-8 hours)  
**Status**: 3/4 features complete

### ✅ #8: Context Awareness
**Priority**: High | **Effort**: Medium
- Inject current session data into prompts
- "Show me today's earnings" uses active session
- "How am I doing?" references current location/date
- Agent system prompt updates needed

### ✅ #13: Multi-Turn Context
**Priority**: Medium | **Effort**: Small
- Follow-up questions work naturally
- "What about Denver?" after "Show my top locations"
- Bedrock Agent maintains context via sessionId
- No code changes needed (verify it works)

### ⚠️ #6: Quick Actions
**Priority**: Low | **Effort**: Medium
- Context-aware action chips below input
- "Today's total", "This weekend", "Best location"
- Update based on conversation context
- Implement `updateQuickActions()` method

**Note**: HTML container (`#gpsyQuickActions`) and CSS exist. The `updateQuickActions()` method is a stub (placeholder, returns without action). Not functionally complete.

### #7: Voice Input
**Priority**: Low | **Effort**: Large
- Microphone button in input area
- Web Speech API integration
- Visual feedback during recording
- Fallback for unsupported browsers

---

## Phase 4: Data Visualization
**Goal**: Charts and sparklines (8-10 hours)  
**Status**: 0/2 features complete

### #9: Inline Charts
**Priority**: Medium | **Effort**: Large
- Apache ECharts integration (300KB/100KB gzipped)
- Render charts in chat bubbles
- Mobile-optimized touch interactions
- Chart types: bar, line, pie

**Library Decision**: Apache ECharts (best mobile UX, beautiful defaults)

### #10a: Sparklines
**Priority**: Low | **Effort**: Medium
- Tiny inline trend indicators
- Show earnings trends in text responses
- Lightweight implementation (no heavy library)

---

## Phase 5: Polish & Refinement
**Goal**: Accessibility and performance (6-8 hours)  
**Status**: 0/4 features complete

### #12: Message Actions
**Priority**: Low | **Effort**: Small
- Copy button for messages
- Share button for insights
- Regenerate button for responses

### #14: Conversation Management
**Priority**: Low | **Effort**: Medium
- Clear conversation button
- Export conversation as text/PDF
- Conversation history (multiple sessions)

### #15: Accessibility
**Priority**: Medium | **Effort**: Medium
- Screen reader support
- Keyboard navigation (Tab, Enter, Esc)
- ARIA labels for all interactive elements
- High contrast mode support

### #16: Performance
**Priority**: Low | **Effort**: Small
- Lazy load old messages (virtual scrolling)
- Debounce input events
- Optimize re-renders
- Monitor bundle size

---

## Refactoring: Module Extraction
**Goal**: Reduce index.html from 3788 lines to < 2500 lines  
**Status**: 8/8 core modules complete (index.html now 876 lines)

### ✅ Completed Modules
- `modules/session-store.js` - SessionStore class
- `modules/timer.js` - Timer class (~255 lines)
- `modules/gpsy-chat.js` - GpsyChat class
- `modules/settings-store.js` - SettingsStore class (~104 lines)
- `modules/utils.js` - Utility functions
- `modules/analytics-notifier.js` - AnalyticsNotifier class
- `modules/readings-manager.js` - ReadingsManager class
- `modules/auth.js` - Auth class (Google OAuth, role-based access)

### Remaining (Optional)
- Extract app-update/notification/sync functions → `modules/app-lifecycle.js`
- index.html is already at 876 lines (well below target)

### Testing Checklist
- [ ] Timer starts/pauses/resets correctly
- [ ] Canvas animation works
- [ ] Audio alarms play
- [ ] Settings persist
- [ ] Session management works
- [ ] Gpsy chat functions
- [ ] All inline onclick handlers work

---

## Implementation Strategy

### Approach
1. **Ship features incrementally** - Don't wait for perfection
2. **Validate in production** - Get real user feedback early
3. **Refactor after validation** - Only modularize proven features
4. **Mobile-first always** - Test on real devices

### Agent Changes Required
Only 2 features need agent modifications:
- **#8: Context Awareness** - Inject session data into prompts
- **#13: Multi-Turn Context** - Already works, just verify

All other features are frontend-only!

---

## Progress Summary

### ChatGPSY Features: 7/16 complete (44%)
- Phase 1: ✅ 3/3 complete
- Phase 2: 1/3 complete
- Phase 3: 3/4 complete
- Phase 4: 0/2 complete
- Phase 5: 0/4 complete

### Refactoring: 7/8 complete (88%)
- Modules extracted: 7
- Remaining: Settings UI functions

### Total Estimated Time Remaining: 23-30 hours
- Phase 2: 3-4 hours
- Phase 3: 6-8 hours
- Phase 4: 8-10 hours
- Phase 5: 6-8 hours

---

## Version Strategy

### Stay on v3.x.x for:
- Internal refactoring (setters, method splitting)
- Bug fixes (localStorage sync, duplicate sessions)
- Security patches (XSS sanitization)
- Performance optimizations (debounced saves)
- UI improvements (offline badge, button consolidation)
- New features that don't break existing functionality

### Bump to v4.0.0 when:
- Complete Phase 3 (Context Awareness requires agent changes)
- Change data structure format (Reading/Session schema)
- Remove/rename public API methods
- Change localStorage key format (breaks existing user data)
- Modify Supabase table schema in incompatible way

---

## Success Metrics

### Phase 1 Goals ✅
- Zero errors on mobile keyboards
- Input never hidden by keyboard
- Clear feedback on every action

### Phase 2 Goals
- Conversations persist across sessions
- Error rate < 1%
- Follow-up questions work naturally

### Phase 3 Goals
- Context-aware responses work 90%+ of time
- Quick actions used in 30%+ of sessions

### Phase 4 Goals
- Charts render on mobile without lag
- Users engage with visual data

---

## Technical Notes

### File Size Constraint
- index.html is 170K+ characters
- Too large for automated editing tools
- Manual implementation required
- Document all changes for future reference

### CSS Already Present
All CSS for Phase 1-2 features already exists:
- `.gpsy-empty-state`
- `.gpsy-example-query`
- `.gpsy-quick-actions`
- `.bedrock-suggestion`
- Dark mode support throughout

### Testing Strategy
- Test each feature on real mobile device
- Verify keyboard behavior on iOS and Android
- Check dark mode compatibility
- Validate touch target sizes (44px minimum)

---

## Phase 6: Authentication & Database Normalization ✅ COMPLETE
**Goal**: Add Google OAuth, normalize database schema, migrate to SQL-based queries
**Status**: Complete as of v4.0.1

### Database Infrastructure ✅ COMPLETE
- ✅ Created `blacksheep_reading_tracker_readings` table (normalized)
- ✅ Added `user_id` column to sessions table
- ✅ Created `blacksheep_reading_tracker_user_profiles` table (role-based access)
- ✅ Added indexes for efficient querying (payment_lower, source_lower, session_id, timestamp)
- ✅ RLS policies on sessions and user_profiles tables
- ✅ Migrated all existing JSONB readings to normalized readings table
- ✅ Updated all existing sessions with Amanda's user_id

### Database Views & Functions ✅ COMPLETE
- ✅ `session_summaries` view — sessions LEFT JOIN readings, pre-aggregates readings_count, base_total, tips_total, total_earnings, avg_tip, avg_price, first/last reading time
- ✅ `readings_with_context` view — readings JOIN sessions, includes location, user_name, user_id, effective_price (COALESCE reading/session price), total_earnings, time_of_day_et (morning/afternoon/evening), hour_local_et, day_of_week_num, day_of_week_name
- ✅ `get_session_with_readings()` function — returns complete session + all readings in one RPC call
- ✅ `get_user_summary()` function — aggregate stats across sessions for a user with optional date range

### Authentication Implementation ✅ COMPLETE

#### Supabase Console Setup ✅ COMPLETE
- ✅ Enable Google OAuth provider in Supabase Auth settings
- ✅ Add authorized redirect URLs (localhost + production)
- ✅ Configure Google OAuth credentials (Client ID, Secret)

#### Frontend Changes ✅ COMPLETE
- ✅ Add Supabase Auth initialization
- ✅ Add Google Sign-In button (in login prompt)
- ✅ Add sign-out button (in user profile dropdown with profile picture)
- ✅ Check auth state on page load
- ✅ Store user_id + role in memory at login
- ✅ Display user's name from auth.user.user_metadata.full_name
- ✅ Created `modules/auth.js` with Auth class (getters/setters, updateUI, checkAuth, signIn, signOut)
- ✅ Added auth UI elements (profile button, login prompt)
- ✅ Session controls hidden when not authenticated
- ✅ Refactored SessionStore — Auth is single source of truth for userId/userName
- ✅ SessionStore reads userId/userName from window.auth via getters
- ✅ Deprecated old user selection methods (showUserSelection, selectUser, etc.)
- ✅ SessionStore writes readings to normalized table (addReading, removeReading, updateReading)
- ✅ SessionStore loads readings from normalized table (loadExistingSession)
- ✅ save() updates session metadata only — no JSONB writes
- ✅ Remove deprecated user selection UI from index.html (userBtn, userSheet)
- ✅ Admin UI: Show user selector dropdown if role = 'admin'
- ✅ Admin UI: Allow viewing any user's data when admin

### Backend Changes (server.js) ✅ COMPLETE
- ✅ Added v2 tools alongside legacy tools (parallel, no breaking changes)
- ✅ `list_sessions_v2` — queries `session_summaries` view
- ✅ `list_readings_v2` — queries `readings_with_context` view with full filter support (payment, source, date, tip range, time_of_day)
- ✅ `get_session_details_v2` — calls `get_session_with_readings()` RPC
- ✅ `get_user_summary_v2` — calls `get_user_summary()` RPC
- ✅ Deployed to both MCP Lambda and Bedrock Lambda

### Test Suite ✅ COMPLETE
- ✅ 223/223 tests passing across 8 suites
- ✅ jest.setup.js is single source of truth for Supabase mock (recursive eqChain)
- ✅ No inline global.supabaseClient replacements in any test file
- ✅ console.error/warn suppressed globally
- ✅ auth.test.js, integration.test.js, session-store.test.js fully updated for new architecture

### Bedrock Agent Updates COMPLETE
- Bedrock Agent action group updated to v2 tools only
- System prompt rewritten in XML format
- Gpsy chat fully operational as of v4.0.1

### Final Frontend & Deployment COMPLETE
- Deprecated user selection UI removed
- Admin UI implemented
- Frontend deployed to Amplify

### Architecture Decisions

#### Role-Based Access Control
- **Approach**: Client-side role check (acceptable risk for 2-3 user app)
- **Security**: User can fake role in browser, but can't fake user_id (from auth token)
- **Worst case**: User sees empty results because user_id filter still applies
- **Rationale**: Simplicity over enterprise-grade security for small internal app

#### User Name Storage
- **Approach**: Snapshot user_name in sessions table at creation time
- **Rationale**: Preserves historical accuracy (audit trail), no joins needed
- **Alternative rejected**: Single source of truth in profiles table (loses historical context)

#### Data Migration Strategy
- **Phase 1**: Add new tables, keep JSONB column
- **Phase 2**: Dual-write to both JSONB and normalized table
- **Phase 3**: Migrate historical data
- **Phase 4**: Switch queries to normalized table
- **Phase 5**: Drop JSONB column after verification

---

## Phase 6.5: Session UX Redesign ✅ COMPLETE
**Goal**: Replace collapsible Event Settings panel with session bar, hamburger menu, and bottom sheet
**Status**: Complete as of v4.1.4

### Session Bar ✅ COMPLETE
- ✅ Slim read-only bar showing location, price, date
- ✅ Emoji prefixes (📍 event, 👤 private)
- ✅ Edit pencil opens session sheet
- ✅ No-session state with opacity styling

### Hamburger Menu ✅ COMPLETE
- ✅ Four actions: New Event, New Private Reading, Load Session, End Session
- ✅ Confirmation dialog on End Session
- ✅ Disabled state when no active session

### Session Creation/Edit Sheet ✅ COMPLETE
- ✅ Bottom sheet with type-driven fields (event vs private)
- ✅ Validation with visual error indicators
- ✅ Edit mode pre-fills from current session
- ✅ Price presets for private readings

### Session Types ✅ COMPLETE
- ✅ Database `type` column with 'event'/'private' values
- ✅ Type-driven source filtering (scope: event/private/all)
- ✅ Type persistence in localStorage and Supabase
- ✅ Type badge in Load Session sheet

### Load Session Enhancements ✅ COMPLETE
- ✅ Search input for filtering by location
- ✅ Type filter toggles (All/Events/Private)
- ✅ Type badges with Font Awesome icons

### Legacy Panel Removal ✅ COMPLETE
- ✅ Removed #event-settings HTML and CSS
- ✅ Removed toggleSettings/collapseSettings/expandSettings methods
- ✅ Moved Switch User to profile menu (admin only)

### SettingsStore Updates ✅ COMPLETE
- ✅ Unified sources with scope (event/private/all)
- ✅ Legacy flat string[] migration
- ✅ Private price presets customization
- ✅ Sources customization UI with scope dropdowns

### Test Coverage ✅ COMPLETE
- ✅ 223 tests passing across 8 suites
- ✅ Unit tests for session bar, hamburger menu, session sheet, source filtering, app mode behavior

---

## Phase 7: Gpsy Enhancements
**Goal**: Improve Gpsy reliability, context awareness, and response quality
**Status**: 0/4 complete

### Multi-user support in Gpsy
- Admin can ask about other users' data via Gpsy
- Agent receives active user_id from frontend context

### Conversation persistence
- Store Bedrock sessionId in localStorage
- Restore conversation on page reload
- Clear button to start fresh

### Streaming responses
- Enable `streamFinalResponse: true` in InvokeAgent call (already supported by Bedrock Agents API)
- Update `proxy_lambda.js` to forward token chunks over SSE as they arrive instead of buffering
- Tool-call wait is still synchronous, but final answer streams token-by-token
- Users see text appearing within 1-2 seconds of model starting to respond instead of full buffer dump
- Infrastructure already in place (SSE + thinking indicator); this is the Lambda-side change
- AgentCore (newer service) supports full bi-directional streaming but is a bigger migration — evaluate after this ships

### User prompt appears immediately in chat
- Bug: User's message doesn't render in the chat thread until after Gpsy responds
- Fix: Append user bubble to DOM immediately on send (before the API call starts)
- Currently the prompt is likely batched with the response render cycle
- Should show: user bubble → thinking indicator → response bubble (sequential)
- Small fix in `modules/gpsy-chat.js` send flow

### Pre-computed totals in tool responses (HIGH PRIORITY)
- **Problem**: LLM receives individual readings and tries to sum prices/tips itself — gets it wrong (reported $527.50 when DB has $554.00, reported $538 when DB has $507)
- **Fix**: Tool responses should include pre-calculated `total_earnings`, `total_tips`, `reading_count` summary alongside individual readings
- **Approach**: When `list_readings_v2` returns results, append a `summary` object with aggregates computed DB-side
- **System prompt update**: Instruct agent "NEVER calculate totals yourself — always report the summary values returned by the tool"
- **Scope**: `list_readings_v2` response shape change + system prompt instruction
- **Why urgent**: If Gpsy returns wrong dollar amounts, users lose trust in the entire feature

### Response quality
- Audit system prompt against real query failures
- Add more example queries to empty state

---

## Phase 7.1: Session Format Field ⬅️ TOP PRIORITY
**Goal**: Add a `format` field to sessions to track *what kind* of event/private session it is
**Status**: 0/6 complete

### Problem Statement
"Phone" and "In-Person" are currently sources, but they're not *why* someone came — they're *what form* the session takes. Similarly, events have formats (expo, fair, shop, party, market, festival) that aren't captured anywhere. This is a missing dimension.

### Data Model
- `type` = broad bucket (event | private) — already exists
- `format` = what kind of session (expo, fair, shop, party, phone, in-person, video, etc.)
- `source` = why they came (referral, repeat, walk-up, POG, Renu) — stays as-is
- `location` = where

**DB column**: `format` (text, nullable, on sessions table)
**Scoped by type**: event formats vs private formats (same pattern as sources)

### Naming Decision (RESOLVED)
- **DB column**: `format`
- **UI label (event)**: "Kind of event"
- **UI label (private)**: "Kind of reading"
- **Settings section**: "Kinds" or "Kinds of events/readings"
- The word "format" stays internal (code/DB). Users see "kind".

### Tasks

#### Database
- [ ] Add `format` text column to sessions table (nullable, no default)
- [ ] Backfill existing sessions if obvious mappings exist (e.g., sessions with source "Phone" → format "phone")

#### SettingsStore
- [ ] Add `formats` setting with scoped objects: `{name, scope}` (same pattern as sources)
- [ ] Default event formats: Expo, Fair, Festival, Shop, Party, Market
- [ ] Default private formats: Phone, In-Person, Video
- [ ] Settings UI to manage formats (add/edit/delete with scope)
- [ ] Remove "Phone" and "In-Person" from default sources (they move to formats)

#### Session Sheet (UI)
- [ ] Add format selector to new event sheet (label: "What kind?" or similar)
- [ ] Add format selector to new private reading sheet
- [ ] Filter format options by session type (same as source filtering)
- [ ] Pre-fill format in edit mode
- [ ] Format is optional (nullable) — don't force selection

#### MCP Server
- [ ] Add `format` to v2 tool responses (list_sessions_v2, list_readings_v2, get_session_details_v2)
- [ ] Add `format` filter parameter to list_sessions_v2
- [ ] Update Bedrock Lambda action group schema with format field

#### Bedrock Agent
- [ ] Update system prompt to know about format field
- [ ] Update action group API schema
- [ ] Agent should be able to query/filter by format ("show me all my expo events")

#### Migration & Cleanup
- [ ] Move "Phone" and "In-Person" out of sources → formats
- [ ] Legacy migration: if user has old sources that are really formats, handle gracefully
- [ ] Update session bar display? (optional — could show format as subtle tag)

---

## Phase 7.2: Reading Labels & Session Management
**Goal**: Add optional name/label to readings; add session delete and session type switching
**Status**: 0/? complete

### Problem Statement
Amanda wants to label individual readings in private sessions (e.g., client name). Currently readings are just tip + payment + source — there's no way to identify who a private reading was for. The label defaults to the name entered when the private session is first created, so for single-client sessions it's zero extra taps.

Additionally, Amanda needs the ability to:
- **Delete a session** — accidentally created a private reading and had no way to remove it
- **Change session type** — switch between event and private after creation (e.g., made an event when it should have been private)

### Data Model
- New `label` text column on `blacksheep_reading_tracker_readings` (nullable, optional)
- Only relevant for private sessions (events have too many readings to label)
- Session delete: CASCADE delete readings when session is deleted
- Session type change: just update `type` column ('event' ↔ 'private') — no structural remapping needed

### UI — Reading Labels
- Text input field on the reading log entry (in the readings manager UI)
- Defaults to the client name entered when the private session was first created
- Editable per-reading (for multi-client private sessions, user can change it)
- Optional — can be left blank

### UI — Session Delete
- Add "Delete Session" option (in session edit sheet or hamburger menu)
- Confirmation dialog before delete (destructive action)
- Cascade deletes all readings under that session
- After delete: return to no-session state

### UI — Session Type Change
- Add type toggle/selector in session edit sheet
- Changing type updates the `type` column on the session record
- May need to clear or re-validate format (event formats ≠ private formats)
- Source filtering updates immediately after type change

### MCP / Bedrock Constraint
- `list_sessions_v2` already at 5 input params (Bedrock's limit)
- **Solution**: Replace individual filter params with a dynamic `search_by` approach
- Lambda constructs SQL dynamically based on field/value pairs
- Lambda does NOT download entire datasets and filter locally — all filtering is DB-side
- This pattern lets us add `label` (and any future field) without exceeding param limits

### Tasks (High Level)
- [ ] Add `label` text column to readings table (nullable)
- [ ] Update `readings_with_context` view to include label
- [ ] Add label input field to reading log UI (defaults to session client name)
- [ ] Persist label on addReading/updateReading
- [ ] Add session delete functionality (UI + Supabase CASCADE delete)
- [ ] Add session type change functionality (UI + Supabase update)
- [ ] Refactor `list_sessions_v2` to use dynamic search_by param (replaces individual filters)
- [ ] Refactor `list_readings_v2` similarly if needed
- [ ] Update Bedrock agent schema + system prompt for label awareness and new search pattern
- [ ] Update session details display to show labels when present

### Design Notes
- Full-stack feature: UI → SQL → Lambda → Agent (all layers touched)
- Dynamic search pattern: single JSON param like `search_by: { field: value, field: value }` or similar — keeps Bedrock under 5 params
- SQL construction must be parameterized (no injection risk)
- Backward compatible: existing queries with no search_by still work
- Session delete + type change are frontend-only features (no MCP/Bedrock needed)

---

## Phase 7.5: Cleanup — Remove Analytics & Notifications
**Goal**: Remove unused analytics/notifications system (Gpsy handles this on-demand)
**Status**: 0/1 complete

### Remove Analytics & Notifications
**Priority**: High | **Effort**: Small
- Remove "Analytics & Notifications" section from the settings drawer UI
- Remove timer-based analytic alerts from the service worker
- Remove or deprecate `modules/analytics-notifier.js`
- Remove associated tests (`__tests__/analytics-notifier.test.js`)
- Clean up any SettingsStore keys related to notification preferences
- **Rationale**: Never worked reliably, Amanda doesn't use them, Gpsy provides all analytics on-demand

---

## Phase 7.6: Cloud Settings Persistence
**Goal**: Sync user settings (formats, sources, payments, preferences) to a database table so they aren't only stored in localStorage on a single device
**Status**: 0/1 complete

### User Settings Cloud Sync
**Priority**: Medium | **Effort**: Medium
- Create a `user_settings` table (or column on `user_profiles`) to store serialized settings JSON per user
- On login, load settings from DB and merge with localStorage (DB wins on conflict)
- On settings change, persist to both localStorage (immediate) and DB (debounced)
- Handles the scenario where Amanda clears browser data or switches devices and loses all custom formats, sources, payment methods, etc.
- localStorage remains the fast local cache; DB is the durable source of truth
- Consider: conflict resolution strategy (last-write-wins is probably fine for single-user)

---

## Phase 7.7: Multi-Day Sessions & Reading Timestamps ✅ COMPLETE
**Goal**: Change sessions from single-date to start/end date range; derive per-day analytics from reading timestamps instead of session date
**Status**: Complete as of v4.6.7

### Problem Statement
Amanda now prefers creating one session for an entire weekend event (e.g., a 3-day Renaissance Faire) rather than a separate session per day. But per-day analytics must still work — "How was Friday vs Saturday?" needs to use the reading's own timestamp to determine which day it belongs to, not the session date.

This is full-stack: schema changes, frontend, MCP tools, Bedrock agent, and a data migration to collapse existing multi-day events (like Denver's 3 separate sessions) into single sessions with date ranges.

### Data Model Changes
- Replace `session_date` (single date) with `start_date` + `end_date` on sessions table
- Single-day sessions: `start_date == end_date`
- Multi-day events: `start_date < end_date` (e.g., Fri–Sun)
- Readings already have `timestamp` — this becomes the authoritative source for "which day" a reading happened
- MCP tools must use `reading.timestamp` (not session date) for per-day grouping/filtering

### Migration: Collapse Existing Multi-Session Events
- Identify sessions at the same location within consecutive days (e.g., 3 Denver sessions on Fri/Sat/Sun)
- Merge into one session: `start_date` = earliest date, `end_date` = latest date
- Move all readings from collapsed sessions under the surviving session
- Preserve reading timestamps (analytics still knows Fri vs Sat vs Sun)
- Delete the now-empty duplicate sessions
- Handle edge cases: sessions with different formats/types at same location (don't collapse those)

### Database
- [ ] Add `start_date` and `end_date` columns to sessions table
- [ ] Migrate existing `session_date` values → both `start_date` and `end_date` (single-day default)
- [ ] Run collapse migration for known multi-day events (Denver, etc.)
- [ ] Drop `session_date` column after migration verified
- [ ] Update `session_summaries` view to use `start_date`/`end_date`
- [ ] Update `readings_with_context` view — day-of-week derived from `reading.timestamp`, NOT session date
- [ ] Update `get_session_with_readings()` function
- [ ] Update `get_user_summary()` function if it references session_date

### Frontend
- [ ] Session sheet: replace single date picker with start/end date pickers
- [ ] Default: start_date = today, end_date = today (single-day behavior)
- [ ] Session bar: display date range when multi-day (e.g., "Jun 20–22")
- [ ] Session bar: display single date when start == end (current behavior)
- [ ] SessionStore: update save/load to use start_date/end_date
- [ ] Load Session sheet: display date ranges

### MCP Server & Bedrock Agent
- [ ] Update all v2 tools to return `start_date`/`end_date` instead of `session_date`
- [ ] Per-day analytics: group/filter by `reading.timestamp` date, NOT session date
- [ ] `list_sessions_v2`: support date range filtering against start_date/end_date
- [ ] `list_readings_v2`: day_of_week filter uses reading timestamp (already correct via view?)
- [ ] `aggregate_readings`: ensure grouping by day uses reading timestamp
- [ ] Update Bedrock action group schema
- [ ] Update Bedrock system prompt — explain multi-day sessions, reading timestamps = source of truth for day

### Test Updates
- [ ] Update session-store tests for start_date/end_date
- [ ] Update integration tests
- [ ] MCP server tests for new date range responses
- [ ] Migration verification tests (collapsed sessions have correct readings)

### Design Notes
- This is a breaking change to the session schema — warrants a major version bump (v5.0.0?)
- The collapse migration is one-time and irreversible — needs careful verification
- Per-day analytics become more accurate (reading timestamp > session date even for single-day sessions)
- Amanda's workflow: create session on Friday, keep using it all weekend, end on Sunday
- Offline queue must handle start_date/end_date in `update_session` messages
- MCP tools will likely need a full rewrite of `list_sessions_v2` and `list_readings_v2` — current tools already hit Bedrock's 5-parameter max, and multi-day sessions add more filter needs (start_date, end_date, format, day_of_week, etc.). Probably moving to a dynamic `search_by` JSON param pattern (same idea as Phase 7.2's approach) to stay under the limit

---

## Phase 7.8: Offline Queue (Operation-Message Sync) ✅ COMPLETE
**Goal**: Replace fragile snapshot-based localStorage sync with a proper FIFO operation-message queue
**Status**: Complete as of v4.5.0

### Problem Statement
The old approach saved full session state to localStorage on every change and ran a diff/reconcile cycle on reconnect. This was fragile (lost operation order), opaque (no way to inspect what needs syncing), and produced incorrect results when operations overlapped. The queue approach makes offline behavior predictable, ordered, and debuggable.

### Implementation ✅ COMPLETE
- ✅ Created `modules/offline-queue.js` — standalone OfflineQueue class exposed as `window.offlineQueue`
- ✅ Queue stores typed Operation_Messages in localStorage (`offlineQueue_{userId}`)
- ✅ Four message types: `insert_reading`, `update_reading`, `delete_reading`, `update_session`
- ✅ FIFO sequential replay on flush with stop-on-first-error
- ✅ Flush triggers: browser online event, service worker Background Sync, post-auth app load
- ✅ Concurrent flush guard (`_flushing` flag)
- ✅ 500-message cap with graceful quota error handling
- ✅ Per-user queue isolation
- ✅ UX snackbar indicators for all states (enqueue, syncing, success, failure)
- ✅ Dev-mode logging with `[OfflineQueue]` prefix
- ✅ `count()` and `peek()` for DevTools console debugging
- ✅ Removed legacy: `saveToLocalStorage`, `loadFromStorage`, `debouncedSaveToLocalStorage`, `promptRestoreSession`
- ✅ Removed legacy: `handleBackgroundSync`, `handleBackgroundBackup`, visibilitychange backup listener
- ✅ 409 tests across 13 suites — all passing

---

## Phase 8: Operations & Reliability
**Goal**: Protect production data and ensure operational health
**Status**: 0/3 complete

### Schema-Per-Environment (Dev/Test Isolation)
**Priority**: Low | **Effort**: Medium
- Create `dev` and `test` schemas alongside `public` (prod) in the same Supabase project
- Mirror table structures per schema for safe experimentation
- Use RPC wrappers to route supabase-js calls to the target schema (PostgREST defaults to `public`)
- RLS policies per schema for isolation
- **Why**: Allows running migrations, testing destructive operations, and validating changes without risking production data
- **Constraint**: supabase-js + PostgREST can't natively "point to" a non-public schema — RPC functions that `SET search_path` or explicitly reference `dev.table_name` are the cleanest workaround
- **Free plan note**: All schemas share the 500MB cap, so env tables should use minimal data (seed scripts, not full prod copies)
- **Approach**: Manual switch via RPC — no app-driven routing, no separate projects
- **Alternative considered**: Supabase Branches (full isolated DB instances per branch) — rejected because it requires Pro Plan ($25/mo minimum + per-branch compute costs). Schemas achieve the same goal for $0 on Free.

### Database Backup Strategy
**Priority**: High | **Effort**: Small (one-time setup, then recurring)
- Free plan has no downloadable backups — must self-manage
- Use `supabase db dump` CLI commands (split into roles, schema, data)
- Store dumps off-site (local disk, S3, or Google Drive)
- Storage bucket files NOT included in db dump — separate backup if needed
- Commands:
  ```
  supabase db dump --db-url "[CONNECTION_STRING]" -f roles.sql --role-only
  supabase db dump --db-url "[CONNECTION_STRING]" -f schema.sql
  supabase db dump --db-url "[CONNECTION_STRING]" -f data.sql --use-copy --data-only
  ```
- Consider: automate with a scheduled script or GitHub Action

### Supabase Keepalive
- ✅ Already have `.github/workflows/supabase-keepalive.yml`
- Free projects pause after 7 days of inactivity

---

## Decision Log

### Why Apache ECharts?
- Best mobile UX (touch interactions)
- Best visual polish
- 300KB/100KB gzipped (acceptable)
- Better than Chart.js (limited features) and uPlot (less polish)

### Why Refactor Later?
- Ship value faster
- Validate features in production first
- Know which patterns to extract
- Avoid premature optimization

### Why No Agent Changes for Most Features?
- Frontend-only features ship faster
- No backend coordination needed
- Easier to iterate and test
- Only 2 features need agent work (#8, #13)
