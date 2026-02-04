# Changelog

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
