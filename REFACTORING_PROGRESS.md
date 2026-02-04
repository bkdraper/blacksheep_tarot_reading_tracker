# Refactoring Progress - Module Extraction

## Goal
Extract classes from index.html into separate modules for better maintainability and reduce file size.

## Completed ✅

### 1. Created `modules/` folder
- Organized all extracted modules in one place
- Moved existing modules into folder

### 2. Extracted Timer class → `modules/timer.js`
- Canvas-based countdown timer
- Audio alarm functionality
- Wake lock management
- ~255 lines extracted

### 3. Moved existing modules
- `session-store.js` → `modules/session-store.js`
- `gpsy-chat.js` → `modules/gpsy-chat.js`

## Next Steps

### 4. Update index.html
- [ ] Remove Timer class (lines 1987-2242)
- [ ] Update script tags to point to modules/ folder
- [ ] Bump version to v3.97.0

### 5. Extract SettingsStore class → `modules/settings-store.js`
- Settings management with localStorage
- Payment methods, sources, haptic feedback
- ~104 lines (lines 2242-2346)

### 6. Extract AnalyticsNotifier class → `modules/analytics.js`
- Analytics tracking
- Notification management

### 7. Extract utility functions → `modules/utils.js`
- vibrate(), showSnackbar(), showSheet(), hideSheet()
- Date formatting helpers
- UI helper functions

### 8. Extract settings UI functions → `modules/settings-ui.js`
- Payment methods sheet functions
- Sources sheet functions
- Export data function

## File Size Tracking
- **Before**: index.html = 3788 lines
- **After Timer extraction**: TBD
- **Target**: < 2500 lines

## Testing Checklist
After each extraction:
- [ ] Timer starts/pauses/resets correctly
- [ ] Canvas animation works
- [ ] Audio alarms play
- [ ] Settings persist
- [ ] Session management works
- [ ] Gpsy chat functions
- [ ] All inline onclick handlers work

## Deployment
After refactoring complete:
1. Test locally
2. Deploy to Amplify
3. Update version in README.md
4. Update CHANGELOG.md
