# ChatGPSY Phase 3: Context Awareness & Quick Actions

## Overview
Make ChatGPSY context-aware by injecting current session data and implementing quick action buttons.

## Context
- ChatGPSY uses AWS Bedrock Agent for AI responses
- Chat Proxy Lambda: `blacksheep_tarot-tracker-bedrock-chat-proxy`
- Current implementation: `modules/gpsy-chat.js`
- Requires coordination with Lambda function changes

## Requirements

### #8: Context Awareness ⚠️ REQUIRES AGENT CHANGES
**Priority**: High | **Effort**: Medium

Inject current session data into prompts for context-aware responses.

**Acceptance Criteria**:
- "Show me today's earnings" uses active session automatically
- "How am I doing?" references current location/date
- User doesn't need to specify session details in queries
- Context injection happens transparently
- Works with both active and loaded sessions

**Context to Inject**:
```javascript
{
  user: sessionStore.user,
  location: sessionStore.location,
  sessionDate: sessionStore.sessionDate,
  readingCount: sessionStore.readings.length,
  totalEarnings: sessionStore.totalEarnings,
  sessionActive: sessionStore.hasValidSession
}
```

**Technical Notes**:
- Modify Chat Proxy Lambda to inject context
- Format: `[User context: ${userName}] [Session: ${location} on ${date}] ${userMessage}`
- Update Bedrock Agent system prompt to understand context format
- Add method: `buildContextualPrompt(message)`
- Test with various query types

**Lambda Changes Required**:
- Update `blacksheep_tarot-tracker-bedrock-chat-proxy-lambda.js`
- Accept session context in request body
- Prepend context to user message
- Deploy to Lambda

### #13: Multi-Turn Context
**Priority**: Medium | **Effort**: Small

Verify follow-up questions work naturally.

**Acceptance Criteria**:
- "What about Denver?" works after "Show my top locations"
- "And last month?" works after date-specific query
- Bedrock maintains conversation context
- No code changes needed (verify existing behavior)

**Technical Notes**:
- Bedrock Agent maintains context via sessionId
- Should work out of the box
- Test various follow-up patterns
- Document any limitations

### #6: Quick Actions
**Priority**: Low | **Effort**: Medium

Add context-aware action chips below input.

**Acceptance Criteria**:
- Show 3-4 quick action buttons below input
- Buttons update based on session state
- Clicking button sends query automatically
- Actions are contextually relevant

**Quick Action Examples**:
- Active session: "Today's total", "Reading count", "Best payment method"
- No session: "Top locations", "This month", "Best days"
- After query: "Show more", "Compare to last week", "Break down by source"

**Technical Notes**:
- Add method: `updateQuickActions(context)`
- Add HTML container: `<div class="gpsy-quick-actions">`
- CSS already exists: `.gpsy-quick-actions`, `.bedrock-suggestion`
- Update actions after each response
- Limit to 4 actions max for mobile

### #7: Voice Input (Future)
**Priority**: Low | **Effort**: Large

Add voice input capability (deferred to later phase).

**Acceptance Criteria**:
- Microphone button in input area
- Web Speech API integration
- Visual feedback during recording
- Fallback for unsupported browsers

**Technical Notes**:
- Use Web Speech API
- Add permission handling
- Show recording indicator
- Convert speech to text
- Send as normal message

## Implementation Plan

### Step 1: Context Awareness (Lambda)
1. Update Chat Proxy Lambda to accept session context
2. Modify prompt injection logic
3. Update Bedrock Agent system prompt
4. Deploy Lambda changes
5. Test context injection

### Step 2: Context Awareness (Frontend)
1. Add buildContextualPrompt() to GpsyChat
2. Pass session context in API calls
3. Test with various query types
4. Verify context improves responses

### Step 3: Multi-Turn Context
1. Test follow-up questions
2. Document working patterns
3. Document limitations
4. No code changes expected

### Step 4: Quick Actions
1. Add quick actions container to HTML
2. Implement updateQuickActions() method
3. Define action sets for different contexts
4. Add click handlers
5. Test on mobile

### Step 5: Testing
- Test context injection with active sessions
- Test without active session
- Test follow-up questions
- Test quick actions on mobile
- Verify touch targets (44px min)

## Files to Modify

### Frontend
- `modules/gpsy-chat.js` - Add context building and quick actions
- `index.html` - Add quick actions container
- `styles.css` - Verify quick action styles exist

### Backend (Lambda)
- `mcp-server/blacksheep_tarot-tracker-bedrock-chat-proxy-lambda.js` - Context injection
- `mcp-server/bedrock-agent-system-prompt.txt` - Update prompt

## Success Metrics
- Context-aware responses work 90%+ of time
- Users don't need to specify session details
- Quick actions used in 30%+ of sessions
- Follow-up questions work naturally

## Dependencies
- Phase 2 (persistence) should be complete first
- Lambda deployment access required
- Bedrock Agent configuration access

## Risks
- Context injection may confuse agent if not formatted correctly
- Quick actions may not fit on small screens
- Voice input browser compatibility issues

## References
- ROADMAP.md: Phase 3 details
- ARCHITECTURE.md: Chat Proxy Lambda architecture
- mcp-server/bedrock-agent-system-prompt.txt: Current prompt
