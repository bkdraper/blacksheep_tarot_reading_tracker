# Tarot Tracker - Dev Rules

## Version: v3.99.9
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

### MCP Lambda (PRIMARY - Amazon Q IDE integration)
```bash
aws lambda update-function-code \
  --function-name blacksheep_tarot-tracker-mcp-server \
  --zip-file fileb://lambda.zip \
  --region us-east-2
```
Powers @reading_tracker in Amazon Q. Deploy here for tool improvements/fixes.

### Bedrock Lambda (Gpsy web chat interface)
```bash
aws lambda update-function-code \
  --function-name blacksheep_tarot-tracker-bedrock \
  --zip-file fileb://lambda.zip \
  --region us-east-2
```
Powers ChatGPSY in web app. Deploy here for Bedrock-specific changes.

### Both (when changing server.js core logic)
```bash
# MCP first
aws lambda update-function-code --function-name blacksheep_tarot-tracker-mcp-server --zip-file fileb://lambda.zip --region us-east-2

# Then Bedrock
aws lambda update-function-code --function-name blacksheep_tarot-tracker-bedrock --zip-file fileb://lambda.zip --region us-east-2
```

## Reference Docs
- Architecture/deployment: See ARCHITECTURE.md
- Version history: See CHANGELOG.md
- User guide: See README.md
