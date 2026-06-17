---
inclusion: fileMatch
fileMatchPattern: "modules/**,mcp-server/**,index.html,server.js,serviceWorker.js"
---

# Architecture Reference

## System Architecture

```
User Browser → index.html → [SessionStore, Timer, GpsyChat, ReadingsManager]
                           → Supabase DB (sessions, readings, user_profiles)
                           → localStorage (backup)
GpsyChat → Chat Proxy Lambda → Bedrock Agent → Bedrock Lambda → MCP Tools → Supabase
```

## Dual Lambda Architecture

The three Lambdas exist due to protocol incompatibility, not experimentation:
- **MCP Lambda** (`mcp_lambda.handler`): Streaming JSONRPC for VSCode/Amazon Q MCP hosts
  - URL: https://fjmqe5vx4n6r6tklpsiyzey6ea0zuzgo.lambda-url.us-east-2.on.aws/
  - Auth: NONE, CORS: POST from *, InvokeMode: RESPONSE_STREAM
- **Bedrock Lambda** (`bedrock_lambda.handler`): Vanilla REST for AWS Bedrock Agent action group
  - Invoked directly by Bedrock Agent (no URL)
  - Action Group: "TarotDataTools" (ID: MOFZI2VIQW)
  - Only v2 tools exposed to agent (list_sessions_v2, list_readings_v2, get_session_details_v2, get_user_summary_v2)
- **Chat Proxy Lambda** (`proxy_lambda.handler`): SSE for frontend (security boundary, user context injection)
  - URL: https://57h2jhw5tcjn35yzuitv4zjmfu0snuom.lambda-url.us-east-2.on.aws/
  - Auth: NONE (Bearer token validated in code), CORS: POST from *, allows authorization header
  - InvokeMode: RESPONSE_STREAM

All share the same tool definitions in `server.js`. Only difference is response format/protocol.

### Bedrock Agent Config
- Agent ID: 0LC3MUMHNN
- Production Alias: 3T7P4GYJYK → version 39 (alias name: "version-39")
- Test Alias: TSTALIASID → DRAFT version
- Model: us.anthropic.claude-3-5-haiku-20241022-v1:0
- Temperature: 0.0, TopP: 1.0, TopK: 250, MaxLength: 2048
- Memory: SESSION_SUMMARY (30 days, max 20 recent sessions)
- Idle TTL: 600s (10 min)
- Pre-processing: DISABLED (no input classification)
- Post-processing: DISABLED (no response augmentation)
- System prompt: stored in `mcp-server/bedrock-agent-system-prompt.txt` (must be manually copy/pasted to console)

## Database Schema

### Tables
- `blacksheep_reading_tracker_sessions` — id (uuid PK), session_date (date), location (text), selected_day (text, legacy/deprecated), reading_price (numeric), readings (jsonb, legacy, no longer written), user_name (text NOT NULL), user_id (uuid), created_at, updated_at
- `blacksheep_reading_tracker_readings` — id (uuid PK), session_id (uuid FK), timestamp (timestamptz NOT NULL), tip (numeric, default 0), price (numeric, nullable), payment (text), source (text), created_at. Indexes: session_id, timestamp, LOWER(payment), LOWER(source)
- `blacksheep_reading_tracker_user_profiles` — user_id (uuid PK), role (text, default 'user'), user_name (text), created_at

### Indexes (notable)
- `idx_sessions_location_trgm` — GIN trigram index on sessions.location (enables fuzzy search)
- `idx_sessions_user_date` — composite (user_name, session_date)
- `idx_sessions_user_id` — btree on user_id
- `idx_sessions_readings_gin` — GIN on readings JSONB (legacy, for old tools)
- `idx_readings_session_id`, `idx_readings_timestamp`, `idx_readings_payment_lower`, `idx_readings_source_lower`

