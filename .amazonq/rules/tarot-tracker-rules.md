# Tarot Reading Tracker - Project Rules

## Overview
A mobile-optimized single page application for tracking tarot readings and tips during events or sessions. Built with pure HTML, CSS, and JavaScript with Supabase cloud database integration.

## Purpose
- Track individual tarot readings with timestamps
- Record tips and payment methods for each reading
- Calculate totals (base earnings + tips)
- Manage readings log with add/remove functionality
- Session management with cloud persistence
- Timer functionality for reading sessions

## Technical Requirements
- **Pure web technologies**: HTML/CSS/JS only, no frameworks
- **Mobile-first**: Optimized for mobile browsers and touch interfaces
- **Cloud sync**: Supabase database with localStorage backup
- **Session management**: Complete lifecycle with phase-based UI
- **Single file**: Self-contained HTML file for easy deployment

## Design Rules Established

### Mobile Optimization
- Touch targets minimum 44px height for easy tapping
- Font sizes 16px+ to prevent mobile zoom
- System fonts for better mobile performance
- `touch-action: manipulation` to prevent double-tap zoom
- `-webkit-appearance: none` to override mobile browser defaults
- Use `!important` declarations when mobile browsers override styles

### Layout Principles
- Compact design to maximize screen real estate
- Inline layouts for infrequently changed inputs (reading price)
- Table layouts for data that needs alignment (totals)
- Prominent display of most important information (grand total)

