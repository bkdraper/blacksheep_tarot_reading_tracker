# Tarot Reading Tracker

Mobile-optimized single page app for tracking tarot readings and tips. Built with pure HTML/CSS/JS and Supabase cloud database.

## Version: v3.99.0

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

## Recent Changes (v3.99.0)
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
