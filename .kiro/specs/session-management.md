# Session Management System

## Overview
Core session state management with cloud sync, localStorage backup, and multi-user support via Google OAuth.

## Current State (v4.0.1) ✅ IMPLEMENTED

### Architecture
- `modules/session-store.js` — SessionStore class
- `modules/auth.js` — Auth class (single source of truth for userId/userName)
- Supabase PostgreSQL with normalized schema
- localStorage backup for offline
- Debounced auto-save on state changes

### Key Design Decisions
- **Auth is source of truth**: SessionStore reads userId/userName from `window.auth` via getters (never stores user data internally)
- **Normalized readings**: Individual readings stored in `blacksheep_reading_tracker_readings` table (not JSONB)
- **Session metadata only**: `save()` updates session metadata — no JSONB writes
- **user_name snapshot**: Stored in sessions table at creation time for historical accuracy

## Data Structure

### Session State (in-memory)
```javascript
{
  sessionId: "uuid",
  location: "Denver Fall 25",
  sessionDate: "2025-01-15",   // YYYY-MM-DD
  price: 40,
  readings: [],                // In-memory array
  _loading: false              // Prevents saves during restoration
  // userId and userName come from window.auth
}
```

### Reading Object (in-memory + normalized DB table)
```javascript
{
  id: "uuid",                              // Set after DB insert; null for unsaved
  timestamp: "2025-01-15T14:30:00.000Z",
  tip: 10,
  price: 40,                               // Null uses session price
  payment: "cash",                         // cash|cc|venmo|paypal|cashapp|custom
  source: "referral"                       // referral|renu|pog|repeat|custom
}
```

## Database Schema

### `blacksheep_reading_tracker_sessions`
- `id` (uuid, PK, default gen_random_uuid())
- `session_date` (date, default CURRENT_DATE)
- `location` (text, nullable)
- `selected_day` (text, nullable) — legacy column, no longer used (predecessor to session_date)
- `reading_price` (numeric, nullable)
- `readings` (jsonb, default '[]') — legacy column, no longer written to
- `user_name` (text, NOT NULL) — snapshot at session creation
- `user_id` (uuid, nullable) — references auth.users
- `created_at`, `updated_at` (timestamptz)

### `blacksheep_reading_tracker_readings` (Normalized)
- `id` (uuid, PK, default gen_random_uuid())
- `session_id` (uuid, FK → sessions.id, NOT NULL)
- `timestamp` (timestamptz, NOT NULL)
- `tip` (numeric, nullable, default 0)
- `price` (numeric, nullable) — NULL uses session price
- `payment` (text, nullable)
- `source` (text, nullable)
- `created_at` (timestamptz, default now())
- Indexes: session_id, timestamp, LOWER(payment), LOWER(source)
- RLS: **disabled** (server-side access via anon key)

## SessionStore Class

### Computed Properties
```javascript
get canCreateSession()  // user && location && sessionDate && price
get hasValidSession()   // sessionId !== null
get sessionPhase()      // 'no-user' | 'incomplete' | 'ready' | 'active'
get userId()            // from window.auth.userId
get userName()          // from window.auth.userName
```

### Core Methods
- `createSession()` — validates, checks duplicates, inserts to DB, calls updateUI()
- `loadExistingSession(sessionId)` — fetches from normalized readings table, sets _loading flag
- `save()` — updates session metadata only (no JSONB)
- `saveToLocalStorage()` — immediate localStorage write
- `addReading(reading)` — inserts to normalized readings table, gets back id
- `removeReading(index)` — deletes from normalized table by id
- `updateReading(index, updates)` — updates normalized table row
- `startOver()` — clears session state with _loading flag
- `restoreFromLocalStorage()` — restores state with _loading flag

### Critical Implementation Notes

#### _loading Flag
MUST prevent saves during restoration:
```javascript
this._loading = true;
// ... bulk state changes ...
this._loading = false;
```

#### Timezone Handling
- Use raw YYYY-MM-DD strings for display
- NEVER convert through Date() without normalizing
- YYYY-MM-DD → MM/DD/YYYY before Date() conversion

#### Duplicate Session Prevention
Check BEFORE insert (not after) using user_id + location + session_date.

## Testing
- 223 tests across 8 suites (all passing)
- `__tests__/session-store.test.js` — unit tests
- `__tests__/integration.test.js` — workflow tests
- jest.setup.js — single source of truth for Supabase mock

## References
- `modules/session-store.js`: Implementation
- `modules/auth.js`: Auth (userId/userName source)
- `docs/ARCHITECTURE.md`: Full schema details
