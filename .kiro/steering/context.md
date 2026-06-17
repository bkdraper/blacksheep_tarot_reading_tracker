# Project Context & Working Relationship

## About This Project

### The Business
- **Black Sheep Gypsies** — Professional tarot reading business
- **Production app**: https://tracker.blacksheep-gypsies.com
- Real users (Amanda and others) tracking readings at live events
- Mobile-first, used in the field at Renaissance Festivals, conventions, etc.

### The App
- Tarot reading tracker with tips, payment methods, sources
- Multi-user support with Google OAuth and cloud sync (Supabase)
- AI assistant "Gpsy" (ChatGPSY) for data queries via Bedrock Agent
- PWA installable on mobile devices
- Pure vanilla JS — no frameworks, keeping it simple and fast
- Currently at v4.0.1 with 223 passing tests across 8 suites

## Development Team

### You and AI Assistants
- Primary workflow: You guide the vision, AI handles coding
- Amazon Q in VSCode, now also Kiro
- Careful, iterative development with detailed changelogs

### Working Style
- **Version discipline**: Bump version on EVERY code change
- **Testing discipline**: All 223 tests must pass
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
- Date: June 14, 2026
- Version: v4.1.4
