# Session Management System

## Overview
Core session state management with cloud sync, localStorage backup, and multi-user support.

## Context
- Current implementation: `modules/session-store.js`
- Supabase PostgreSQL database
- localStorage backup for offline
- Debounced auto-save on state changes
- Multi-user data separation

## Data Structure

### Session Object
```javascript
{
  sessionId: "uuid",           // Unique identifier
  user: "Amanda",              // User name
  location: "Denver Fall 25",  // Event location
  sessionDate: "2025-01-15",   // YYYY-MM-DD format
  price: 40,                   // Default reading price
  readings: [],                // Array of Reading objects
  _loading: false              // Prevents saves during restoration
}
```

### Reading Object
```javascript
{
  timestamp: "2025-01-15T14:30:00.000Z",  // ISO datetime
  tip: 10,                                 // Numeric tip amount
  price: 40,                               // Null uses session price
  payment: "cash",                         // Payment method
  source: "referral"                       // Reading source
}
```

## SessionStore Class

### Properties
```javascript
class SessionStore {
  sessionId = null;
  user = null;
  location = null;
  sessionDate = null;
  price = null;
  readings = [];
  _loading = false;
  _saveTimeout = null;
}
```

### Computed Properties
```javascript
get canCreateSession() {
  return this.user && this.location && this.sessionDate && this.price;
}

get hasValidSession() {
  return this.sessionId !== null;
}

get sessionPhase() {
  if (!this.user) return 'no-user';
  if (!this.canCreateSession) return 'incomplete';
  if (!this.hasValidSession) return 'ready';
  return 'active';
}

get totalEarnings() {
  return this.readings.reduce((sum, r) => sum + (r.tip || 0), 0);
}

get totalReadings() {
  return this.readings.length;
}

get averageTip() {
  return this.readings.length > 0 
    ? this.totalEarnings / this.readings.length 
    : 0;
}
```

### Core Methods

#### Session Creation
```javascript
async createSession() {
  // Validate required fields
  if (!this.canCreateSession) {
    throw new Error('Missing required fields');
  }
  
  // Check for duplicate session
  const existing = await this.checkDuplicateSession();
  if (existing) {
    const confirmed = confirm('Session exists. Load it?');
    if (confirmed) {
      await this.loadExistingSession(existing.id);
      return;
    }
  }
  
  // Create new session
  const { data, error } = await supabaseClient
    .from('blacksheep_reading_tracker_sessions')
    .insert({
      session_date: this.sessionDate,
      location: this.location,
      reading_price: this.price,
      user_name: this.user,
      readings: []
    })
    .select()
    .single();
  
  if (error) throw error;
  
  this.sessionId = data.id;
  this.readings = [];
  this.save();
  updateUI();
}
```

#### Session Loading
```javascript
async loadExistingSession(sessionId) {
  this._loading = true;
  
  const { data, error } = await supabaseClient
    .from('blacksheep_reading_tracker_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();
  
  if (error) throw error;
  
  // Restore state
  this.sessionId = data.id;
  this.user = data.user_name;
  this.location = data.location;
  this.sessionDate = data.session_date;
  this.price = data.reading_price;
  this.readings = data.readings || [];
  
  // Save to localStorage only (no DB write)
  this.saveToLocalStorage();
  
  this._loading = false;
  updateUI();
}
```

#### Auto-Save with Debouncing
```javascript
save() {
  if (this._loading) return;
  
  // Save to localStorage immediately
  this.saveToLocalStorage();
  
  // Debounce database save
  clearTimeout(this._saveTimeout);
  this._saveTimeout = setTimeout(() => {
    this.saveToDatabase();
  }, 1000);
}

saveToLocalStorage() {
  localStorage.setItem('sessionState', JSON.stringify({
    sessionId: this.sessionId,
    user: this.user,
    location: this.location,
    sessionDate: this.sessionDate,
    price: this.price,
    readings: this.readings
  }));
}

async saveToDatabase() {
  if (!this.sessionId) return;
  
  const { error } = await supabaseClient
    .from('blacksheep_reading_tracker_sessions')
    .update({
      readings: this.readings,
      updated_at: new Date().toISOString()
    })
    .eq('id', this.sessionId);
  
  if (error) console.error('Save failed:', error);
}
```

#### Reading Management
```javascript
addReading(reading) {
  // Use session price if reading price is null
  if (reading.price === null) {
    reading.price = this.price;
  }
  
  this.readings.push(reading);
  this.save();
  updateUI();
}

deleteReading(index) {
  this.readings.splice(index, 1);
  this.save();
  updateUI();
}

updateReading(index, updates) {
  this.readings[index] = { ...this.readings[index], ...updates };
  this.save();
  updateUI();
}
```

