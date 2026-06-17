---
inclusion: auto
description: Core development rules, deployment commands, data structures, and testing constraints
---

# Development Rules

## Version: v4.3.2

CRITICAL: Bump version on EVERY code change (cache-busting). Update version in: index.html, README.md, and this file.

## Tech Stack

Pure HTML/CSS/JS (no frameworks), Supabase PostgreSQL, localStorage backup, AWS Amplify hosting, AWS Lambda + Bedrock for AI chat.

## Core Classes

All in `modules/`:
- `auth.js` — Google OAuth via Supabase Auth, role-based access (admin/user)
- `session-store.js` — Session state, cloud sync, normalized readings table
- `timer.js` — Canvas countdown, Web Audio alarms, Wake Lock
- `gpsy-chat.js` — AI chat interface, HTML rendering, suggestion buttons
- `settings-store.js` — App preferences, payment methods, dark mode
- `readings-manager.js` — Reading CRUD, payment/source sheet UI
- `analytics-notifier.js` — Daily summaries, trend alerts
- `utils.js` — Date normalization, toast notifications, haptic feedback

## Critical Rules

### Timezone Handling
- Use raw YYYY-MM-DD strings for display
- NEVER convert through Date() without normalizing
- Normalize: YYYY-MM-DD → MM/DD/YYYY before Date()
- YYYY-MM-DD creates UTC dates, MM/DD/YYYY creates local

### Session Loading
- `_loading` flag MUST prevent saves during restoration
- Null reading price uses session price as fallback
- Empty date strings cause 400 errors — validate first

### Variable Naming
- Use `supabaseClient` not `supabase` (CDN conflict)

### DOM Manipulation
- Suggestion buttons: attach onclick AFTER DOM insertion
- HTML lists: use `<ul><li>` with classes, NEVER bullet chars (•)
- All currency: `<span class="bedrock-currency">$X</span>`
- Tables: `<table class="bedrock-table">` structure
- Wrap AI responses: `<div class="bedrock-response">`

### Mobile Overrides
- Touch targets: 44px minimum
- Fonts: 16px+ (prevents zoom)
- Use `!important` when mobile browsers override styles
- Tip inputs: 70px with !important

### Auth Architecture
- Auth module is single source of truth for userId and userName
- SessionStore reads from window.auth via getters (never stores user data)
- User can fake role in browser but can't fake user_id (from auth token)
- user_name is snapshot in sessions table at creation time (preserves history)

## Data Structures (DO NOT BREAK)

```javascript
// Reading (in-memory + normalized DB table)
{ id, timestamp, tip, price, payment, source }

// Session State
{ sessionId, location, sessionDate, price, readings, _loading }
// userId and userName come from window.auth, not stored here
```

## Deployment

### AWS CLI from Kiro Terminal
- ALWAYS append `--no-verify-ssl` to every `aws` CLI command run from Kiro's terminal
- Kiro's embedded terminal doesn't inherit Windows cert store properly (Avast HTTPS inspection + Kiro bug)
- Regular terminal/VS Code terminals work fine without it
- The flag produces stderr warnings — suppress with `2>$null`

### Frontend — Manual zip upload to AWS Amplify (NOT git-connected)
- Zip project files (exclude .git/, node_modules/, __tests__/, mcp-server/)
- Upload to Amplify Console manually (region: **us-east-1**, app: d2otujcpa37fuv)
- Live: https://tracker.blacksheep-gypsies.com

### Lambda — AWS CLI (all three deployed together from mcp-server/lambda.zip)
```bash
aws lambda update-function-code --function-name blacksheep_tarot-tracker-bedrock --zip-file fileb://lambda.zip --region us-east-2
aws lambda update-function-code --function-name blacksheep_tarot-tracker-mcp-server --zip-file fileb://lambda.zip --region us-east-2
aws lambda update-function-code --function-name blacksheep_tarot-tracker-bedrock-chat-proxy --zip-file fileb://lambda.zip --region us-east-2
```
- You (human) create lambda.zip locally — zip doesn't work in Kiro's shell
- Kiro runs the AWS CLI deployment commands

### Bedrock Agent
- Agent ID: 0LC3MUMHNN | Alias: 3T7P4GYJYK (v42)
- Model: Claude Haiku 4.5 (US inference profile, `us.anthropic.claude-haiku-4-5-20251001-v1:0`)
- Region: us-east-2
- Execution Role: `AmazonBedrockExecutionRoleForAgents_KWCJTGJ4UR`

### Bedrock Agent System Prompt
- File: `mcp-server/bedrock-agent-system-prompt.txt`
- NOT auto-deployed — must be manually copy/pasted into AWS Bedrock Agent console

### Bedrock Model Access Lessons Learned
- Haiku 4.5 requires AWS Marketplace subscription (auto-subscribed on first invoke)
- IAM user needs `aws-marketplace:ViewSubscriptions` + `aws-marketplace:Subscribe` permissions
- Haiku 4.5 CANNOT be invoked with bare model ID — requires inference profile (us. prefix)
- "Global inference" in agent config uses bare model ID and fails; use "US inference" instead
- Agent execution role needs inference profile ARNs in policy (not just foundation-model ARNs)

## Testing

- Jest test suite: `npm test` (all tests must pass before deploy)
- E2E test: `node mcp-server/test-e2e.mjs` (run before Lambda deploy)
- Smoke test: `node mcp-server/test-tools.js`
- **No live DB in tests**: All Supabase calls MUST be mocked (jest.mock). No test shall ever make live interactions with the database. Tests verify payloads and state transitions only.

## mcp-server File Structure

- `mcp_lambda.js` — MCP Lambda handler (streaming JSONRPC for IDE)
- `bedrock_lambda.js` — Bedrock action group handler (vanilla REST)
- `proxy_lambda.js` — Chat proxy handler (SSE for frontend)
- `server.js` — Shared tool definitions (v2 tools hit normalized DB views)

## Service Worker
- Strategy: Network-first for static assets, skip for HTML/external/Supabase
- Service Worker version: v7.2
- Cache name format: `app:v4.1.1-service:v7.2`
- Excludes: Supabase API calls, external CDNs, HTML files

## Z-Index Hierarchy
- Snackbars: 3000
- Gpsy Drawer: 3000
- Sheets: 2001
- Drawers: 2000
- Overlays: 1999
