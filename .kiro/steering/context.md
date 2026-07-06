# Project Context & Working Relationship

## About This Project

### The Business
- **Black Sheep Gypsies** — Professional tarot reading business
- **Production app**: https://tracker.blacksheep-gypsies.com
- Real users (Amanda and others) tracking readings at live events
- Mobile-first, used in the field at Renaissance Festivals, conventions, etc.

### The App
- Tarot reading tracker with tips, payment methods, sources, and session formats
- Multi-user support with Google OAuth and cloud sync (Supabase)
- AI assistant "Gpsy" (ChatGPSY) for data queries via Bedrock Agent
- PWA installable on mobile devices
- Pure vanilla JS — no frameworks, keeping it simple and fast
- Currently at v4.5.1 with 409 passing tests across 13 suites

## Development Team

### You and AI Assistants
- Primary workflow: You guide the vision, AI handles coding
- Amazon Q in VSCode, now also Kiro
- Careful, iterative development with detailed changelogs

### Working Style
- **Version discipline**: Bump version on EVERY code change
- **Testing discipline**: All tests must pass before shipping
- **Documentation**: Detailed CHANGELOG, ARCHITECTURE, ROADMAP
- **Production-ready**: Real users depend on this app

## Communication Preferences

- Direct, no fluff
- Technical accuracy over hand-holding
- Understand the "why" behind decisions
- Document discoveries for future reference
- Don't create unnecessary markdown files
- Don't break working workflows
- Don't repeat the same message over and over

## Key Technical Discoveries

### Bedrock's Fake Streaming
Despite SSE infrastructure, Bedrock Agent buffers the entire response and sends one chunk at the end. SSE setup is future-proofing. Users wait with thinking indicator.

### Deployment Workflow
- **Lambda**: You zip locally, Kiro/Q runs AWS CLI commands. Zip doesn't work in Kiro's shell.
- **Frontend**: Manual zip upload to AWS Amplify console (NOT git-connected).
- **Bedrock System Prompt**: Manual copy/paste to AWS console from `mcp-server/bedrock-agent-system-prompt.txt`.

### Pain Points Solved
- Timezone hell: Reading timestamps now stored as local clock time (`timestamp without time zone`). No more UTC→local conversion nightmares. Display the stored value directly.
- DOM corruption: ChatGPSY HTML validation
- Duplicate sessions: Check before insert
- localStorage sync: Replaced snapshot-based sync with operation-message queue (v4.5.0)
- XSS: Utils.sanitize() for user-generated content
- Production data corruption: Immutable guardrail — never modify prod directly, always copy→validate→promote

### Session Format Field (v4.1.4 → v4.4.3)
- **Format values are proper-cased** — stored exactly as displayed in the UI (e.g., "Expo", "In-Person", "Shop"). No lowercase normalization. No display-name → data-label mapping. Phones auto-capitalize, and Amanda types proper case.
- **Backfill covered ALL sessions** — not just Phone/In-Person privates. Events got: season-in-name → "Expo", Misty's/Steph's → "Party", everything else → "Shop". Zero NULLs remain.
- **`readings_with_context` view gained `session_type`** — added alongside `session_format` since the original view didn't expose session type.
- **`get_session_with_readings` function updated** — now returns `type` and `format` in the session JSON object.
- **MCP server ESM testing** — server.js is ESM but Jest runs CJS. MCP format tests reconstruct filter logic in CJS rather than importing the ESM module directly. Works well.
- **Migration pattern** — `migrateSourcesFormats()` uses a `legacySourcesMigrated` flag to be idempotent. Exact-match removal (not substring) is critical when source names contain common words.
- **Format is required on session save** — validation blocks save if no format selected. Defaults: "Expo" for event, "In-Person" for private.

### Offline Queue (v4.5.0)
- **Replaced snapshot-based localStorage sync** — old approach saved full session state and ran diff/reconcile on reconnect. New approach queues individual failed operations as typed messages.
- **`modules/offline-queue.js`** — standalone module, loaded between utils.js and auth.js. Exposed as `window.offlineQueue`.
- **Four operation types**: `insert_reading`, `update_reading`, `delete_reading`, `update_session`. Each has a `createdAt` timestamp and type-specific payload.
- **SessionStore error paths** — on Supabase error, calls `window.offlineQueue.enqueue()` instead of the old `registerBackgroundSync()`. No more `saveToLocalStorage()` calls.
- **Flush triggers**: browser `online` event, SW Background Sync message, and post-auth initialization.
- **`registerBackgroundSync()`** still exists in index.html — OfflineQueue itself calls it on enqueue and on flush error. SessionStore no longer calls it directly.
- **Legacy methods removed**: `saveToLocalStorage`, `loadFromStorage`, `debouncedSaveToLocalStorage`, `promptRestoreSession`, `handleBackgroundSync`, `handleBackgroundBackup`.
- **`clearUserData()` preserved** — still removes `readingTracker_${userId}` on sign-out.
- **Queue persists across refresh** — stored in `offlineQueue_{userId}` localStorage key. Survives page reload.

