# ChatGPSY UX Enhancement Roadmap

## Project Overview
Comprehensive UX improvements for ChatGPSY chat interface in the Tarot Reading Tracker app. Focus on mobile-first experience with quick wins first, then advanced features.

---

## Phase 1: Quick Wins (Mobile UX Basics)

### ✅ #11: Empty State
**Status**: COMPLETE
**Priority**: Critical
**Effort**: Small
- Empty state with 4 example queries
- Clickable examples that populate input
- Shows "Hi, I'm Gpsy. Ask me anything about your readings"
- Disappears after first message exchange

### #1: Input Feedback During Send
**Status**: NOT STARTED
**Priority**: Critical
**Effort**: Small
**Requirements**:
- Clear input field immediately when user hits send
- Disable input and send button during API call
- Show loading state (optional: spinner in button)
- Re-enable after response received

**Implementation**:
```javascript
// In sendGpsyMessage()
const input = document.getElementById('gpsyInput');
const sendBtn = document.querySelector('.gpsy-send-btn');
const message = input.value.trim();

if (message) {
    input.value = ''; // Clear immediately
    input.disabled = true;
    sendBtn.disabled = true;
    
    gpsyChat.sendMessage(message);
    
    // Re-enable after response (in sendMessage after hideThinking)
    input.disabled = false;
    sendBtn.disabled = false;
    input.focus();
}
```

### #4: Mobile Keyboard Handling
**Status**: NOT STARTED
**Priority**: High
**Effort**: Small
**Requirements**:
- Scroll input into view when keyboard opens
- Prevent input from being hidden behind keyboard
- Smooth scroll animation

**Implementation**:
```javascript
// Add to input element
document.getElementById('gpsyInput').addEventListener('focus', function() {
    setTimeout(() => {
        this.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 300); // Delay for keyboard animation
});
```

---

## Phase 2: Conversation Enhancements

### #3: Message Persistence
**Status**: NOT STARTED
**Priority**: Medium
**Effort**: Small
**Requirements**:
- Store sessionId in localStorage
- Leverage Bedrock's 24-hour session persistence
- Restore conversation on page reload
- Clear button to start fresh conversation

**Implementation**:
```javascript
// Store only sessionId
localStorage.setItem('gpsySessionId', this.sessionId);

// On page load
const savedSessionId = localStorage.getItem('gpsySessionId');
if (savedSessionId) {
    this.sessionId = savedSessionId;
}
```

### #2: Typing Indicators
**Status**: NOT STARTED
**Priority**: Low
**Effort**: Small
**Requirements**:
- Show "Gpsy is typing..." during API call
- Animated dots (already implemented as thinking indicator)
- Replace with response when received

**Note**: Already partially implemented with `showThinking()` method

### #5: Error Handling
**Status**: NOT STARTED
**Priority**: Medium
**Effort**: Small
**Requirements**:
- User-friendly error messages
- Retry button for failed requests
- Network status detection
- Timeout handling (30s)

---

## Phase 3: Advanced Features

### #8: Context Awareness
**Status**: NOT STARTED
**Priority**: High
**Effort**: Medium
**Agent Changes**: YES
**Requirements**:
- Inject current session data into prompts
- "Show me today's earnings" uses active session
- "How am I doing?" references current location/date
- Agent system prompt updates needed

### #13: Multi-Turn Context
**Status**: NOT STARTED
**Priority**: Medium
**Effort**: Small
**Agent Changes**: NO (already works via sessionId)
**Requirements**:
- Follow-up questions work naturally
- "What about Denver?" after "Show my top locations"
- Bedrock Agent maintains context via sessionId
- No code changes needed (verify it works)

### #6: Quick Actions
**Status**: NOT STARTED
**Priority**: Low
**Effort**: Medium
**Requirements**:
- Context-aware action chips below input
- "Today's total", "This weekend", "Best location"
- Update based on conversation context
- Implement `updateQuickActions()` method

### #7: Voice Input
**Status**: NOT STARTED
**Priority**: Low
**Effort**: Large
**Requirements**:
- Microphone button in input area
- Web Speech API integration
- Visual feedback during recording
- Fallback for unsupported browsers

---

## Phase 4: Data Visualization

### #9: Inline Charts
**Status**: NOT STARTED
**Priority**: Medium
**Effort**: Large
**Requirements**:
- Apache ECharts integration (300KB/100KB gzipped)
- Render charts in chat bubbles
- Mobile-optimized touch interactions
- Chart types: bar, line, pie

**Library**: Apache ECharts (recommended over Chart.js and uPlot)

### #10a: Sparklines
**Status**: NOT STARTED
**Priority**: Low
**Effort**: Medium
**Requirements**:
- Tiny inline trend indicators
- Show earnings trends in text responses
- Lightweight implementation (no heavy library)

---

## Phase 5: Polish & Refinement

### #12: Message Actions
**Status**: NOT STARTED
**Priority**: Low
**Effort**: Small
**Requirements**:
- Copy button for messages
- Share button for insights
- Regenerate button for responses

### #14: Conversation Management
**Status**: NOT STARTED
**Priority**: Low
**Effort**: Medium
**Requirements**:
- Clear conversation button
- Export conversation as text/PDF
- Conversation history (multiple sessions)

### #15: Accessibility
**Status**: NOT STARTED
**Priority**: Medium
**Effort**: Medium
**Requirements**:
- Screen reader support
- Keyboard navigation (Tab, Enter, Esc)
- ARIA labels for all interactive elements
- High contrast mode support

### #16: Performance
**Status**: NOT STARTED
**Priority**: Low
**Effort**: Small
**Requirements**:
- Lazy load old messages (virtual scrolling)
- Debounce input events
- Optimize re-renders
- Monitor bundle size

---

## Implementation Strategy

### Approach
1. **Ship features incrementally** - Don't wait for perfection
2. **Validate in production** - Get real user feedback early
3. **Refactor after validation** - Only modularize proven features
4. **Mobile-first always** - Test on real devices

### Refactoring Plan
**When**: After Phase 2 complete and validated in production
**Why**: Know which patterns to extract based on real usage
**How**: Extract GpsyChat into separate module, split CSS

### Agent Changes Required
Only 2 features need agent modifications:
- **#8: Context Awareness** - Inject session data into prompts
- **#13: Multi-Turn Context** - Already works, just verify

All other features are frontend-only!

---

## Progress Tracking

### Completed: 1/16 features (6%)
- ✅ #11: Empty State

### Phase 1 Remaining: 2 features
- #1: Input Feedback
- #4: Mobile Keyboard

### Total Remaining: 15 features

---

## Success Metrics

### Phase 1 Goals
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

## Notes

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

## Timeline Estimate

### Phase 1: 2-3 hours
- #1: Input Feedback (30 min)
- #4: Mobile Keyboard (30 min)
- Testing & polish (1-2 hours)

### Phase 2: 3-4 hours
- #3: Message Persistence (1 hour)
- #5: Error Handling (1 hour)
- #2: Typing Indicators (30 min)
- Testing (1-1.5 hours)

### Phase 3: 6-8 hours
- #8: Context Awareness (3-4 hours, includes agent work)
- #13: Multi-Turn Context (1 hour, verify only)
- #6: Quick Actions (2-3 hours)

### Phase 4: 8-10 hours
- #9: Inline Charts (6-8 hours, includes ECharts integration)
- #10a: Sparklines (2 hours)

### Phase 5: 6-8 hours
- Various polish features

**Total Estimate**: 25-33 hours

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