### User Experience
- Confirmation dialogs for destructive actions (delete readings and remove last reading)
- Specific confirmation messages showing what's being deleted
- Auto-numbering of readings (1., 2., 3., etc.)
- Enter key handling for quick tip input
- Time-only timestamps (no seconds) for cleaner display
- Collapsible settings panel to save screen space
- Day selection buttons with active state highlighting
- Haptic feedback on all button interactions (50-100ms patterns)
- Audio-first timer alerts with visual backup indicators
- Payment method modal sheet with predefined and custom options
- Visual dividers between reading entries (2px solid #ddd)
- Automatic session persistence with restoration dialog
- Bottom sheet animations for modal interactions
- Top snackbar notifications for session loading
- Performance reporting in session list (total earnings display)

### Input Sizing
- Reading price: 80px width (rarely changes)
- Tip inputs: 70px width (frequent use, sized for 4-5 characters) with !important declarations
- Location input: flex:1 with min-width:0 for responsive behavior
- Timer input: 60px width for 2-digit minutes (0-99 range)
- All inputs center-aligned for better readability

### Timer Design
- Canvas timer: 300x300px circular countdown with gradient colors (green to red)
- Timer text: 72px font size, center-aligned within canvas
- Start button: flex:3 ratio, 70px height for prominence
- Pause/Reset buttons: flex:1 ratio, equal sizing
- Arrow buttons: 40px width for time adjustment
- Visual warnings: Circle color transitions from green to red as time decreases
- Canvas styling: border: none, padding: 0, crisp rendering enabled

## Features

### Session Management
1. **Session Phases**: SETUP → READY_TO_CREATE → ACTIVE lifecycle
2. **Session Creation**: Location + day selection creates unique sessions
3. **Session Loading**: Load existing sessions from database or localStorage
4. **Session Persistence**: Automatic cloud sync with localStorage backup
5. **Start Over**: Atomic macro-action to reset all state

### Core Functionality
1. **Add Reading**: Creates new reading entry with current time (no default payment method)
2. **Remove Reading**: Removes last reading from list with confirmation dialog
3. **Individual Delete**: Delete any specific reading with confirmation
4. **Tip Tracking**: Enter tips for each reading
5. **Payment Method Selection**: Choose payment method for each reading (cash, cc, venmo, paypal, cashapp, or custom)
6. **Real-time Totals**: Automatic calculation of all totals
7. **Event Settings Panel**: Collapsible panel for reading price, location, and day selection
8. **Countdown Timer**: Comprehensive timer with audio alarms and visual warnings

### Display Elements
- **Event Settings**: Collapsible panel with reading price, location input, and day toggle buttons (Fri/Sat/Sun)
- **Countdown Timer**: Large display (80px font, 24px header) with start/pause/reset controls and time adjustment arrows
- **Add/Remove Buttons**: Large touch-friendly buttons with haptic feedback and confirmation dialogs
- **Totals Table**: Compact table showing readings count, base total, tips total
- **Grand Total**: Prominent green total with border
- **Readings Log**: Two-row layout with timestamps, tip inputs, payment method button, and delete buttons
- **Payment Method Sheet**: Bottom modal sheet with cash, cc, venmo, paypal, cashapp, and custom "Other" option
- **Session Loading Sheet**: Bottom modal sheet showing existing sessions with performance data
- **Snackbar Notifications**: Top sliding notifications for session loading confirmations
- **Session Restoration**: Dialog on page load asking to restore previous session data

### Timer Features
- **Canvas Display**: 300x300px circular countdown with 72px text for easy visibility
- **Audio Alarms**: Web Audio API generated beeps (1000Hz square wave)
- **Visual Progress**: Circular progress bar with gradient colors from green to red
- **Haptic Feedback**: Button presses only (no countdown vibrations)
- **Time Adjustment**: Arrow buttons for quick minute adjustments
- **Alarm Sequence**: Three rapid beeps + longer tone, repeating every 1.5 seconds
- **Wake Lock System**: Screen Wake Lock API + silent audio fallback to prevent sleep
- **Animation**: requestAnimationFrame for smooth canvas updates

### Data Structure
Each reading contains:
- `timestamp`: Time in HH:MM AM/PM format
- `tip`: Numeric tip amount (default 0)
- `payment`: Payment method (cash, cc, venmo, paypal, cashapp, or custom text)

Session state (SessionStore class):
- `sessionId`: Database session ID
- `location`: Event location text
- `selectedDay`: Currently selected day (Fri/Sat/Sun)
- `price`: Base price per reading (default $40)
- `readings`: Array of reading objects

Computed properties:
- `canCreateSession`: Location + day + price validation
- `hasValidSession`: Session ID + location + day validation
- `sessionPhase`: SETUP | READY_TO_CREATE | ACTIVE

Timer state:
- `timerSeconds`: Current countdown time in seconds
- `isRunning`: Timer active state
- `timerInterval`: Interval reference for countdown
- `alarmInterval`: Interval reference for alarm sequence
- `wakeLock`: Screen Wake Lock API reference
- `silentAudio`: Audio element for wake lock fallback
- Canvas context for drawing circular timer

Persistence:
- Supabase database for cloud sync
- localStorage key: 'readingTracker' for backup
- Automatic save on every state change

## File Structure
- `index.html`: Main application file with SessionStore class
- `server.js`: Node.js server for local hosting
- `package.json`: Node.js project configuration
- `README.md`: Project documentation
- `.gitignore`: Git ignore file
- `.amazonq/rules/tarot-tracker-rules.md`: This instruction file

## Development Notes
- Version timestamp in upper right corner for cache-busting during development
- Cache-control meta tags to prevent browser caching during development
- Server runs on port 8080, accessible at http://192.168.5.62:8080 on local network
- Audio context requires user interaction before initialization
- Haptic feedback gracefully degrades if Vibration API unavailable
- Timer persists through pause/resume cycles
- All mobile browser style overrides use !important declarations
- Command pattern: Use macro-actions like startOver() for atomic operations
- Declarative UI: SessionStore setters automatically trigger UI updates
- DRY principle: Utility functions for sheet management and settings collapse
- Implementation-agnostic naming: Function names describe purpose, not implementation
- Performance reporting: Session list shows total earnings for quick overview
- Canvas timer: Uses requestAnimationFrame for smooth animations and better performance
- Wake lock limitations: Screen Wake Lock API requires HTTPS, effectiveness varies by browser
- Canvas rendering: imageSmoothingEnabled = false for crisp circle rendering
- Canvas centering: Flex container wrapper ensures perfect centering across all browsers

## Usage
1. Set reading price (defaults to $40)
2. Click "+ Add Reading" for each tarot reading performed
3. Enter tip amounts in the tip input boxes
4. View real-time totals in the summary table
5. Delete individual readings using the red × button if needed
6. Use the "-" button to remove the most recent reading

## Technical Implementation

### Audio System
- **Web Audio API**: Square wave oscillators at 1000Hz frequency
- **Alarm Sequence**: Three 0.1s beeps + 0.4s tone, repeating every 1.5s
- **User Interaction**: Audio context initialized on first click
- **Volume**: 30% gain to prevent harsh sounds

### Wake Lock System
- **Screen Wake Lock API**: Primary method for preventing screen sleep (HTTPS required)
- **Silent Audio Fallback**: Looping silent audio for browsers without Wake Lock API
- **Automatic Management**: Wake lock requested on timer start, released on stop/pause
- **Browser Compatibility**: Works on Samsung Browser, limited effectiveness on Chrome
- **Duration Limits**: Tested effective up to 10 minutes, may not prevent indefinite sleep

### Haptic Feedback
- **Button Presses**: 50ms vibration for standard actions
- **Confirmations**: 100-50-100ms pattern for destructive actions
- **Time Adjustment**: 30ms vibration for arrow buttons
- **Payment Selection**: 30ms vibration for payment method buttons
- **No Countdown Vibration**: Audio and visual only for timer events

### Payment Method System
- **Modal Sheet Interface**: Single "Payment Method" button opens bottom sheet
- **Predefined Methods**: Cash, CC, Venmo, PayPal, Cash App options in sheet
- **Custom Methods**: "Other" option opens prompt dialog for custom text
- **Selected State**: Button shows selected method name and styling
- **No Defaults**: New readings show "Payment Method" placeholder
- **Sheet Animation**: Smooth slideUpSheet animation with overlay

### Data Persistence
- **Supabase Database**: Primary storage with table 'blacksheep_reading_tracker_sessions'
- **localStorage Key**: 'readingTracker' stores complete application state as backup
- **Auto-Save**: Every user action triggers save() with debounced database sync
- **Restoration Dialog**: "I have saved data from {location} - {day}. Would you like to load that data?"
- **Complete State**: Session ID, readings array, selected day, location, price all persisted
- **Graceful Degradation**: Falls back to localStorage if database unavailable

### CSS Classes
- `.timer-canvas-container`: Flex container for canvas centering (justify-content: center, align-items: center)
- `.timer-canvas`: 300x300px canvas, border: none, padding: 0, margin: 0
- `.timer h3`: 24px font size for larger header
- `.start-btn`: flex:3, 70px height, prominent green styling
- `.tip-input`: 70px width with !important for mobile override
- `.payment-method-btn`: Single button for payment method selection
- `.payment-method-btn.selected`: Blue styling when payment method chosen
- `.reading-item`: 2px solid #ddd border-bottom for visual separation
- `.event-settings`: collapsible panel with smooth transitions
- `.day-btn.active`: highlighted state for selected day
- `.sheet`: Bottom modal sheet with slideUpSheet animation
- `.snackbar`: Top notification with slideDown animation

## Browser Compatibility
Designed for modern mobile browsers with support for:
- CSS Flexbox
- ES6 JavaScript features (classes, arrow functions, destructuring)
- HTML5 input types
- Touch events
- Web Audio API
- Vibration API
- Fetch API for Supabase integration
- localStorage for offline functionality

## Deployment
- **AWS Amplify**: Hosted under 'reading-tracker' app
- **Live URL**: https://tracker.blacksheep-gypsies.com
- **Custom Domain**: Subdomain in Amplify + CNAME in Squarespace DNS
- **Updates**: Upload zip file to Amplify console for deployment
- **GitHub**: Repository available for version control