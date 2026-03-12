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

### #2: Typing Indicators
**Priority**: Low | **Effort**: Small
- Show "Gpsy is typing..." during API call
- Animated dots (already implemented as thinking indicator)
- Replace with response when received

**Note**: Already partially implemented with `showThinking()` method

---

## Phase 3: Advanced Features
**Goal**: Context awareness and quick actions (6-8 hours)  
**Status**: 0/4 features complete

### #8: Context Awareness ⚠️ REQUIRES AGENT CHANGES
**Priority**: High | **Effort**: Medium
- Inject current session data into prompts
- "Show me today's earnings" uses active session
- "How am I doing?" references current location/date
- Agent system prompt updates needed

### #13: Multi-Turn Context
**Priority**: Medium | **Effort**: Small
- Follow-up questions work naturally
- "What about Denver?" after "Show my top locations"
- Bedrock Agent maintains context via sessionId
- No code changes needed (verify it works)

### #6: Quick Actions
**Priority**: Low | **Effort**: Medium
- Context-aware action chips below input
- "Today's total", "This weekend", "Best location"
- Update based on conversation context
- Implement `updateQuickActions()` method

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
**Status**: 7/8 modules complete

### ✅ Completed Modules
- `modules/session-store.js` - SessionStore class
- `modules/timer.js` - Timer class (~255 lines)
- `modules/gpsy-chat.js` - GpsyChat class
- `modules/settings-store.js` - SettingsStore class (~104 lines)
- `modules/utils.js` - Utility functions
- `modules/analytics-notifier.js` - AnalyticsNotifier class
- `modules/readings-manager.js` - ReadingsManager class

### Remaining
- Extract settings UI functions → `modules/settings-ui.js`

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

### ChatGPSY Features: 3/16 complete (19%)
- Phase 1: ✅ 3/3 complete
- Phase 2: 0/3 complete
- Phase 3: 0/4 complete
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

## Phase 6: Authentication & Database Normalization 🚧 IN PROGRESS
**Goal**: Add Google OAuth, normalize database schema, migrate to SQL-based queries  
**Status**: Infrastructure complete, implementation pending  
**Estimated Time**: 20-30 hours

### Database Infrastructure ✅ COMPLETE
- ✅ Created `blacksheep_reading_tracker_readings` table (normalized)
- ✅ Added `user_id` column to sessions table
- ✅ Created `blacksheep_reading_tracker_user_profiles` table (role-based access)
- ✅ Added indexes for efficient querying (payment_lower, source_lower, session_id, timestamp)

### Authentication Implementation
**Priority**: High | **Effort**: Large

#### Supabase Console Setup ✅ COMPLETE
- ✅ Enable Google OAuth provider in Supabase Auth settings
- ✅ Add authorized redirect URLs (localhost + production)
- ✅ Configure Google OAuth credentials (Client ID, Secret)

#### Frontend Changes (index.html)
- [x] Add Supabase Auth initialization
- [x] Add Google Sign-In button (in login prompt)
- [x] Add sign-out button (in user profile dropdown)
- [x] Check auth state on page load
- [x] Store user_id + role in memory at login
- [x] Display user's name from auth.user.user_metadata.full_name
- [x] Created `modules/auth.js` with Auth class (getters/setters, updateUI)
- [x] Added auth UI elements (profile button, login prompt)
- [x] Session controls hidden when not authenticated
- [x] Refactored SessionStore to remove user data storage (Auth is single source of truth)
- [x] SessionStore reads userId/userName from window.auth via getters
- [x] Deprecated old user selection methods (showUserSelection, selectUser, etc.)
- [ ] Remove deprecated user selection UI from index.html (userBtn, userSheet)
- [ ] Admin UI: Show user selector dropdown if role = 'admin'
- [ ] Admin UI: Allow viewing any user's data when admin

#### Data Migration
- [ ] Get Amanda's Google email address
- [ ] Have Amanda sign in with Google to generate her Supabase user_id
- [ ] Run migration script to update all Amanda's existing sessions with her user_id
- [ ] Migrate JSONB readings array to normalized readings table
- [ ] Set your user profile role to 'admin'

#### Backend Changes (server.js)
**Complete rewrite of all query logic from JSONB to SQL**

