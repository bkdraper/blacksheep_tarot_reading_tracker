# Refactoring: Settings UI Module Extraction

## Overview
Extract settings UI functions from index.html to `modules/settings-ui.js` to complete the modularization effort.

## Context
- Current index.html: **876 lines** (down from 3788; much smaller than previous estimates)
- 8 modules complete (SessionStore, Timer, GpsyChat, SettingsStore, ReadingsManager, AnalyticsNotifier, Utils, Auth)
- Most settings UI already lives in SettingsStore (`openDrawer()`, `closeDrawer()`, `toggleSetting()`, `customizePaymentMethods()`, `customizeSources()`, payment/source CRUD)
- Remaining in index.html: `checkForUpdates()`, `clearCache()`, `showUpdateNotification()`, `updateApp()`, notification test functions, background sync handlers, and initialization code
- Goal: Extract remaining utility functions (app updates, notifications) to complete modularization

## Current State

### Completed Modules
- ✅ `modules/session-store.js` - SessionStore class
- ✅ `modules/timer.js` - Timer class (~255 lines)
- ✅ `modules/gpsy-chat.js` - GpsyChat class
- ✅ `modules/settings-store.js` - SettingsStore class (~104 lines)
- ✅ `modules/utils.js` - Utility functions
- ✅ `modules/analytics-notifier.js` - AnalyticsNotifier class
- ✅ `modules/readings-manager.js` - ReadingsManager class
- ✅ `modules/auth.js` - Auth class (Google OAuth, role-based access, profile menu) — added v3.99.7

### Remaining in index.html
App-level functions that could be extracted (NOT settings UI — those are already in SettingsStore):
- `checkForUpdates()` - Service worker update check
- `clearCache()` - Cache clear + reload
- `showUpdateNotification()` - Update available bar
- `updateApp()` - Skip waiting + reload
- `registerBackgroundSync()` - Background sync registration
- `handleBackgroundSync()` - Sync readings to DB
- `handleBackgroundBackup()` - Backup to localStorage
- `sendTestNotification()` / `showTestNotification()` - Dev test functions
- `updateOnlineStatus()` - Network status handler
- Initialization code (event listeners, instance creation)

## Requirements

### Extract Settings UI Module
**Priority**: Medium | **Effort**: Small

Create `modules/settings-ui.js` with all settings UI functions.

**Acceptance Criteria**:
- All settings UI functions moved to new module
- Settings drawer open/close works
- Dark mode toggle works
- Payment method management works
- Source management works
- All inline onclick handlers updated
- No functionality broken
- All tests pass

**Functions to Extract**:
```javascript
class SettingsUI {
  constructor(settingsStore, utils) {
    this.settingsStore = settingsStore;
    this.utils = utils;
  }
  
  // Drawer management
  showSettings()
  closeSettings()
  
  // Dark mode
  toggleDarkMode()
  
  // Payment methods
  updatePaymentMethods()
  addPaymentMethod()
  removePaymentMethod(method)
  
  // Sources
  updateSources()
  addSource()
  removeSource(source)
  
  // Notifications
  toggleNotifications()
  
  // Event handlers
  initEventHandlers()
}
```

## Implementation Plan

### Step 1: Create Module File
1. Create `modules/settings-ui.js`
2. Define SettingsUI class
3. Add constructor with dependencies
4. Export to window

### Step 2: Extract Functions
1. Copy settings UI functions from index.html
2. Convert to class methods
3. Update references to use `this.settingsStore`
4. Update references to use `this.utils`
5. Remove functions from index.html

### Step 3: Update HTML
1. Update onclick handlers to use `settingsUI.method()`
2. Verify all event listeners
3. Test drawer open/close
4. Test all settings features

### Step 4: Testing
1. Run existing test suite
2. Manual test all settings features
3. Test dark mode toggle
4. Test payment method CRUD
5. Test source CRUD
6. Test on mobile device

### Step 5: Cleanup
1. Remove extracted functions from index.html
2. Update comments
3. Verify line count reduction
4. Update documentation

## Files to Modify
- Create: `modules/settings-ui.js`
- Modify: `index.html` - Remove extracted functions, update handlers
- Modify: `__tests__/settings-ui.test.js` - Create if needed

## Testing Checklist
- [ ] Settings drawer opens
- [ ] Settings drawer closes
- [ ] Dark mode toggles
- [ ] Payment methods display
- [ ] Can add payment method
- [ ] Can remove payment method
- [ ] Sources display
- [ ] Can add source
- [ ] Can remove source
- [ ] Notifications toggle works
- [ ] All inline onclick handlers work
- [ ] No console errors
- [ ] All existing tests pass

## Success Metrics
- index.html reduced to < 1000 lines
- All settings features work
- No functionality broken
- Code is more maintainable
- Module pattern consistent with other modules

## Dependencies
- None (standalone refactoring)

## Risks
- Breaking existing onclick handlers
- Missing event listener updates
- Dark mode state management issues
- localStorage sync issues

## Module Pattern

### Export Pattern
```javascript
// modules/settings-ui.js
class SettingsUI {
  // ... class definition
}

// Export to window for global access
if (typeof window !== 'undefined') {
  window.SettingsUI = SettingsUI;
}

// Export for testing
if (typeof module !== 'undefined' && module.exports) {
  module.exports = SettingsUI;
}
```

### Usage Pattern
```javascript
// index.html
const settingsUI = new SettingsUI(settingsStore, utils);
window.settingsUI = settingsUI;
```

### HTML Handler Pattern
```html
<!-- Before -->
<button onclick="showSettings()">Settings</button>

<!-- After -->
<button onclick="settingsUI.showSettings()">Settings</button>
```

## References
- ROADMAP.md: Refactoring section
- CHANGELOG.md: Previous module extractions
- modules/settings-store.js: Settings data management
- modules/utils.js: Utility functions
