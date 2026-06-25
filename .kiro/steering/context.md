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
- Currently at v4.4.3 with 250+ passing tests across 10 suites

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
- Timezone hell: YYYY-MM-DD → UTC, MM/DD/YYYY → local
- DOM corruption: ChatGPSY HTML validation
- Duplicate sessions: Check before insert
- localStorage sync: Split save() into save() + saveToLocalStorage()
- XSS: Utils.sanitize() for user-generated content

### Session Format Field (v4.1.4 → v4.4.3)
- **Format values are proper-cased** — stored exactly as displayed in the UI (e.g., "Expo", "In-Person", "Shop"). No lowercase normalization. No display-name → data-label mapping. Phones auto-capitalize, and Amanda types proper case.
- **Backfill covered ALL sessions** — not just Phone/In-Person privates. Events got: season-in-name → "Expo", Misty's/Steph's → "Party", everything else → "Shop". Zero NULLs remain.
- **`readings_with_context` view gained `session_type`** — added alongside `session_format` since the original view didn't expose session type.
- **`get_session_with_readings` function updated** — now returns `type` and `format` in the session JSON object.
- **MCP server ESM testing** — server.js is ESM but Jest runs CJS. MCP format tests reconstruct filter logic in CJS rather than importing the ESM module directly. Works well.
- **Migration pattern** — `migrateSourcesFormats()` uses a `legacySourcesMigrated` flag to be idempotent. Exact-match removal (not substring) is critical when source names contain common words.
- **Format is required on session save** — validation blocks save if no format selected. Defaults: "Expo" for event, "In-Person" for private.

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
- Date: June 24, 2026
- Version: v4.4.3
