# Session UX Redesign Spec

## Status: ✅ COMPLETE (v4.1.4)

---

## Problem Statement

The current collapsible "Event Settings" panel is clunky. It conflates session creation, session info display, and navigation controls (new/load) into one panel that is immediately in edit mode. Replacing it with a cleaner pattern.

---

## Two App Modes

### Mode 1: No Active Session
- Session bar shows `(no active session)`
- Readings section hidden
- Timer still accessible

### Mode 2: Active Session
- Session bar shows session info (read-only)
- Edit icon opens bottom sheet to edit
- Readings section visible and functional

---

## Session Types

Both types share the same DB schema and UX. `type` field drives which fields/options appear.

| Field | Event Session | Private Session |
|---|---|---|
| `location` | Event name (e.g. "Va Beach BMSE") | Client name (e.g. "Sarah M.") |
| `session_date` | Event date | Reading date |
| `reading_price` | Free-form input | Preset picker (from settings) |
| `type` | `event` | `private` |
| `source` options | Settings-driven (Referral, Renu, POG, Repeat, custom) | Settings-driven (Phone, In-Person, custom) |

### DB Change Required
- Add `type` column to `blacksheep_reading_tracker_sessions` — `'event' | 'private'`, default `'event'`
- Add `privateSources` to SettingsStore defaults (e.g. `['Phone', 'In-Person']`)
- Add `privatePricePresets` to SettingsStore defaults (e.g. `[60, 120, 150]`)

---

## New UI Components

### 1. Session Bar (replaces collapsible panel header)
- Slim single-line bar always visible at top of main content
- **No session**: `(no active session)` in muted text
- **Event active**: `📍 Va Beach BMSE · $65 · 10/15`
- **Private active**: `👤 Sarah M. · $120 · 10/15`
- Edit pencil icon (✏️) on the right — opens Edit Bottom Sheet
- Tapping the bar text does nothing (not a button)

### 2. Hamburger Menu (upper left, replaces session controls in panel)
- Popup menu (not a blade/drawer — only 4 items, these are actions not navigation)
- Items:
  - **New Event** → opens New Session Bottom Sheet (type: event)
  - **New Private Reading** → opens New Session Bottom Sheet (type: private)
  - **Load Session** → opens existing Load Session sheet (current behavior)
  - **End Session** → confirms and clears active session

### 3. New/Edit Session Bottom Sheet
- Slides up from bottom
- Reused for both New and Edit — pre-filled when editing, empty when new
- Fields vary by type (see below)
- Save button: creates or updates session, closes sheet, updates session bar

#### Event Session Fields
- Location (text input) — required
- Date (date input) — required, defaults to today
- Price (number input) — required, defaults to last used or 40

#### Private Session Fields
- Client Name (text input, maps to `location`) — required
- Date (date input) — required, defaults to today
- Price (toggle buttons from `privatePricePresets` setting) — required
- Source (toggle buttons: Phone / In-Person, from `privateSources` setting)

### 4. Session Bar Edit Mode
- Pencil icon only visible when session is active
- Opens same bottom sheet pre-filled with current session data
- Save persists to DB and updates bar

---

## Settings Changes Required

### New Settings Keys
```javascript
privateSources: ['Phone', 'In-Person']       // editable, same UI as event sources
privatePricePresets: [60, 120, 150]          // editable list of preset prices
```

### Settings UI
- Add "Private Reading Sources" section (same pattern as existing Sources customization)
- Add "Private Price Presets" section — list of dollar amounts, add/delete

---

## Source Behavior by Type

When logging a reading within a session:
- `type: 'event'` → source picker shows `settings.get('sources')` (existing)
- `type: 'private'` → source picker shows `settings.get('privateSources')`

---

## Analytics / Filtering

- `type` field enables filtering in Gpsy and reports
- Mixed view: all sessions together (default)
- Filtered: `type = 'event'` or `type = 'private'`
- Gpsy system prompt should be updated to describe the `type` field

---

## Implementation Order

1. DB migration — add `type` column
2. SettingsStore — add `privateSources`, `privatePricePresets`
3. Session bar component (read-only display)
4. Hamburger popup menu
5. New/Edit bottom sheet (event flavor first, then private)
6. Wire up source picker to session type
7. Remove old collapsible panel
8. Update Gpsy system prompt

---

## What Does NOT Change

- Reading log UI (price, tip, payment, source fields) — unchanged
- Load session sheet — unchanged
- Session data structure in localStorage — add `type` field only
- All existing event sessions default to `type: 'event'`
