---
inclusion: auto
description: Core development rules, deployment commands, data structures, and testing constraints
---

# Development Rules

## Version: v4.6.8

CRITICAL: Bump version on EVERY code change (cache-busting). Update version in: index.html, README.md, and this file.

## Tech Stack

Pure HTML/CSS/JS (no frameworks), Supabase PostgreSQL, localStorage backup, AWS Amplify hosting, AWS Lambda + Bedrock for AI chat.

## Core Classes

All in `modules/`:
- `auth.js` — Google OAuth via Supabase Auth, role-based access (admin/user)
- `offline-queue.js` — FIFO operation-message queue for offline-first sync
- `session-store.js` — Session state, cloud sync, normalized readings table
- `timer.js` — Canvas countdown, Web Audio alarms, Wake Lock
- `gpsy-chat.js` — AI chat interface, HTML rendering, suggestion buttons
- `settings-store.js` — App preferences, payment methods, dark mode
- `readings-manager.js` — Reading CRUD, payment/source sheet UI
- `analytics-notifier.js` — Daily summaries, trend alerts
- `utils.js` — Date normalization, toast notifications, haptic feedback

## Critical Rules

### Timezone Handling
- Reading timestamps are `timestamp without time zone` — local clock time, no UTC
- Display the stored value directly — NO `new Date(timestamp)` conversion for display
- `tz_offset` column = integer hours from UTC (e.g., -7). Reference only, not used in display math
- Frontend creates timestamps as local ISO strings (no 'Z' suffix): `YYYY-MM-DDTHH:MM:SS.mmm`
- Views derive date/time directly: `r.timestamp::date`, `EXTRACT(hour FROM r.timestamp)`
- Use raw YYYY-MM-DD strings for session date display
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

### Production Data Safety — IMMUTABLE GUARDRAIL
- **NEVER modify production data directly.** Always: copy → modify copy → validate → promote.
- Create a temp table with affected rows, make changes there, run validation queries (count checks, constraint checks, spot-checks), then UPDATE production from the validated temp.
- **Backups are immutable snapshots.** Never DROP/recreate or UPDATE an existing backup table. If you need a new backup, create a new table with a different name (e.g., `readings_backup_2`).
- **Promotions update only affected records.** Targeted UPDATEs on specific rows, not bulk overwrites.
- **Verify SQL math on a single row BEFORE running against all data.** Never trust arithmetic in interval expressions without a test query first.
- **Sign errors kill:** `interval '-7 hours' * -1` = +7 hours, not -7. Use `interval '1 hour' * offset` where offset is already negative.

### Supabase Error Handling — MUST THROW
- **Supabase JS v2 does NOT throw on network errors for data operations.** It returns `{ data: null, error: {...} }` silently.
- **ALWAYS destructure `error` and throw it:** `const { data, error } = await supabaseClient.from(...); if (error) throw error;`
- **Without this, offline queue never triggers.** The catch block only fires on thrown exceptions, not returned error objects.
- **This applies to:** `.insert()`, `.update()`, `.delete()`, `.select()` — ALL Supabase data operations.
- **Discovered v4.6.6:** Offline queue existed since v4.5.0 but never actually fired because errors weren't thrown.

### LLM Arithmetic — NEVER TRUST
- **LLMs are bad at math.** Bedrock/Claude will confidently report wrong totals when given raw readings.
- **All arithmetic must happen in Postgres.** The `calculate_stats` tool (RPC function) does all computation.
- **System prompt says "you suck at math, use the tool."** Agent must call `calculate_stats` for any numeric question.
- **Lambda is a thin passthrough.** No math in Lambda — just parse filters, call RPC, return result as-is.
- **Discovered v4.6.7:** Agent reported $527.50 when DB had $554.00, and $538 when DB had $507.00.

## Data Structures (DO NOT BREAK)

```javascript
// Reading (in-memory + normalized DB table)
{ id, timestamp, tz_offset, tip, price, payment, source }
// timestamp = local clock time string (no Z suffix, no UTC)
// tz_offset = integer hours from UTC (e.g., -7 for PDT)

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
- **No property-based testing (PBT)**: Do NOT use fast-check or any PBT library. Write thorough example-based unit tests with good edge cases instead. No "correctness properties" sections in specs.
- **Testing phase is last**: Build all implementation first, manually test, THEN write unit tests as a single consolidated task at the end. Do not pepper test-writing tasks throughout the implementation plan.

## mcp-server File Structure

- `mcp_lambda.js` — MCP Lambda handler (streaming JSONRPC for IDE)
- `bedrock_lambda.js` — Bedrock action group handler (vanilla REST)
- `proxy_lambda.js` — Chat proxy handler (SSE for frontend)
- `server.js` — Shared tool definitions (v2 tools hit normalized DB views)

## Service Worker
- Strategy: Network-first for static assets, skip for HTML/external/Supabase
- Service Worker version: v7.2
- Cache name format: `app:v4.3.2-service:v7.2`
- Excludes: Supabase API calls, external CDNs, HTML files

### Pre-Push Hook (cache version sync)
- File: `.git/hooks/pre-push` (source: `pre-push-hook.sh` in repo root)
- **Purpose**: Automatically updates `CACHE_NAME` in `serviceWorker.js` before push so the app detects new versions and prompts "update available"
- Extracts app version from `<meta http-equiv="version" content="vX.X.X">` in index.html
- Extracts service worker version from `SERVICE_WORKER_VERSION = 'vX.X'` in serviceWorker.js
- Writes `CACHE_NAME = 'app:vX.X.X-service:vX.X'` and amends the commit
- Uses `sed -n 's/.*pattern.*/\1/p'` for extraction (not `grep -o` which returns multiple matches)
- Uses `|` as sed delimiter (not `/`) to avoid conflicts with semicolons in the JS line
- If extraction fails (empty version), hook exits 1 and blocks the push
- **To install on a new machine**: `cp pre-push-hook.sh .git/hooks/pre-push`

## Z-Index Hierarchy
- Snackbars: 3000
- Gpsy Drawer: 3000
- Sheets: 2001
- Drawers: 2000
- Overlays: 1999