### Multi-Day Sessions Migration Strategy (v4.6.0 planned)
- **Safe sandbox approach** — collapse migration operates on temp tables (`sessions_temp`, `readings_temp`), never touches production until validation passes.
- **Two-table safety net** — backup snapshots (`sessions_backup`, `readings_backup`) are frozen copies of production. Temp workspaces are where all merge/delete operations happen.
- **Backup tables retained indefinitely** — NOT deleted by the migration project. Kept for burn-in verification. Cleanup deferred to future project.
- **Task 3 is dumb, Task 4 is smart** — Task 3 just populates `end_date = session_date` as placeholder for NOT NULL constraint. Task 4 iterates each session one at a time to determine real end_date from reading timestamps + handles merge groups.
- **End_date from reading timestamps** — sessions that already span multiple days of readings (like Amanda's active sessions) get `end_date` = latest reading's date. No merge needed for those.
- **Delta reconciliation** — handles live writes during migration window. Snapshot timestamp marks boundary. Items with `created_at > snapshot_time` incorporated before promotion.
- **Promote as diff, not overwrite** — can't truncate/replace production tables due to FKs/RLS. Instead: update reading session_ids that changed → update session dates → delete merged sessions. Children first, parents after.
- **Temp tables have no FK constraints** — allows free manipulation without ordering concerns.
- **COLLAPSE COMPLETE** — 59 → 38 sessions. 18 merge groups collapsed. 437 readings preserved. Production state: 38 sessions, 437 readings, 0 orphans.

### Timestamp Storage — Local Clock Time (v4.5.1 COMPLETE)
- **"What time did the clock say?" is the source of truth** — timestamps store local clock time, not UTC.
- **Column type: `timestamp without time zone`** — changed from `timestamptz`. No timezone conversion on read or write. 9:38pm is 9:38pm everywhere.
- **`tz_offset` column** — integer, whole hours (e.g., -7 for PDT). Reference only, not used in display math. Exists for provenance.
- **Frontend sends local time** — no more `new Date().toISOString()` (which produces UTC). Instead, construct local ISO string without 'Z' suffix.
- **Frontend displays stored value directly** — no more `new Date(timestamp).toLocaleTimeString()`. The stored value IS the display value.
- **Views simplified dramatically** — no `AT TIME ZONE` conversions. `reading_date = r.timestamp::date`, `day_of_week_num = EXTRACT(dow FROM r.timestamp::date)`.
- **Backfill complete** — existing UTC timestamps converted to local using per-session location→timezone mapping with DST-aware offsets. All 436 readings verified.
- **Amanda travels constantly** — PST, MST, CST, EST throughout the year. Can't hardcode a single timezone. Per-reading offset is necessary.
- **`session_duration_days`** — computed in views as `(end_date - start_date + 1)`. Lambdas stay dumb, DB does the math.
- **Bulk-imported historical sessions** — readings entered after-the-fact have timestamps reflecting entry time (meaningless), but dates corrected to match session_date. Time-of-day for these is noise.

### Production Data Safety Guardrail (IMMUTABLE — learned the hard way)
- **NEVER modify production data directly.** A sign error in an interval expression corrupted all reading timestamps. Had to scramble to fix.
- **The rule**: Copy affected rows to temp table → modify temp → validate (counts, constraints, spot-checks) → promote only affected rows back to production.
- **Backups are immutable snapshots.** `sessions_backup` and `readings_backup` are frozen at post-Task-2 state. Never modify them. Need a new backup? Create a new table.
- **Verify SQL math on one row first.** Never trust interval arithmetic without a test query. `interval '-7 hours' * -1` = +7, not -7.
- **Promotions = targeted UPDATEs on affected rows only.** No DROP/recreate, no bulk overwrite.

### Collapse Migration Lessons (Task 4, July 2026)
- **Location name mismatches block merge detection.** Amanda inconsistently named "Va Beach BMSE Spring 26" vs "Virginia Beach Spring 26" — same event, different session names. Pure SQL consecutive-day logic can't catch this. Always present merge groups for user review before executing.
- **Full per-session regression before promotion, not aggregate.** Run one SELECT per session comparing temp reading count against backup reading count. Aggregate totals can hide per-session errors that cancel each other out.
- **Bring backup current before creating temp tables.** If the backup is stale (even 1 row behind), insert the delta before copying to temp — otherwise your reference counts are wrong from the start.
- **Collapse results:** 59 sessions → 38 sessions (21 removed). 18 merge groups. 437 readings preserved, zero orphans, zero data loss.

## Environment Notes

### Windows
- Git ownership issues on network drives (fixed with safe.directory)
- Some shell commands don't work (zip)
- Network drive path: `//desktop/F/Graphics/Black Sheep Gypsies/tools/blacksheep_tarot_reading_tracker`

### Tools in Use
- Kiro, Amazon Q (VSCode), AWS CLI, Git, Node.js/npm

## Git Workflow
- Repo: https://github.com/bkdraper/blacksheep_tarot_reading_tracker.git
- Branch: master
- Commit messages are descriptive with bullet points
- Push after each logical unit of work

## Kiro Steering Docs

The following steering docs are available:
- `development-rules.md` (auto) — always-on rules, deployment commands, data structures
- `architecture.md` (fileMatch) — loads when working on modules/, mcp-server/, index.html
- `roadmap.md` (manual) — #Roadmap to see feature progress and priorities
- `session-ux-spec.md` (manual) — #SessionUXSpec for the session redesign plan

## Project Docs (in /docs)
- `README.md` — User-facing guide and quick start
- `CHANGELOG.md` — Full version history
- `ARCHITECTURE.md` — Original detailed architecture doc (superset of steering version)
- `ROADMAP.md` — Original detailed roadmap (superset of steering version)
- `SESSION-UX-SPEC.md` — Original session UX brainstorm

## Last Updated
- Date: July 5, 2026
- Version: v4.5.1
