# Timer System

## Overview
Canvas-based circular countdown timer with audio alarms and screen wake lock.

## Context
- Current implementation: `modules/timer.js`
- Canvas size: 300x300px
- Web Audio API for alarms
- Screen Wake Lock API + silent audio fallback
- requestAnimationFrame for smooth rendering

## Features

### Circular Countdown Display
**Visual Design**:
- Circular progress ring
- Center displays remaining time (MM:SS)
- Color changes based on time remaining
- Smooth animation using requestAnimationFrame

**Colors**:
- Normal: Purple (#8b5cf6)
- Warning (<5 min): Orange (#f59e0b)
- Critical (<1 min): Red (#ef4444)
- Dark mode: Adjusted colors

### Audio Alarms
**Implementation**: Web Audio API

**Alarm Types**:
- 1000Hz square wave
- 3-second duration
- Repeats 3 times with 1-second gaps
- Volume: 0.3 (adjustable)

**Technical Notes**:
```javascript
playAlarm() {
  const audioContext = new (window.AudioContext || window.webkitAudioContext)();
  const oscillator = audioContext.createOscillator();
  const gainNode = audioContext.createGain();
  
  oscillator.type = 'square';
  oscillator.frequency.value = 1000;
  gainNode.gain.value = 0.3;
  
  oscillator.connect(gainNode);
  gainNode.connect(audioContext.destination);
  
  oscillator.start();
  oscillator.stop(audioContext.currentTime + 3);
}
```

### Screen Wake Lock
**Purpose**: Prevent screen from sleeping during readings

**Implementation**:
- Primary: Screen Wake Lock API (where supported)
- Fallback: Silent audio loop

**Technical Notes**:
```javascript
async requestWakeLock() {
  try {
    // Try Screen Wake Lock API first
    if ('wakeLock' in navigator) {
      this.wakeLock = await navigator.wakeLock.request('screen');
      console.log('Wake Lock active');
    } else {
      // Fallback: silent audio
      this.startSilentAudio();
    }
  } catch (err) {
    console.error('Wake Lock failed', err);
    this.startSilentAudio();
  }
}

startSilentAudio() {
  const audio = new Audio();
  audio.src = 'data:audio/wav;base64,UklGRigAAABXQVZFZm10...';
  audio.loop = true;
  audio.volume = 0;
  audio.play();
  this.silentAudio = audio;
}
```

### Notification System
**Integration**: Service Worker notifications

**Features**:
- Browser notification when timer completes
- Works even when app in background
- Requires notification permission

**Implementation**:
```javascript
showNotification() {
  if ('Notification' in window && Notification.permission === 'granted') {
    navigator.serviceWorker.ready.then(registration => {
      registration.showNotification('Timer Complete', {
        body: 'Your reading session has ended',
        icon: '/logo192.png',
        badge: '/logo192.png',
        vibrate: [200, 100, 200]
      });
    });
  }
}
```

### Canvas Rendering
**Animation Loop**:
```javascript
animate() {
  if (!this.isRunning) return;
  
  const now = Date.now();
  const elapsed = now - this.startTime;
  const remaining = Math.max(0, this.duration - elapsed);
  
  this.draw(remaining);
  
  if (remaining > 0) {
    requestAnimationFrame(() => this.animate());
  } else {
    this.onComplete();
  }
}

draw(remaining) {
  const ctx = this.canvas.getContext('2d');
  const centerX = 150;
  const centerY = 150;
  const radius = 120;
  
  // Clear canvas
  ctx.clearRect(0, 0, 300, 300);
  
  // Draw background circle
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, 0, 2 * Math.PI);
  ctx.strokeStyle = '#e5e7eb';
  ctx.lineWidth = 10;
  ctx.stroke();
  
  // Draw progress arc
  const progress = remaining / this.duration;
  const endAngle = -Math.PI / 2 + (2 * Math.PI * progress);
  
  ctx.beginPath();
  ctx.arc(centerX, centerY, radius, -Math.PI / 2, endAngle);
  ctx.strokeStyle = this.getColor(remaining);
  ctx.lineWidth = 10;
  ctx.stroke();
  
  // Draw time text
  const minutes = Math.floor(remaining / 60000);
  const seconds = Math.floor((remaining % 60000) / 1000);
  ctx.font = '48px sans-serif';
  ctx.fillStyle = this.getColor(remaining);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(`${minutes}:${seconds.toString().padStart(2, '0')}`, centerX, centerY);
}

getColor(remaining) {
  if (remaining < 60000) return '#ef4444'; // Red
  if (remaining < 300000) return '#f59e0b'; // Orange
  return '#8b5cf6'; // Purple
}
```

## Timer Class API

### Constructor
```javascript
constructor(canvasId, duration = 900000) {
  this.canvas = document.getElementById(canvasId);
  this.duration = duration; // Default 15 minutes
  this.isRunning = false;
  this.startTime = null;
  this.wakeLock = null;
  this.silentAudio = null;
}
```

### Methods
```javascript
start()           // Start timer
pause()           // Pause timer
resume()          // Resume timer
reset()           // Reset to initial duration
stop()            // Stop and reset
setDuration(ms)   // Change duration
getRemainingTime() // Get remaining milliseconds
```

### Events
```javascript
onComplete()      // Called when timer reaches 0
onTick(remaining) // Called each animation frame
```

## UI Controls

### Timer Buttons
```html
<div class="timer-controls">
  <button id="btn-timer-start" onclick="timer.start()">Start</button>
  <button id="btn-timer-pause" onclick="timer.pause()">Pause</button>
  <button id="btn-timer-reset" onclick="timer.reset()">Reset</button>
</div>
```

### Duration Selector
```html
<select id="timer-duration" onchange="timer.setDuration(this.value)">
  <option value="300000">5 minutes</option>
  <option value="600000">10 minutes</option>
  <option value="900000" selected>15 minutes</option>
  <option value="1200000">20 minutes</option>
  <option value="1800000">30 minutes</option>
</select>
```

## Testing

### Manual Testing
- Start timer and verify countdown
- Test pause/resume functionality
- Test reset button
- Verify alarm plays at completion
- Test wake lock on mobile
- Test notification on completion
- Verify color changes at thresholds

### Automated Testing
```javascript
describe('Timer', () => {
  test('starts countdown correctly');
  test('pauses and resumes');
  test('resets to initial duration');
  test('plays alarm on completion');
  test('changes color at thresholds');
  test('requests wake lock');
  test('shows notification on complete');
});
```

## Browser Compatibility
- Canvas API: All modern browsers
- Web Audio API: All modern browsers
- Screen Wake Lock API: Chrome, Edge (limited Safari)
- Notifications API: All modern browsers
- requestAnimationFrame: All modern browsers

## Performance
- Uses requestAnimationFrame for 60fps animation
- Canvas rendering optimized for mobile
- imageSmoothingEnabled = false for crisp rendering
- No memory leaks (proper cleanup on stop)

## Future Enhancements
- Custom alarm sounds
- Multiple timer presets
- Timer history
- Vibration patterns
- Custom color themes
- Timer statistics

## References
- modules/timer.js: Current implementation
- ARCHITECTURE.md: Timer architecture
- Web Audio API docs: https://developer.mozilla.org/en-US/docs/Web/API/Web_Audio_API
- Screen Wake Lock API docs: https://developer.mozilla.org/en-US/docs/Web/API/Screen_Wake_Lock_API