#### State Restoration
```javascript
restoreFromLocalStorage() {
  const saved = localStorage.getItem('sessionState');
  if (!saved) return false;
  
  this._loading = true;
  const state = JSON.parse(saved);
  
  this.sessionId = state.sessionId;
  this.user = state.user;
  this.location = state.location;
  this.sessionDate = state.sessionDate;
  this.price = state.price;
  this.readings = state.readings || [];
  
  this._loading = false;
  updateUI();
  return true;
}
```

#### Start Over
```javascript
startOver() {
  const confirmed = confirm('Start new session? Current data will be saved.');
  if (!confirmed) return;
  
  this._loading = true;
  
  this.sessionId = null;
  this.location = null;
  this.sessionDate = null;
  this.price = null;
  this.readings = [];
  
  this.saveToLocalStorage();
  this._loading = false;
  updateUI();
}
```

## Database Schema

### Supabase Table: `blacksheep_reading_tracker_sessions`
```sql
CREATE TABLE blacksheep_reading_tracker_sessions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  session_date DATE NOT NULL,
  location TEXT NOT NULL,
  reading_price NUMERIC NOT NULL,
  readings JSONB DEFAULT '[]'::jsonb,
  user_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX idx_user_name ON blacksheep_reading_tracker_sessions(user_name);
CREATE INDEX idx_session_date ON blacksheep_reading_tracker_sessions(session_date);
CREATE INDEX idx_location ON blacksheep_reading_tracker_sessions(location);
```

## Critical Implementation Notes

### Timezone Handling
**CRITICAL**: Avoid timezone bugs

```javascript
// ❌ WRONG - Creates UTC date, shifts by timezone
const date = new Date('2025-01-15');

// ✅ CORRECT - Use raw string for display
const displayDate = '2025-01-15';

// ✅ CORRECT - Normalize before Date conversion
const normalized = '2025-01-15'.replace(/-/g, '/'); // "2025/01/15"
const date = new Date(normalized); // Local timezone
```

### Loading Flag
**CRITICAL**: Prevents cascading saves during restoration

```javascript
// Always set _loading = true before bulk state changes
this._loading = true;
this.user = data.user_name;
this.location = data.location;
// ... more state changes
this._loading = false;

// Setters check _loading flag
set user(value) {
  this._user = value;
  if (!this._loading) {
    this.save();
    updateUI();
  }
}
```

### Duplicate Session Prevention
```javascript
async checkDuplicateSession() {
  const { data } = await supabaseClient
    .from('blacksheep_reading_tracker_sessions')
    .select('id')
    .eq('user_name', this.user)
    .eq('location', this.location)
    .eq('session_date', this.sessionDate)
    .maybeSingle();
  
  return data;
}
```

## Testing

### Unit Tests
```javascript
describe('SessionStore', () => {
  test('creates session with valid data');
  test('prevents creation without required fields');
  test('loads existing session');
  test('restores from localStorage');
  test('adds reading correctly');
  test('deletes reading correctly');
  test('calculates totals correctly');
  test('prevents saves during loading');
  test('checks for duplicate sessions');
});
```

### Integration Tests
```javascript
describe('SessionStore Integration', () => {
  test('creates and loads session from database');
  test('syncs changes to database');
  test('handles offline mode');
  test('restores after page reload');
});
```

## Error Handling

### Network Errors
```javascript
async saveToDatabase() {
  try {
    const { error } = await supabaseClient
      .from('blacksheep_reading_tracker_sessions')
      .update({ readings: this.readings })
      .eq('id', this.sessionId);
    
    if (error) throw error;
  } catch (err) {
    console.error('Save failed:', err);
    // Data still in localStorage, will retry on next save
  }
}
```

### Validation Errors
```javascript
async createSession() {
  if (!this.user) throw new Error('User required');
  if (!this.location) throw new Error('Location required');
  if (!this.sessionDate) throw new Error('Date required');
  if (!this.price || this.price <= 0) throw new Error('Valid price required');
  
  // ... proceed with creation
}
```

## Performance Optimizations

### Debounced Saves
- localStorage: Immediate (synchronous)
- Database: Debounced 1 second
- Prevents excessive API calls
- Ensures data safety

### Computed Properties
- Cached calculations
- No redundant loops
- Efficient totals computation

### Selective Updates
- Only update changed fields
- Use `maybeSingle()` for optional queries
- Batch reading updates

## Future Enhancements
- Conflict resolution for concurrent edits
- Optimistic UI updates
- Offline queue for failed saves
- Session templates
- Bulk import/export
- Session sharing

## References
- modules/session-store.js: Current implementation
- ARCHITECTURE.md: Database schema
- CHANGELOG.md: Version history