##### Tool Parameter Changes
- [ ] Update all MCP tools to accept `user_id` + `user_role` instead of `user_name`
- [ ] Add role-based filtering: if role !== 'admin', add `.eq('user_id', user_id)` to queries
- [ ] Keep returning `user_name` for display purposes

##### Query Architecture Overhaul
**Current (JSONB-based)**:
- Fetches sessions, iterates JSONB arrays in JavaScript
- Filters payment/source in JavaScript (case-insensitive `.toLowerCase()`)
- Calculates time_of_day in JavaScript
- Aggregates in JavaScript
- Day-of-week filtering in JavaScript

**New (SQL-based)**:
- Query `readings` table directly with JOINs
- Use SQL `ILIKE` for case-insensitive filtering
- Use SQL `EXTRACT(DOW FROM timestamp)` for day-of-week
- Use SQL `EXTRACT(HOUR FROM timestamp AT TIME ZONE 'tz')` for time_of_day
- Use SQL `COUNT()`, `SUM()`, `AVG()`, `GROUP BY` for aggregation

##### list_sessions Rewrite
- [ ] **Current**: Queries sessions, counts JSONB array length
- [ ] **New**: Query sessions with LEFT JOIN to count readings from readings table
- [ ] **SQL**: `SELECT s.*, COUNT(r.id) as readings_count FROM sessions s LEFT JOIN readings r ON s.id = r.session_id WHERE s.user_id = $1 GROUP BY s.id`

##### list_readings Rewrite
- [ ] **Current**: Fetches sessions, unpacks JSONB, filters in JS
- [ ] **New**: Query readings table directly with JOIN to sessions
- [ ] **SQL**: All filters (payment, source, date range, day_of_week) in WHERE clause using `ILIKE` and `EXTRACT()`
- [ ] **Example**: `SELECT r.*, s.location, s.session_date FROM readings r JOIN sessions s ON r.session_id = s.id WHERE s.user_id = $1 AND LOWER(r.payment) ILIKE LOWER($2)`

##### aggregate_readings Rewrite
- [ ] **Current**: Fetches sessions, unpacks JSONB, aggregates in JS
- [ ] **New**: Pure SQL aggregation with GROUP BY
- [ ] **SQL**: `SELECT COUNT(*), SUM(price + tip), AVG(price + tip) FROM readings r JOIN sessions s ON r.session_id = s.id WHERE s.user_id = $1 GROUP BY [time_of_day/location/date]`
- [ ] **Time of day**: Use `CASE WHEN EXTRACT(HOUR FROM timestamp AT TIME ZONE 'America/New_York') < 12 THEN 'morning' ...`

##### search_locations (No Change)
- [ ] **Current**: Queries sessions only
- [ ] **New**: Same (sessions table still has location)

#### Frontend Data Layer Changes
- [ ] Update SessionStore to write readings to normalized table
- [ ] Update ReadingsManager to insert into readings table instead of JSONB array
- [ ] Add reading deletion logic (DELETE FROM readings WHERE id = $1)
- [ ] Keep JSONB column temporarily for backward compatibility during migration

#### Bedrock Agent Updates
- [ ] Update all tool definitions to use `user_id` instead of `user_name`
- [ ] Update system prompt to reference new schema
- [ ] Update session attributes to include user_id and role
- [ ] Test all Gpsy queries with new schema

#### Lambda Deployment
- [ ] Deploy updated server.js to MCP Lambda (`blacksheep_tarot-tracker-mcp-server`)
- [ ] Deploy updated server.js to Bedrock Lambda (`blacksheep_tarot-tracker-bedrock`)
- [ ] Update Bedrock Agent configuration in AWS console
- [ ] Deploy frontend to Amplify (manual zip upload)

#### Testing Checklist
- [ ] Test Google sign-in flow
- [ ] Test Amanda can see her migrated data
- [ ] Test Amanda cannot see other users' data
- [ ] Test new sessions save with user_id
- [ ] Test readings write to normalized table
- [ ] Test admin (you) can see all users' data
- [ ] Test admin can switch between users in UI
- [ ] Test Gpsy chat works with authenticated user
- [ ] Test all MCP queries return correct data
- [ ] Test payment/source filtering is case-insensitive
- [ ] Test day-of-week filtering works
- [ ] Test time-of-day aggregation works
- [ ] Test sign out and re-authentication

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
