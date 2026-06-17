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
- Bedrock Agent currently buffers entire response before sending
- Infrastructure already in place (SSE), waiting on AWS streaming support

### Response quality
- Audit system prompt against real query failures
- Add more example queries to empty state

---

## Phase 8: Operations & Reliability
**Goal**: Protect production data and ensure operational health
**Status**: 0/2 complete

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
