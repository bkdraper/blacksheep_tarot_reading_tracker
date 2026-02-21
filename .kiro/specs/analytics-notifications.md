# Analytics Notifications System

## Overview
Automated notification system that analyzes reading data and sends insights to users.

## Context
- Current implementation: `modules/analytics-notifier.js`
- Uses browser Notification API
- Requires user permission
- Analyzes patterns in reading data
- Sends daily/weekly summaries

## Features

### Daily Summary Notifications
**Trigger**: End of day (9 PM)

**Content**:
- Total earnings for the day
- Number of readings
- Average tip amount
- Comparison to previous day

**Example**:
```
Daily Summary
$450 from 18 readings
Avg tip: $25
↑ 15% from yesterday
```

### Weekend Goal Tracking
**Trigger**: Sunday evening (8 PM)

**Content**:
- Weekend total (Sat + Sun)
- Goal progress (if set)
- Comparison to last weekend

**Example**:
```
Weekend Recap
$1,250 from 45 readings
Goal: $1,000 ✓ Exceeded!
↑ 22% from last weekend
```

### Best Day Alerts
**Trigger**: Real-time when threshold exceeded

**Content**:
- Alert when day exceeds personal best
- Celebration message
- New record amount

**Example**:
```
New Record! 🎉
$650 today - your best day ever!
Previous best: $580
```

### Tip Trend Analysis
**Trigger**: Weekly (Monday morning)

**Content**:
- Average tip trend (up/down)
- Best tipping location
- Best tipping day of week

**Example**:
```
Weekly Insights
Avg tip: $28 (↑ $3)
Best location: Denver
Best day: Saturday
```

### Peak Time Detection
**Trigger**: After 20+ readings in a session

**Content**:
- Busiest hour of the day
- Earnings during peak time
- Suggestion for future scheduling

**Example**:
```
Peak Time Detected
2-4 PM: 12 readings, $340
Consider scheduling more afternoon sessions
```

## Implementation

### AnalyticsNotifier Class
```javascript
class AnalyticsNotifier {
  constructor(sessionStore) {
    this.sessionStore = sessionStore;
    this.enabled = false;
  }
  
  // Permission management
  async requestPermission()
  checkPermission()
  
  // Notification scheduling
  scheduleDailySummary()
  scheduleWeekendRecap()
  
  // Real-time alerts
  checkForNewRecord()
  checkForPeakTime()
  
  // Data analysis
  calculateDailyStats()
  calculateWeekendStats()
  analyzeTipTrends()
  detectPeakTimes()
  
  // Notification sending
  sendNotification(title, body, data)
}
```

### Notification Permissions
- Request permission on first app load
- Store permission state in localStorage
- Show permission prompt in settings
- Respect user's notification preferences

### Scheduling Strategy
- Use `setTimeout` for same-day notifications
- Use `setInterval` for recurring checks
- Check on app load for missed notifications
- Store last notification time in localStorage

### Data Analysis Methods

#### Daily Stats
```javascript
calculateDailyStats(date) {
  const readings = this.getReadingsForDate(date);
  return {
    total: sum(readings.map(r => r.tip)),
    count: readings.length,
    average: average(readings.map(r => r.tip)),
    comparison: this.compareToYesterday(date)
  };
}
```

#### Trend Analysis
```javascript
analyzeTipTrends(days = 7) {
  const recentReadings = this.getRecentReadings(days);
  const avgTip = average(recentReadings.map(r => r.tip));
  const previousAvg = this.getPreviousAverage(days);
  return {
    current: avgTip,
    previous: previousAvg,
    change: avgTip - previousAvg,
    trend: avgTip > previousAvg ? 'up' : 'down'
  };
}
```

#### Peak Time Detection
```javascript
detectPeakTimes(readings) {
  const hourlyGroups = groupBy(readings, r => 
    new Date(r.timestamp).getHours()
  );
  const peakHour = maxBy(hourlyGroups, g => g.length);
  return {
    hour: peakHour.key,
    count: peakHour.length,
    earnings: sum(peakHour.map(r => r.tip))
  };
}
```

## User Settings

### Notification Preferences
- Enable/disable notifications
- Choose notification types
- Set quiet hours
- Set goal amounts

### Settings UI
```html
<div class="settings-section">
  <h3>Notifications</h3>
  <label>
    <input type="checkbox" id="notifications-enabled">
    Enable notifications
  </label>
  <label>
    <input type="checkbox" id="daily-summary">
    Daily summary (9 PM)
  </label>
  <label>
    <input type="checkbox" id="weekend-recap">
    Weekend recap (Sunday 8 PM)
  </label>
  <label>
    <input type="checkbox" id="best-day-alerts">
    Best day alerts
  </label>
  <label>
    <input type="checkbox" id="tip-trends">
    Weekly tip trends (Monday)
  </label>
</div>
```

## Testing

### Manual Testing
- Test permission request flow
- Test daily summary at 9 PM
- Test weekend recap on Sunday
- Test best day alert with high earnings
- Test tip trend analysis
- Test peak time detection

### Automated Testing
```javascript
describe('AnalyticsNotifier', () => {
  test('calculates daily stats correctly');
  test('detects new records');
  test('analyzes tip trends');
  test('detects peak times');
  test('respects user preferences');
  test('handles permission denial');
});
```

## Browser Compatibility
- Notification API: All modern browsers
- Service Worker: Required for background notifications
- Fallback: In-app toast messages if notifications blocked

## Privacy & Data
- All analysis done locally (no external API)
- No data sent to external servers
- User can disable at any time
- Respects browser notification settings

## Future Enhancements
- Custom goal setting
- Location-based insights
- Payment method analysis
- Source effectiveness tracking
- Multi-user comparisons
- Export insights as PDF

## References
- modules/analytics-notifier.js: Current implementation
- ROADMAP.md: Future enhancements
- Notification API docs: https://developer.mozilla.org/en-US/docs/Web/API/Notifications_API
