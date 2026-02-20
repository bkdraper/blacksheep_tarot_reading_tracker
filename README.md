# Tarot Reading Tracker

Mobile-optimized single page app for tracking tarot readings and tips. Built with pure HTML/CSS/JS and Supabase cloud database.

## Version: v3.99.6

## Features
- Track readings with timestamps, tips, payment methods, sources
- Real-time totals calculation
- Multi-user support with data separation
- Session management with cloud sync
- Countdown timer with audio alarms
- AI chat assistant (Gpsy) for data queries
- Report generation with date ranges
- PWA installable as standalone app

## Quick Start
1. Select user and enter event location/date
2. Click "Create Session" to start tracking
3. Click "+ Add Reading" for each reading
4. Enter tips and select payment methods
5. View real-time totals
6. Use timer for reading sessions
7. Generate reports as needed

## Live App
**URL**: https://tracker.blacksheep-gypsies.com

## Local Development
```bash
npm start  # Runs on port 8080
# Access at http://192.168.5.62:8080
```

## Tech Stack
- Pure HTML/CSS/JavaScript (no frameworks)
- Supabase PostgreSQL database
- localStorage backup for offline
- Service Worker for PWA features
- AWS Amplify hosting

## File Structure
- `index.html`: Main application
- `manifest.json`: PWA manifest
- `serviceWorker.js`: Cache strategy
- `mcp-server/`: Data access API
- See `ARCHITECTURE.md` for technical details

## Recent Changes (v3.99.6)
- Added HTML validation to ChatGPSY responses to prevent DOM corruption
- Validates HTML structure using DOMParser before rendering
- Counts open/close tags to detect incomplete HTML (tables, lists, divs)
- Shows error message instead of rendering malformed HTML
- Prevents catastrophic failure where one bad response breaks entire chat
- Strengthened Bedrock Agent prompt with explicit list formatting rules

## Previous Changes (v3.99.5)
- Centralized DOM synchronization in updateUI() as single source of truth
- Removed direct DOM updates from setters (user, location, sessionDate, price)
- Setters now only update internal state and call updateUI()
- Eliminates duplication and prevents potential circular update issues
- All 148 tests pass

## Previous Changes (v3.99.4)
- Refactored SessionStore to use setters consistently for all state changes
- Split save() into save() and saveToLocalStorage() to avoid redundant DB writes
- Fixed localStorage not updating when loading existing sessions
- Improved user/startOver methods to use setters with _loading flag
- Added XSS sanitization with Utils.sanitize() for user-generated content
- Added offline indicator badge in header with network status monitoring
- Fixed duplicate session check to happen before insert attempt
- Added double confirmation to startNewSession()

## Previous Changes (v3.99.3)
- Consolidated button CSS into base classes (btn, btn-primary, btn-secondary, btn-danger, btn-ghost)
- Added size modifiers (btn-small, btn-large, btn-xlarge)
- Reduced CSS by ~150 lines through consolidation
- All buttons now use consistent styling patterns

## Previous Changes (v3.99.2)
- Added IDs to all unique buttons and containers following {type}-{area}-{purpose} convention
- IDs are additive (classes remain unchanged) for future refactoring
- No functional changes, all tests pass

## Previous Changes (v3.99.1)
- Fixed bug where Add Reading and Delete Reading buttons disappeared after creating new session
- Added comprehensive DOM tests to verify UI state across all session phases

## Previous Changes (v3.99.0)
- Removed ~100 lines of duplicate utility functions from index.html
- All utility functions now sourced from Utils module
- Integrated AnalyticsNotifier module for analytics notifications
- Reduced index.html from 1153 to 1053 lines (9% reduction)

## Documentation
- `ARCHITECTURE.md`: Technical architecture and deployment
- `CHANGELOG.md`: Version history
- `.amazonq/rules/`: Development guidelines

## Browser Support
Modern mobile browsers with ES6, Flexbox, Web Audio API, Service Workers
