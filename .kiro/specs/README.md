# Tarot Tracker - Specification Files

## Overview
This directory contains detailed specification files for all major features and systems in the Tarot Reading Tracker application.

## Spec Files

### Core Systems
- **[session-management.md](session-management.md)** - Session state management, database sync, localStorage backup
- **[timer-system.md](timer-system.md)** - Canvas-based countdown timer with audio alarms and wake lock
- **[pwa-offline-support.md](pwa-offline-support.md)** - Service worker, caching, offline support, installability
- **[analytics-notifications.md](analytics-notifications.md)** - Automated insights and notification system

### ChatGPSY Features (AI Assistant)
- **[chatgpsy-phase2-persistence.md](chatgpsy-phase2-persistence.md)** - Message persistence and error handling
- **[chatgpsy-phase3-context-awareness.md](chatgpsy-phase3-context-awareness.md)** - Context injection and quick actions
- **[chatgpsy-phase4-visualization.md](chatgpsy-phase4-visualization.md)** - Charts and sparklines

### Refactoring
- **[refactoring-settings-ui.md](refactoring-settings-ui.md)** - Extract settings UI to module

## Development Status

### Completed Features ✅
- Session management (SessionStore)
- Timer system (Timer)
- PWA offline support (Service Worker)
- ChatGPSY Phase 1 (mobile UX basics)
- Analytics notifications (AnalyticsNotifier)
- Module extraction (7/8 complete)

### In Progress 🚧
- ChatGPSY Phase 2 (persistence, error handling)
- Settings UI module extraction

### Planned 📋
- ChatGPSY Phase 3 (context awareness)
- ChatGPSY Phase 4 (visualization)
- ChatGPSY Phase 5 (polish & accessibility)

## How to Use These Specs

### For Development
1. Read the relevant spec file before starting work
2. Follow the implementation plan step-by-step
3. Use the testing checklist to verify completion
4. Update CHANGELOG.md when done

### For Understanding
- Each spec includes context, requirements, and technical details
- Code examples show implementation patterns
- References link to related files and documentation

### For Planning
- Priority and effort estimates help with scheduling
- Dependencies identify prerequisite work
- Success metrics define completion criteria

## Spec File Structure

Each spec file follows this structure:
- **Overview**: Brief description
- **Context**: Background and current state
- **Requirements**: Detailed feature requirements
- **Implementation Plan**: Step-by-step guide
- **Files to Modify**: List of affected files
- **Testing**: Test cases and checklist
- **Success Metrics**: How to measure completion
- **References**: Related documentation

## Version Management

### Current Version: v3.99.6

### Version Bump Rules
Stay on v3.x.x for:
- Internal refactoring
- Bug fixes
- Security patches
- Performance optimizations
- UI improvements
- New features (non-breaking)

Bump to v4.0.0 when:
- Breaking API changes
- Data structure changes
- Schema modifications
- Major feature releases (Phase 3+)

## Related Documentation

### Project Documentation
- **README.md** - User guide and quick start
- **ARCHITECTURE.md** - Technical architecture and deployment
- **ROADMAP.md** - Development roadmap and progress
- **CHANGELOG.md** - Version history

### Development Rules
- **.amazonq/rules/tarot-tracker-rules.md** - Development guidelines

## Tech Stack Reference

### Frontend
- Pure HTML/CSS/JavaScript (no frameworks)
- ES6 classes and modules
- Canvas API (timer)
- Web Audio API (alarms)
- Service Workers (PWA)

### Backend
- Supabase PostgreSQL database
- AWS Lambda (MCP server, Bedrock integration)
- AWS Bedrock Agent (AI chat)

### Deployment
- AWS Amplify (hosting)
- CloudFront CDN
- Custom domain with SSL

## Module Architecture

### Completed Modules
1. `modules/session-store.js` - SessionStore class
2. `modules/timer.js` - Timer class
3. `modules/gpsy-chat.js` - GpsyChat class
4. `modules/settings-store.js` - SettingsStore class
5. `modules/readings-manager.js` - ReadingsManager class
6. `modules/analytics-notifier.js` - AnalyticsNotifier class
7. `modules/utils.js` - Utility functions

### Remaining
8. `modules/settings-ui.js` - Settings UI functions (see refactoring-settings-ui.md)

## Testing Strategy

### Test Files
- `__tests__/session-store.test.js`
- `__tests__/timer.test.js`
- `__tests__/gpsy-chat.test.js`
- `__tests__/settings-store.test.js`
- `__tests__/readings-manager.test.js`
- `__tests__/analytics-notifier.test.js`
- `__tests__/utils.test.js`
- `__tests__/integration.test.js`

### Test Coverage
- All 148 tests passing
- Unit tests for each module
- Integration tests for workflows
- Manual testing on mobile devices

## Contributing

When adding new features:
1. Create a spec file in `.kiro/specs/`
2. Follow the standard structure
3. Include implementation plan and testing checklist
4. Link to related documentation
5. Update this README with the new spec

## Questions?

Refer to:
- ARCHITECTURE.md for technical details
- ROADMAP.md for feature planning
- Individual spec files for implementation guidance
