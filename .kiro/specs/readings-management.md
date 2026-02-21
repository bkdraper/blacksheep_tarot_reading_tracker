# Readings Management System

## Overview
CRUD operations for individual readings with payment methods, sources, and tip tracking.

## Context
- Current implementation: `modules/readings-manager.js`
- Integrates with SessionStore for data persistence
- Sheet-based UI for payment/source selection
- Real-time totals calculation

## Data Structure

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

### Payment Methods
**Default Options**:
- cash
- cc (credit card)
- venmo
- paypal
- cashapp
- custom (user-defined)

**Customization**:
- Users can add custom payment methods
- Stored in SettingsStore
- Persisted to localStorage

### Sources
**Default Options**:
- referral
- renu (Renaissance Festival)
- pog (Pikes Peak or Bust)
- repeat (repeat customer)
- custom (user-defined)

**Customization**:
- Users can add custom sources
- Stored in SettingsStore
- Persisted to localStorage

## ReadingsManager Class

### Constructor
```javascript
class ReadingsManager {
  constructor(sessionStore, settingsStore, utils) {
    this.sessionStore = sessionStore;
    this.settingsStore = settingsStore;
    this.utils = utils;
  }
}
```

### Core Methods

#### Add Reading
```javascript
addReading() {
  const tipInput = document.getElementById('tip-input');
  const tip = parseFloat(tipInput.value);
  
  if (isNaN(tip) || tip < 0) {
    this.utils.showToast('Please enter a valid tip amount');
    return;
  }
  
  // Show payment method sheet
  this.showPaymentSheet(tip);
}

showPaymentSheet(tip) {
  this.currentTip = tip;
  
  // Populate payment methods
  const container = document.getElementById('payment-methods');
  container.innerHTML = '';
  
  this.settingsStore.paymentMethods.forEach(method => {
    const button = document.createElement('button');
    button.className = 'payment-option';
    button.textContent = method;
    button.onclick = () => this.selectPayment(method);
    container.appendChild(button);
  });
  
  this.utils.showSheet('payment-sheet');
}

selectPayment(payment) {
  this.currentPayment = payment;
  this.utils.hideSheet('payment-sheet');
  
  // Show source sheet
  this.showSourceSheet();
}

showSourceSheet() {
  const container = document.getElementById('sources');
  container.innerHTML = '';
  
  this.settingsStore.sources.forEach(source => {
    const button = document.createElement('button');
    button.className = 'source-option';
    button.textContent = source;
    button.onclick = () => this.selectSource(source);
    container.appendChild(button);
  });
  
  this.utils.showSheet('source-sheet');
}

selectSource(source) {
  this.utils.hideSheet('source-sheet');
  
  // Create reading object
  const reading = {
    timestamp: new Date().toISOString(),
    tip: this.currentTip,
    price: null, // Uses session price
    payment: this.currentPayment,
    source: source
  };
  
  // Add to session
  this.sessionStore.addReading(reading);
  
  // Clear input and show feedback
  document.getElementById('tip-input').value = '';
  this.utils.vibrate(50);
  this.utils.showToast(`Reading added: $${this.currentTip}`);
  
  // Reset state
  this.currentTip = null;
  this.currentPayment = null;
}
```

#### Delete Reading
```javascript
deleteReading(index) {
  const reading = this.sessionStore.readings[index];
  const confirmed = confirm(`Delete reading: $${reading.tip}?`);
  
  if (!confirmed) return;
  
  this.sessionStore.deleteReading(index);
  this.utils.vibrate(100);
  this.utils.showToast('Reading deleted');
}
```

#### Update Readings List
```javascript
updateReadingsList() {
  const container = document.getElementById('readings-list');
  const readings = this.sessionStore.readings;
  
  if (readings.length === 0) {
    container.innerHTML = '<p class="empty-state">No readings yet</p>';
    return;
  }
  
  container.innerHTML = readings.map((reading, index) => {
    const time = new Date(reading.timestamp).toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit'
    });
    
    return `
      <div class="reading-item">
        <div class="reading-time">${time}</div>
        <div class="reading-tip">$${reading.tip}</div>
        <div class="reading-payment">${reading.payment}</div>
        <div class="reading-source">${reading.source}</div>
        <button 
          class="btn-delete" 
          onclick="readingsManager.deleteReading(${index})"
          aria-label="Delete reading">
          ×
        </button>
      </div>
    `;
  }).join('');
}
```

#### Calculate Totals
```javascript
calculateTotals() {
  const readings = this.sessionStore.readings;
  
  return {
    total: readings.reduce((sum, r) => sum + r.tip, 0),
    count: readings.length,
    average: readings.length > 0 
      ? readings.reduce((sum, r) => sum + r.tip, 0) / readings.length 
      : 0,
    byPayment: this.groupByPayment(readings),
    bySource: this.groupBySource(readings)
  };
}

groupByPayment(readings) {
  const groups = {};
  readings.forEach(r => {
    if (!groups[r.payment]) {
      groups[r.payment] = { count: 0, total: 0 };
    }
    groups[r.payment].count++;
    groups[r.payment].total += r.tip;
  });
  return groups;
}

groupBySource(readings) {
  const groups = {};
  readings.forEach(r => {
    if (!groups[r.source]) {
      groups[r.source] = { count: 0, total: 0 };
    }
    groups[r.source].count++;
    groups[r.source].total += r.tip;
  });
  return groups;
}
```

