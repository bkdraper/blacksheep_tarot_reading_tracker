# Tarot Tracker - Dev Rules

## Version: v4.0.1
**CRITICAL**: Bump version on EVERY code change (cache-busting)

## Deployment
**CRITICAL - AMPLIFY IS MANUAL ZIP UPLOAD (NOT GIT-CONNECTED)**
- Frontend: Manual zip upload to AWS Amplify console
- Lambda: AWS CLI deployment commands (see below)
- System Prompt: Manual copy/paste to Bedrock Agent console

## Tech Stack
Pure HTML/CSS/JS, Supabase DB, localStorage backup, single-file deployment

## Core Classes
Auth, SessionStore, Timer, SettingsStore, GpsyChat, ReadingsManager, AnalyticsNotifier, Utils (all in modules/)

## Features Summary
- Google OAuth authentication (Supabase Auth)
- Role-based access control (admin/user)
- Session management (create, load, restore)
- Reading tracking (add, delete, tip entry)
- Payment methods (cash, cc, venmo, paypal, cashapp, custom)
- Source tracking (referral, renu, pog, repeat, custom)
- Canvas timer with audio alarms
- Gpsy AI chat (Bedrock Agent integration)
- Multi-user support (DB-driven)
- Report generation with date ranges
- PWA with service worker

## Data Structure (DO NOT BREAK)
```javascript
Reading: {timestamp, tip, price, payment, source}
Session: {sessionId, user, location, sessionDate, price, readings, _loading}
```

## Critical Bugs to Avoid

### Timezone Hell
- Use raw YYYY-MM-DD strings for display
- NEVER convert through Date() without normalizing
- Normalize: YYYY-MM-DD → MM/DD/YYYY before Date()
- YYYY-MM-DD creates UTC dates, MM/DD/YYYY creates local

### Session Loading
- `_loading` flag MUST prevent saves during restoration
- Null reading price uses session price as fallback
- Empty date strings cause 400 errors - validate first

### Variable Naming
- Avoid CDN conflicts: use `supabaseClient` not `supabase`

### DOM Manipulation
- Suggestion buttons: Attach onclick AFTER DOM insertion
- HTML lists: Use `<ul><li>` with classes, NEVER bullet chars (•)

### Mobile Overrides
- Touch targets: 44px min
- Fonts: 16px+ (prevents zoom)
- Use `!important` when mobile browsers override styles
- Tip inputs: 70px with !important

## Lambda Deployment

### Bedrock Lambda (action group handler)
```bash
aws lambda update-function-code \
  --function-name blacksheep_tarot-tracker-bedrock \
  --zip-file fileb://lambda.zip \
  --region us-east-2
```
Handler: `bedrock_lambda.handler` | Powers Gpsy tool calls.

### MCP Lambda (Amazon Q IDE integration)
```bash
aws lambda update-function-code \
  --function-name blacksheep_tarot-tracker-mcp-server \
  --zip-file fileb://lambda.zip \
  --region us-east-2
```
Handler: `mcp_lambda.handler` | Powers @reading_tracker in Amazon Q.

### Chat Proxy Lambda (Gpsy web chat interface)
```bash
aws lambda update-function-code \
  --function-name blacksheep_tarot-tracker-bedrock-chat-proxy \
  --zip-file fileb://lambda.zip \
  --region us-east-2
```
Handler: `proxy_lambda.handler` | Powers ChatGPSY in web app.

### All three (always deploy all three together)
```bash
aws lambda update-function-code --function-name blacksheep_tarot-tracker-bedrock --zip-file fileb://lambda.zip --region us-east-2
aws lambda update-function-code --function-name blacksheep_tarot-tracker-mcp-server --zip-file fileb://lambda.zip --region us-east-2
aws lambda update-function-code --function-name blacksheep_tarot-tracker-bedrock-chat-proxy --zip-file fileb://lambda.zip --region us-east-2
```
Bedrock Agent ID: 0LC3MUMHNN | Alias: 3T7P4GYJYK (v39)

## mcp-server File Structure
- `mcp_lambda.js`: MCP Lambda handler (`mcp_lambda.handler`)
- `bedrock_lambda.js`: Bedrock action group Lambda handler (`bedrock_lambda.handler`)
- `proxy_lambda.js`: Chat proxy Lambda handler (`proxy_lambda.handler`)
- `server.js`: Core tool logic (v2 tools hit normalized DB views)
- `test-e2e.mjs`: End-to-end handler test (31 assertions, run before deploy)
- `test-tools.js`: Quick v2 tool smoke test
- `test-thorough.js`: Deep regression test for v2 tools
- `docs/BEARER-TOKEN-SETUP.md`: Bearer token setup guide
- `docs/ONE-TIME-CONFIG.md`: One-time configuration guide

## Reference Docs
- Architecture/deployment: See docs/ARCHITECTURE.md
- Version history: See docs/CHANGELOG.md
- User guide: See docs/README.md
