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