#### Update Totals Display
```javascript
updateTotalsDisplay() {
  const totals = this.calculateTotals();
  
  document.getElementById('total-earnings').textContent = 
    `$${totals.total.toFixed(2)}`;
  document.getElementById('total-readings').textContent = 
    totals.count;
  document.getElementById('average-tip').textContent = 
    `$${totals.average.toFixed(2)}`;
  
  // Update payment breakdown
  const paymentContainer = document.getElementById('payment-breakdown');
  paymentContainer.innerHTML = Object.entries(totals.byPayment)
    .map(([method, data]) => `
      <div class="breakdown-item">
        <span>${method}</span>
        <span>${data.count} × $${(data.total / data.count).toFixed(2)}</span>
        <span>$${data.total.toFixed(2)}</span>
      </div>
    `).join('');
  
  // Update source breakdown
  const sourceContainer = document.getElementById('source-breakdown');
  sourceContainer.innerHTML = Object.entries(totals.bySource)
    .map(([source, data]) => `
      <div class="breakdown-item">
        <span>${source}</span>
        <span>${data.count} readings</span>
        <span>$${data.total.toFixed(2)}</span>
      </div>
    `).join('');
}
```

## UI Components

### Add Reading Form
```html
<div class="add-reading-form">
  <input 
    type="number" 
    id="tip-input" 
    placeholder="Tip amount"
    min="0"
    step="0.01"
    inputmode="decimal">
  <button 
    id="btn-readings-add" 
    class="btn btn-primary"
    onclick="readingsManager.addReading()">
    + Add Reading
  </button>
</div>
```

### Payment Method Sheet
```html
<div id="payment-sheet" class="sheet">
  <div class="sheet-header">
    <h3>Payment Method</h3>
    <button onclick="utils.hideSheet('payment-sheet')">×</button>
  </div>
  <div id="payment-methods" class="payment-methods">
    <!-- Populated dynamically -->
  </div>
</div>
```

### Source Sheet
```html
<div id="source-sheet" class="sheet">
  <div class="sheet-header">
    <h3>Reading Source</h3>
    <button onclick="utils.hideSheet('source-sheet')">×</button>
  </div>
  <div id="sources" class="sources">
    <!-- Populated dynamically -->
  </div>
</div>
```

### Readings List
```html
<div id="readings-list" class="readings-list">
  <!-- Populated dynamically -->
</div>
```

### Totals Display
```html
<div class="totals-container">
  <div class="total-item">
    <span class="total-label">Total Earnings</span>
    <span id="total-earnings" class="total-value">$0.00</span>
  </div>
  <div class="total-item">
    <span class="total-label">Readings</span>
    <span id="total-readings" class="total-value">0</span>
  </div>
  <div class="total-item">
    <span class="total-label">Average Tip</span>
    <span id="average-tip" class="total-value">$0.00</span>
  </div>
</div>

<div class="breakdown-section">
  <h3>By Payment Method</h3>
  <div id="payment-breakdown"></div>
</div>

<div class="breakdown-section">
  <h3>By Source</h3>
  <div id="source-breakdown"></div>
</div>
```

## Validation Rules

### Tip Amount
- Must be numeric
- Must be >= 0
- Decimal precision: 2 places
- Empty input shows error

### Payment Method
- Must select from available options
- Cannot proceed without selection
- Custom methods validated for uniqueness

### Source
- Must select from available options
- Cannot proceed without selection
- Custom sources validated for uniqueness

## User Experience

### Add Reading Flow
1. User enters tip amount
2. Clicks "Add Reading"
3. Payment method sheet appears
4. User selects payment method
5. Source sheet appears
6. User selects source
7. Reading added with haptic feedback
8. Toast confirmation shown
9. Input cleared for next reading

### Delete Reading Flow
1. User clicks × button on reading
2. Confirmation dialog appears
3. User confirms deletion
4. Reading removed with haptic feedback
5. Toast confirmation shown
6. Totals updated automatically

## Mobile Optimizations

### Touch Targets
- All buttons: 44px minimum
- Sheet options: 56px height
- Delete buttons: 44px × 44px

### Input Handling
- Numeric keyboard for tip input
- Auto-focus after adding reading
- Clear input after submission

### Haptic Feedback
- 50ms vibration on add
- 100ms vibration on delete
- Provides tactile confirmation

## Testing

### Unit Tests
```javascript
describe('ReadingsManager', () => {
  test('adds reading with valid data');
  test('validates tip amount');
  test('shows payment sheet');
  test('shows source sheet');
  test('deletes reading with confirmation');
  test('calculates totals correctly');
  test('groups by payment method');
  test('groups by source');
  test('updates display correctly');
});
```

### Integration Tests
```javascript
describe('ReadingsManager Integration', () => {
  test('complete add reading flow');
  test('complete delete reading flow');
  test('updates session store');
  test('persists to database');
  test('restores from localStorage');
});
```

### Manual Testing
- Test add reading flow on mobile
- Test delete reading flow
- Verify totals calculation
- Test with custom payment methods
- Test with custom sources
- Verify haptic feedback
- Test sheet animations

## Performance

### Optimizations
- Debounced totals calculation
- Efficient array operations
- Minimal DOM updates
- Cached calculations

### Considerations
- Large reading lists (100+)
- Frequent additions/deletions
- Real-time totals updates

## Future Enhancements
- Edit existing readings
- Bulk delete
- Reading notes/comments
- Photo attachments
- Reading duration tracking
- Customer name tracking
- Export readings as CSV
- Reading statistics dashboard

## References
- modules/readings-manager.js: Current implementation
- modules/session-store.js: Data persistence
- modules/settings-store.js: Payment/source customization
- ARCHITECTURE.md: Data structure details
