# Project Context & Working Relationship

## About This Project

### The Business
- **Black Sheep Gypsies** - Professional tarot reading business
- **Production app**: https://tracker.blacksheep-gypsies.com
- Real users (Amanda and others) tracking readings at live events
- Mobile-first, used in the field during Renaissance Festivals, conventions, etc.

### The App
- Tarot reading tracker with tips, payment methods, sources
- Multi-user support with cloud sync (Supabase)
- AI assistant "Gpsy" (ChatGPSY) for data queries
- PWA installable on mobile devices
- Pure vanilla JS - no frameworks, keeping it simple and fast

### Development History
- Started as massive 3788-line index.html
- Refactored down to ~1053 lines (72% reduction)
- Extracted 7 modules (all core functionality modularized)
- Currently at v3.99.7 with 148 passing tests
- Staying on v3.x.x until Phase 3 (breaking changes)

## Development Team

### You and Q
- **Primary workflow**: You and Amazon Q have been "vibing this in VSCode for a while"
- Q handles most of the coding, you guide the vision
- Now bringing Kiro into the mix
- Careful, iterative development with detailed changelogs

### Working Style
- **Version discipline**: Bump version on EVERY code change (cache-busting)
- **Testing discipline**: All 148 tests must pass
- **Documentation**: Detailed CHANGELOG, ARCHITECTURE, ROADMAP, specs
- **Production-ready**: Real users depend on this app

## Key Technical Discoveries

### Dual Lambda Architecture
**The Real Reason**: Protocol incompatibility, NOT experimentation
- **MCP Lambda**: Streaming JSONRPC for VSCode/Amazon Q MCP hosts
- **Bedrock Lambda**: Vanilla REST for AWS Bedrock Agent
- **Chat Proxy Lambda**: SSE for frontend (security boundary)
- All share the same tool definitions in server.js
- Only difference is response format/protocol handling

### Bedrock's Fake Streaming
**Critical Discovery**: Despite SSE infrastructure, Bedrock Agent doesn't actually stream
- It buffers the entire response and sends one chunk at the end
- SSE setup is future-proofing for when AWS supports real streaming
- Users wait with thinking indicator, no progressive response
- This is why duration logging is so important

### Deployment Workflow

**Lambda Deployment: You zip, Kiro deploys**
- Zip commands don't work in Kiro's bash environment
- You create lambda.zip locally (includes node_modules)
- Kiro runs the AWS CLI deployment commands
- This workflow works, don't try to change it

**Frontend Deployment: Manual zip to Amplify**
- AWS Amplify is configured for manual deployment (not auto-deploy from GitHub)
- You create a zip file of frontend files locally
- Upload zip to Amplify console manually
- Excludes: mcp-server/, node_modules/, .git/, __tests__/

**Bedrock Agent System Prompt**
- The file `mcp-server/bedrock-agent-system-prompt.txt` is documentation only
- Nothing reads this file automatically
- You manually copy/paste the content into Bedrock Agent config in AWS console
- Keep the file updated as the source of truth

### Pain Points Solved
- **Timezone hell**: YYYY-MM-DD creates UTC dates, MM/DD/YYYY creates local
- **DOM corruption**: ChatGPSY HTML validation prevents bad AI responses from breaking chat
- **Duplicate sessions**: Check before insert, not after
- **localStorage sync**: Split save() into save() and saveToLocalStorage()
- **XSS vulnerabilities**: Utils.sanitize() for user-generated content
- **Network drive slowness**: Moving to C: drive for better performance

## Development Patterns

### Critical Rules
- **NEVER** convert dates through Date() without normalizing
- **ALWAYS** use `_loading` flag to prevent saves during restoration
- **ALWAYS** attach onclick handlers AFTER DOM insertion
- **NEVER** use bullet chars (•) in HTML lists, use `<ul><li>` with classes
- Touch targets: 44px minimum for mobile
- Fonts: 16px+ to prevent mobile zoom

### Lambda Deployment
**Chat Proxy** (most common):
```bash
aws lambda update-function-code \
  --function-name blacksheep_tarot-tracker-bedrock-chat-proxy \
  --zip-file fileb://lambda.zip \
  --region us-east-2
```

**MCP + Bedrock** (when adding tools):
Deploy to both lambdas when changing server.js tool definitions

