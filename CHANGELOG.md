# Changelog

## v3.99.7 - Chat Proxy Lambda Improvements
- Added structured JSON logging to Chat Proxy Lambda (REQUEST, SUCCESS, ERROR types)
- Increased Chat Proxy timeout from 30s to 120s for complex queries
- Added CloudWatch Logs URL to documentation
- Documented Bedrock's lack of real streaming (buffers entire response)
- Added request tracking with requestId, duration, chunkCount, totalBytes
- Improved error logging with stack traces and AWS response details
- Created comprehensive Lambda architecture documentation

## v3.99.6 - ChatGPSY HTML Validation
- Centralized all DOM synchronization in updateUI() as single source of truth
- Removed direct DOM updates from setters (user, location, sessionDate, price)
- Setters now only update internal state and call updateUI()
- updateUI() reads private vars and updates DOM with conditional checks
- Eliminates duplication between setters and updateUI()
- Prevents potential circular update issues
- All 148 tests pass

## v3.99.4 - SessionStore Refactoring & Security
- Refactored SessionStore to consistently use setters for all state changes
- Split save() into save() (localStorage + DB) and saveToLocalStorage() (localStorage only)
- Fixed bug where localStorage wasn't updated when loading existing sessions
- Improved user setter and startOver() to use setters with _loading flag to prevent cascading saves
- Added Utils.sanitize() method to prevent XSS attacks (removes <, >, ; characters)
- Applied sanitization to loadUsers(), showLoadSession(), updateReadingsList()
- Added offline indicator badge in header with red "Offline" display
- Added updateOnlineStatus() function to monitor network changes and trigger sync
- Fixed createSession() to check for duplicates BEFORE insert attempt (not after)
- Added double confirmation to startNewSession() to prevent accidental data loss
- Fixed selectSession() to accept (sessionId, event) parameters explicitly
- Removed redundant test notification code from createSession()
- Network optimization: loadExistingSession() now only updates localStorage, avoiding redundant DB write

## v3.99.3 - CSS Button Consolidation
- Created base button system with `.btn` class and modifiers
- Added button variants: `btn-primary`, `btn-secondary`, `btn-danger`, `btn-ghost`, `btn-link`
- Added size modifiers: `btn-small`, `btn-large`, `btn-xlarge`
- Consolidated ~150 lines of duplicate CSS into reusable classes
- Updated all buttons in HTML and JS modules to use new classes
- Maintained backward compatibility with existing functionality

## v3.99.2 - ID Convention Implementation
- Added IDs to all unique buttons following {type}-{area}-{purpose} convention
- Added IDs to all unique containers following same convention
- Examples: btn-readings-add, btn-timer-start, container-readings-buttons
- IDs are additive (existing classes unchanged) for backward compatibility
- No functional changes, all 60 tests pass

## v3.99.1 - Session Creation UI Bug Fix
- Fixed bug where Add Reading and Delete Reading buttons disappeared after creating new session
- Added `updateUI()` call after successful session creation in SessionStore
- Added comprehensive DOM tests to verify button visibility across all session phases
- Added test for createSession flow that validates UI state changes
- Tests now check for presence/absence of UI elements (buttons, totals, readings list)

## v3.99.0 - Utils Module Extraction
- Extracted Utils class to `modules/utils.js`
- Removed ~100 lines of duplicate utility functions from index.html
- All utility functions now sourced from Utils module
- Integrated AnalyticsNotifier module for analytics notifications
- Reduced index.html from 1153 to 1053 lines (9% reduction)
- Modules export classes to window, index.html instantiates and exposes instances

## v3.97.0 - Code Modularization
- Extracted Timer class to `modules/timer.js`
- Extracted SettingsStore class to `modules/settings-store.js`
- Moved timer functions from index.html to Timer module
- Moved settings drawer functions to SettingsStore module
- Updated HTML onclick handlers to use module methods
- Removed duplicate functions from index.html
- Improved code organization and maintainability

## v3.96.0 - Icon Cleanup
- Removed cluttered icons from Reading Price, Event Name, Event Date labels
- Changed user icon from fa-user (\f007) to fa-id-card (\f2bd)
- Replaced Font Awesome icons in session list with bullet character (•)
- Kept icons in totals table for visual hierarchy
- User icon managed via CSS ::before pseudo-element

## v3.95.0 - Previous Version
(Add previous version notes here as needed)

## Version Management Rules
- **CRITICAL**: Version MUST be bumped on every code change
- Version displayed in header bar for cache-busting
- Update version in: index.html, README.md, .amazonq/rules/tarot-tracker-rules.md
