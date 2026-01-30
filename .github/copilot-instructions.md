# Repo Guidance for AI Coding Agents

Quick summary
- Mobile-first single-page web app in a single self-contained `index.html` (SessionStore + Timer + SettingsStore).
- Cloud sync via Supabase with localStorage backup; MCP server in `mcp-server/` exposes tools for AI integrations.

Big picture (what matters)
- Frontend: [index.html](index.html) implements `SessionStore` (session lifecycle, persistence), `Timer` (canvas countdown + audio), and UI rules (mobile touch targets, input sizing). Work here only when changing UI/behavior.
- Persistence: Supabase + localStorage backup. Per-user localStorage keys use `readingTracker_{user}`.
- Backend/Tools: `mcp-server/` contains a shared `server.js` and two Lambda handlers: `index.js` (MCP handler — PROTECTED) and `bedrock.js` (Bedrock handler — safe to experiment). Deploy Bedrock Lambda by default; only update MCP Lambda when adding new tools or changing `server.js`.

Key conventions and gotchas
- Single-file frontend: keep `index.html` pure HTML/CSS/JS (no frameworks). Small, focused edits preferred.
- Versioning: bump the version number on every code change; version shown in UI for cache-busting (CRITICAL).
- Mobile-first rules: touch targets >=44px, font-size >=16px, use `!important` for mobile style overrides when necessary.
- Timer: canvas is 300×300px with 72px timer text; uses `requestAnimationFrame`, Web Audio beeps, and Wake Lock + silent audio fallback.
- Persistence and loading: SessionStore uses `_loading` flag to prevent saves during restoration — preserve that pattern when writing state logic.
- Payment methods and users: user list is fetched live from the DB (no localStorage user list). `user_name` is NOT NULL in Supabase queries.

MCP server & deployment rules (explicit)
- Do NOT modify `mcp-server/index.js` unless adding new MCP tools or changing streaming behavior (marked PROTECTED). Experiment in `mcp-server/bedrock.js`.
- Deploy Bedrock only for typical changes:
  - `aws lambda update-function-code --function-name blacksheep_tarot-tracker-bedrock --zip-file fileb://lambda.zip --region us-east-2`
- Deploy both functions only when adding tools or changing `server.js`:
  - Update `blacksheep_tarot-tracker-mcp-server` (PROTECTED) and `blacksheep_tarot-tracker-bedrock` together.
- Streaming: Lambda Function URLs require `awslambda.streamifyResponse` and specific headers (`Content-Type`, `mcp-protocol-version`, CORS). See `mcp-server/` for examples.

Developer workflows & commands
- Local dev server: `npm start` (runs `nodemon server.js`). The app is served on port 8080 by default.
- Tests: `npm test` (Jest). Use `npm run test:watch` for iterative work.
- Chrome debug helper: `npm run chrome` opens Chrome with remote debugging (Windows path in `package.json`).

Files to consult for examples
- UI + state: [index.html](index.html)
- Service worker and PWA: [serviceWorker.js](serviceWorker.js)
- Local server: [server.js](server.js)
- MCP server and handlers: [mcp-server/server.js](mcp-server/server.js), [mcp-server/index.js](mcp-server/index.js), [mcp-server/bedrock.js](mcp-server/bedrock.js)
- Tests: [__tests__](__tests__)

How to make safe changes
- Preserve existing mobile/timer UX and persistence semantics. If changing save/load behavior, ensure `_loading` semantics remain to avoid accidental writes during restoration.
- When adding a new MCP tool: add logic to `mcp-server/server.js`, add tests in `mcp-server/` and then deploy both Lambdas.
- When experimenting with AI/Bedrock responses, change `mcp-server/bedrock.js` only; keep MCP handler untouched unless necessary.

If you need clarification
- Ask which component to edit (UI vs persistence vs MCP). I can produce targeted patches (CSS/JS/Lambda) and tests.

---
This file merges the repository README and internal `.amazonq` rules; tell me if you want stricter agent rules (file edit policy, test thresholds, or commit message format) and I'll iterate.