### Extensions
- `pg_trgm` — trigram similarity for fuzzy location search
- `uuid-ossp` — UUID generation
- `pgcrypto` — cryptographic functions

### Views
- `session_summaries` — sessions LEFT JOIN readings, pre-aggregates: readings_count, base_total, tips_total, total_earnings, avg_tip, avg_price, first_reading_time, last_reading_time, day_of_week_num (EXTRACT dow), day_of_week_name (trimmed). Grouped by session.
- `readings_with_context` — readings INNER JOIN sessions, includes: reading_price, session_default_price, effective_price (COALESCE reading/session), total_earnings, location, user_name, user_id, hour_local_et (AT TIME ZONE 'America/New_York'), time_of_day_et (morning/afternoon/evening), day_of_week_num, day_of_week_name

### Functions
- `get_session_with_readings(session_uuid uuid)` → json — complete session + all readings in one RPC
- `get_user_summary(p_user_name text, p_start_date date, p_end_date date)` → json — aggregate stats (original overload)
- `get_user_summary(p_user_name text, p_start_date date, p_end_date date, p_user_id uuid)` → json — aggregate stats with user_id support (preferred overload)
- `search_locations_fuzzy(p_user_name text, p_search_term text, p_limit int, p_threshold real, p_user_id uuid)` → TABLE(location text, sim real) — trigram fuzzy location search fallback. Uses `pg_trgm` similarity + first-word ILIKE. Normalizes year formats (2025 → 25).

## MCP Server Tools (v2, active)

1. **list_sessions_v2** — queries `session_summaries` view
2. **list_readings_v2** — queries `readings_with_context` view (full filter support: payment, source, date, tip range, time_of_day)
3. **get_session_details_v2** — calls `get_session_with_readings()` RPC
4. **get_user_summary_v2** — calls `get_user_summary()` RPC

Legacy tools (list_sessions, list_readings, search_locations, aggregate_readings) still in server.js but not used by Bedrock Agent.

## Bedrock Agent Response Format

- **SUCCESS**: omit responseState (setting it to 'SUCCESS' causes deserialization errors)
- **REPROMPT**: `responseState: "REPROMPT"` for missing params
- **FAILURE**: `responseState: "FAILURE"` for errors

## Gpsy Chat Integration

- Chat Proxy Lambda URL: https://57h2jhw5tcjn35yzuitv4zjmfu0snuom.lambda-url.us-east-2.on.aws/
- Injects user context on every message: `[Context: user_id=..., user_name=..., today=..., timezone=..., loaded_session=...]`
- Bedrock currently buffers entire response despite SSE setup (not actually streaming)
- 120 second timeout

## Supabase Connection
- URL: `https://uuindvqgdblkjzvjsyrz.supabase.co`
- Auth: Google OAuth provider
- 2 registered users (Kelly Draper = admin, Amanda Madden = user)
- Data: 53 sessions, 377 readings

### Auth Configuration
- Provider: Google OAuth
- Users authenticate via Supabase Auth → Google → redirects back with session token
- Frontend uses `supabaseClient.auth.signInWithOAuth({ provider: 'google' })`
- On first login, profile auto-created in `user_profiles` table

### Database Roles (Supabase standard)
| Role | Purpose | Can Login |
|---|---|---|
| `anon` | Unauthenticated / Lambda server-side (uses publishable key) | No |
| `authenticated` | Logged-in browser users | No |
| `service_role` | Backend admin (bypass RLS) | No |
| `authenticator` | Connection pooler role | Yes |

### Table Grants
All three app tables + both views grant full privileges (SELECT, INSERT, UPDATE, DELETE, TRUNCATE, REFERENCES, TRIGGER) to `anon`, `authenticated`, and `service_role`. This is intentional:
- Lambda uses anon key for server-side tool calls
- Authenticated browser users need full CRUD
- RLS policies (not grants) control actual row access

### RLS Policies