### CloudWatch Debugging
- Chat Proxy logs: https://us-east-2.console.aws.amazon.com/cloudwatch/home?region=us-east-2#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fblacksheep_tarot-tracker-bedrock-chat-proxy
- Structured JSON logging: REQUEST, SUCCESS, ERROR types
- Query for slow queries: `filter type = "SUCCESS" and duration > 5000`
- Query for errors: `filter type = "ERROR"`

## Current State (v3.99.7)

### What's Working
- Session management with cloud sync
- Reading tracking with real-time totals
- Canvas timer with audio alarms
- ChatGPSY AI assistant (with HTML validation)
- PWA offline support
- Analytics notifications
- Multi-user support

### What's Next (from ROADMAP)
- **Phase 2**: ChatGPSY persistence and error handling
- **Phase 3**: Context awareness (requires Lambda changes)
- **Phase 4**: Charts with Apache ECharts
- **Phase 5**: Accessibility polish

### Known Limitations
- Bedrock doesn't actually stream (buffers entire response)
- Network drive performance (moving to C: drive)
- No rate limiting on Chat Proxy (not worried about it)

## Communication Style

### What You Prefer
- Direct, no fluff
- Technical accuracy over hand-holding
- Understand the "why" behind decisions
- Document discoveries for future reference
- Commit in bulk when ready, not piecemeal

### What You Don't Want
- Verbose summaries or bullet point recaps
- Unnecessary markdown files documenting process
- Repeating the same message over and over
- Guessing or making assumptions
- Breaking working workflows

## File Structure

### Key Documentation
- `README.md` - User guide and quick start
- `ARCHITECTURE.md` - Technical architecture and deployment
- `ROADMAP.md` - Development roadmap and progress
- `CHANGELOG.md` - Version history (detailed)
- `.amazonq/rules/tarot-tracker-rules.md` - Development guidelines
- `.kiro/specs/` - Comprehensive feature specifications (10 files)

### Core Modules
- `modules/session-store.js` - SessionStore class
- `modules/timer.js` - Timer class
- `modules/gpsy-chat.js` - GpsyChat class
- `modules/settings-store.js` - SettingsStore class
- `modules/readings-manager.js` - ReadingsManager class
- `modules/analytics-notifier.js` - AnalyticsNotifier class
- `modules/utils.js` - Utility functions

### Lambda Functions
- `mcp-server/server.js` - Shared tool definitions
- `mcp-server/index.js` - MCP handler (streaming JSONRPC)
- `mcp-server/bedrock.js` - Bedrock handler (vanilla REST)
- `mcp-server/blacksheep_tarot-tracker-bedrock-chat-proxy-lambda.js` - Chat proxy (SSE)

## Git Workflow

### Current Setup
- Repo: https://github.com/bkdraper/blacksheep_tarot_reading_tracker.git
- Branch: master (main branch)
- All work happens on master
- Commit messages are descriptive with bullet points
- Push after each logical unit of work

### Recent Commits
- Spec files creation (10 comprehensive specs)
- Lambda architecture documentation
- Chat Proxy improvements (logging, timeout)

## Environment Notes

### Windows Quirks
- Git ownership issues on network drives (fixed with safe.directory)
- Bash shell but some commands don't work (zip)
- Use AWS CLI for Lambda deployments
- Network drive path: `//desktop/F/Graphics/Black Sheep Gypsies/tools/blacksheep_tarot_reading_tracker`
- Moving to: C: drive (location TBD)

### Tools in Use
- Kiro (this IDE)
- Amazon Q (VSCode)
- AWS CLI
- Git
- Node.js / npm

## Important Reminders

### For Future AI Assistants
1. Read this file first to understand the project and working style
2. Read ARCHITECTURE.md for technical details
3. Read ROADMAP.md for what's next
4. Check CHANGELOG.md for recent changes
5. Don't break the "you zip, I deploy" workflow
6. Don't create unnecessary documentation files
7. Respect the version discipline (bump on every change)
8. All 148 tests must pass

### For You (Human)
- This context file captures our conversation and discoveries
- Update it when you learn new things or workflows change
- Share it with Q if helpful
- Delete sections that become outdated

## Last Updated
- Date: February 20, 2026
- Version: v3.99.8
- By: Kiro (updated deployment workflow and version)
