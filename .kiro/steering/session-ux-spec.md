---
inclusion: manual
---

# Session UX Redesign Spec

## Status: BRAINSTORM / PRE-IMPLEMENTATION

## Problem

The current collapsible "Event Settings" panel is clunky. It conflates session creation, session info display, and navigation controls into one panel that's immediately in edit mode.

## Two App Modes

### Mode 1: No Active Session
- Session bar shows `(no active session)`
- Readings section hidden
- Timer still accessible

### Mode 2: Active Session
- Session bar shows session info (read-only)
- Edit icon opens bottom sheet
- Readings section visible and functional

## Session Types

Both share same DB schema and UX. `type` field drives which fields/options appear.

| Field | Event Session | Private Session |
|---|---|---|
| `location` | Event name (e.g. "Va Beach BMSE") | Client name (e.g. "Sarah M.") |
| `session_date` | Event date | Reading date |
| `reading_price` | Free-form input | Preset picker (from settings) |
| `type` | `event` | `private` |
| `source` options | Settings-driven (Referral, Renu, POG, Repeat, custom) | Settings-driven (Phone, In-Person, custom) |

## DB Changes Required
- Add `type` column to sessions table: `'event' | 'private'`, default `'event'`
- Add `privateSources` to SettingsStore (e.g. `['Phone', 'In-Person']`)
- Add `privatePricePresets` to SettingsStore (e.g. `[60, 120, 150]`)

## New UI Components

### 1. Session Bar (replaces collapsible panel header)
- Slim single-line bar at top of main content
- No session: `(no active session)` muted text
- Event active: `📍 Va Beach BMSE · $65 · 10/15`
- Private active: `👤 Sarah M. · $120 · 10/15`
- Edit pencil icon (✏️) on right — opens Edit Bottom Sheet

### 2. Hamburger Menu (upper left)
- Popup menu (not drawer — only 4 items, actions not navigation)
- Items: New Event, New Private Reading, Load Session, End Session

### 3. New/Edit Session Bottom Sheet
- Slides up from bottom, reused for New and Edit
- Event fields: Location (text), Date (date, defaults today), Price (number)
- Private fields: Client Name (text → maps to location), Date, Price (toggle presets), Source (toggle: Phone/In-Person)

### 4. Source Behavior by Type
- `type: 'event'` → source picker shows `settings.get('sources')`
- `type: 'private'` → source picker shows `settings.get('privateSources')`

## Implementation Order
1. DB migration — add `type` column
2. SettingsStore — add privateSources, privatePricePresets
3. Session bar component (read-only display)
4. Hamburger popup menu
5. New/Edit bottom sheet (event first, then private)
6. Wire up source picker to session type
7. Remove old collapsible panel
8. Update Gpsy system prompt

## What Does NOT Change
- Reading log UI (price, tip, payment, source fields)
- Load session sheet
- Session data structure in localStorage (just add `type` field)
- All existing sessions default to `type: 'event'`