**`blacksheep_reading_tracker_sessions`** (RLS enabled):
| Policy | Command | Role | Condition |
|---|---|---|---|
| Allow anonymous read access | SELECT | anon | true |
| Allow anonymous insert access | INSERT | anon | true |
| Allow anonymous update access | UPDATE | anon | true |
| Allow anonymous delete access | DELETE | anon | true |
| Authenticated users full access | ALL | public | auth.uid() IS NOT NULL |

Why anon has full access: Lambda uses the anon/publishable key (not service_role). RLS policies on sessions allow it because the Lambda is trusted server-side code. The publishable key is not exposed beyond the frontend and Lambda.

**`blacksheep_reading_tracker_user_profiles`** (RLS enabled):
| Policy | Command | Role | Condition |
|---|---|---|---|
| Allow all authenticated reads | SELECT | public | auth.uid() IS NOT NULL |
| Users can insert own profile | INSERT | public | auth.uid() = user_id |
| Users can read own profile | SELECT | public | auth.uid() = user_id |
| Users can update own profile | UPDATE | public | auth.uid() = user_id |

Note: The "Allow all authenticated reads" policy lets any logged-in user see all profiles (needed for admin user switching UI).

**`blacksheep_reading_tracker_readings`** (RLS **disabled**):
- No policies. Wide open to all roles.
- Security relies on: frontend filters by session_id → sessions filtered by user_id
- Lambda filters by user context injected into tool calls
- ⚠️ Security gap: anyone with the publishable key could query all readings directly

### Functions Security
All functions use `SECURITY INVOKER` (run as calling role, not definer). This means RLS policies on underlying tables still apply to function queries.

### Triggers
None on app tables.

### Unrelated Tables (in same project)
- `bookmarks` — RLS enabled, 0 rows (separate app/feature)
- `webauthn_challenges` / `webauthn_credentials` — RLS disabled, 0 rows (unused WebAuthn tables)
- `registration_invitations` — RLS disabled, 0 rows (unused invite system)

## AWS Infrastructure
- Amplify App ID: `d2otujcpa37fuv`, name: "reading-tracker", **region: us-east-1** (NOT us-east-2)
  - Custom domain: tracker.blacksheep-gypsies.com
  - Default domain: d2otujcpa37fuv.amplifyapp.com
  - Production branch: `staging` (last deploy: 2026-05-05)
  - Manual zip upload (no git integration)
  - Build compute: STANDARD_8GB
  - Cache: AMPLIFY_MANAGED_NO_COOKIES
- Bedrock Agent: 0LC3MUMHNN, Alias 3T7P4GYJYK, Claude 3.5 Haiku (us.anthropic.claude-3-5-haiku-20241022-v1:0), us-east-2
  - Memory: SESSION_SUMMARY enabled, 30 day storage, max 20 recent sessions
  - Idle session TTL: 600s (10 min)
  - Pre-processing: DISABLED
  - Post-processing: DISABLED
  - Temperature: 0.0, TopP: 1.0, TopK: 250, MaxLength: 2048
- Lambdas (all us-east-2, same zip deploy, shared role `lambda-execution-role`):
  - `blacksheep_tarot-tracker-bedrock` — nodejs22.x, handler: bedrock_lambda.handler, timeout: 300s
  - `blacksheep_tarot-tracker-mcp-server` — nodejs22.x, handler: mcp_lambda.handler, timeout: 300s
  - `blacksheep_tarot-tracker-bedrock-chat-proxy` — nodejs24.x, handler: proxy_lambda.handler, timeout: 120s, env: API_TOKEN
- MCP Lambda URL: https://fjmqe5vx4n6r6tklpsiyzey6ea0zuzgo.lambda-url.us-east-2.on.aws/
- CloudWatch (proxy): https://us-east-2.console.aws.amazon.com/cloudwatch/home?region=us-east-2#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fblacksheep_tarot-tracker-bedrock-chat-proxy
