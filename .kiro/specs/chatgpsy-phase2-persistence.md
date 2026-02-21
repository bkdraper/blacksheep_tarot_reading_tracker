# ChatGPSY Phase 2: Conversation Persistence & Error Handling

## Overview
Implement message persistence and robust error handling for the ChatGPSY AI assistant interface.

## Context
- ChatGPSY is an AI chat interface using AWS Bedrock Agent
- Current implementation: `modules/gpsy-chat.js`
- Bedrock provides 24-hour session persistence via sessionId
- Phase 1 (mobile UX basics) is complete

## Requirements

### #3: Message Persistence
**Priority**: Medium | **Effort**: Small

Store and restore conversation history across page reloads.

**Acceptance Criteria**:
- Store sessionId in localStorage when first message sent
- Restore conversation on page reload if sessionId exists
- Display all previous messages from Bedrock session
- Add "Clear Conversation" button to start fresh
- Clear localStorage when user clicks clear button
- Handle expired sessions gracefully (24h timeout)

**Technical Notes**:
- localStorage key: `gpsy_session_id`
- Bedrock maintains conversation context for 24 hours
- Use existing `sessionId` property in GpsyChat class
- Add method: `restoreConversation()`
- Add method: `clearConversation()`

### #5: Error Handling
**Priority**: Medium | **Effort**: Small

Provide user-friendly error messages and recovery options.

**Acceptance Criteria**:
- Display friendly error messages (not raw API errors)
- Show "Retry" button on failed requests
- Detect network offline status
- Handle 30-second timeout gracefully
- Show different messages for network vs server errors
- Log errors to console for debugging

**Error Types**:
- Network offline: "You're offline. Check your connection."
- Timeout: "Request timed out. Try again?"
- Server error: "Something went wrong. Please retry."
- Rate limit: "Too many requests. Wait a moment."

**Technical Notes**:
- Add method: `showError(message, canRetry)`
- Add retry button with onclick handler
- Use `navigator.onLine` for network detection
- Implement 30s timeout on fetch requests
- Store last failed message for retry

### #2: Typing Indicators (Optional Enhancement)
**Priority**: Low | **Effort**: Small

Show visual feedback during API calls.

**Acceptance Criteria**:
- Display "Gpsy is typing..." during API call
- Show animated dots (already implemented as thinking indicator)
- Replace with response when received
- Hide on error

**Technical Notes**:
- Already partially implemented via `showThinking()` method
- May just need to verify existing implementation works

## Implementation Plan

### Step 1: Message Persistence
1. Add localStorage methods to GpsyChat class
2. Store sessionId on first message
3. Implement restoreConversation() method
4. Add clear button to UI
5. Test across page reloads

### Step 2: Error Handling
1. Create error message templates
2. Add showError() method
3. Implement retry functionality
4. Add timeout to fetch calls
5. Test various error scenarios

### Step 3: Testing
- Test persistence across browser refresh
- Test with expired sessions (24h+)
- Test offline scenarios
- Test timeout scenarios
- Test retry functionality
- Verify error messages are user-friendly

## Files to Modify
- `modules/gpsy-chat.js` - Add persistence and error handling
- `index.html` - Add clear conversation button (if needed)
- `styles.css` - Style error messages and retry button

## Success Metrics
- Conversations persist across page reloads
- Error rate < 1%
- Users can recover from errors without losing context
- Clear feedback on all error states

## Dependencies
- None (standalone feature)

## Risks
- Bedrock session expiration handling
- localStorage quota limits (unlikely with text-only)
- Race conditions on rapid retry clicks

## References
- ROADMAP.md: Phase 2 details
- ARCHITECTURE.md: GpsyChat architecture
- modules/gpsy-chat.js: Current implementation
