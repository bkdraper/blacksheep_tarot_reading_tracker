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
- Multi-user support with data separation

## Version Management
- **CRITICAL**: Version number MUST be bumped on every code change
- Version displayed in header bar for cache-busting
- Current version: v3.93.2

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
- Desktop layout: 600px max-width container for better readability on large screens

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
- Top snackbar notifications for session loading and all system messages
- Performance reporting in session list (total earnings display)
- User selection sheet modal with database-driven user list
- Loading spinners for all database operations
- Live user fetching from database (no localStorage user management)
- Full-width snackbars with centered text for better mobile experience
- Color-coded snackbars (success=light green, error=light red, info=light blue)
- Timer notifications toggle for push notifications when timer expires

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
- Dark mode timer text: Soft yellow (#f4e4a6) for better visibility
- Canvas redraws automatically when dark mode toggles

## Features

### Session Management
1. **Session Phases**: SETUP → READY_TO_CREATE → ACTIVE lifecycle
2. **Session Creation**: Location + day selection creates unique sessions
3. **Session Loading**: Load existing sessions from database or localStorage
4. **Session Persistence**: Automatic cloud sync with localStorage backup
5. **Start Over**: Atomic macro-action to reset all state

### Core Functionality
1. **Add Reading**: Creates new reading entry with current time and session price as default
2. **Remove Reading**: Removes last reading from list with confirmation dialog
3. **Individual Delete**: Delete any specific reading with confirmation
4. **Tip Tracking**: Enter tips for each reading
5. **Payment Method Selection**: Choose payment method for each reading (cash, cc, venmo, paypal, cashapp, or custom)
6. **Source Tracking**: Track referral sources for each reading with customizable options
7. **Real-time Totals**: Automatic calculation of all totals with fallback pricing
8. **Event Settings Panel**: Collapsible panel with user selection, reading price, location, and date selection
9. **Countdown Timer**: Comprehensive timer with audio alarms and visual warnings
10. **Multi-User Support**: User selection with database-driven user list and data separation
11. **Session Loading**: Load existing sessions without triggering unwanted database saves

### Display Elements
- **Header Bar**: Professional header with app title, version badge, and settings button
- **Settings Drawer**: Comprehensive settings panel with app preferences, payment methods, data export, and notification toggles (removed dangerous "Clear All Data" setting)
- **Event Settings**: Collapsible panel with user selection button, reading price, location input, and day toggle buttons (Fri/Sat/Sun)
- **User Selection Sheet**: Bottom modal sheet with database-driven user list, loading spinner, and "+ Add New User" button
- **Countdown Timer**: Large display (80px font, 24px header) with start/pause/reset controls and time adjustment arrows
- **Add/Remove Buttons**: Large touch-friendly buttons with haptic feedback and confirmation dialogs
- **Totals Table**: Compact table showing readings count, base total, tips total
- **Grand Total**: Prominent green total with border, two-line layout
- **Readings Log**: Two-row layout with timestamps, tip inputs, payment method button, and delete buttons
- **Payment Method Sheet**: Bottom modal sheet with cash, cc, venmo, paypal, cashapp, and custom "Other" option
- **Payment Methods Customization Sheet**: Bottom modal sheet for editing available payment methods
- **Session Loading Sheet**: Bottom modal sheet showing existing sessions with performance data (filtered by user)
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
- `timestamp`: Full ISO datetime format (migrated from legacy HH:MM AM/PM)
- `tip`: Numeric tip amount (default 0)
- `price`: Individual reading price (null uses session price as fallback)
- `payment`: Payment method (cash, cc, venmo, paypal, cashapp, or custom text)
- `source`: Referral source (referral, renu, pog, repeat, or custom text)

Session state (SessionStore class):
- `sessionId`: Database session ID
- `user`: Selected user name (required for session creation)
- `location`: Event location text
- `sessionDate`: Event date (YYYY-MM-DD format)
- `price`: Base price per reading (default $40)
- `readings`: Array of reading objects
- `_loading`: Internal flag to prevent saves during session loading

Computed properties:
- `canCreateSession`: User + location + day + price validation
- `hasValidSession`: Session ID + user + location + day validation
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
- Supabase database for cloud sync with user_name field (NOT NULL)
- localStorage key: 'readingTracker_{user}' for user-specific backup
- Automatic save on every state change
- User list fetched live from database (unique user_name values)
- No localStorage user management (database-driven)

## File Structure
- `index.html`: Main application file with SessionStore and Timer classes
- `manifest.json`: PWA manifest for app installation
- `serviceWorker.js`: Service worker with network-first caching strategy (cache version v6) excluding Supabase API calls
- `server.js`: Node.js server for local hosting
- `package.json`: Node.js project configuration
- `README.md`: Project documentation
- `.gitignore`: Git ignore file
- `.amazonq/rules/tarot-tracker-rules.md`: This instruction file
- `mcp-server/`: MCP server for programmatic data access

## MCP Server Integration

### Overview
The Model Context Protocol (MCP) server provides programmatic access to tarot tracker data for AI assistants, chatbots, and other applications. Built with Node.js and deployed to AWS Lambda with HTTP REST API support.

### Architecture
- **TarotTrackerMCPServer Class**: Shared server logic with Supabase integration
- **Lambda Handler**: AWS Lambda deployment wrapper (index.js)
- **Local Testing**: Node.js test script (test-lambda.js)
- **Dual Access**: Both AWS Lambda invoke and HTTP REST API endpoints

### Available Tools
1. **get_session_summary**: User earnings summary with date range filtering
2. **get_top_locations**: Best performing locations by earnings
3. **get_recent_sessions**: Recent session history with performance data

### Deployment Architecture
- **Function Name**: blacksheep_tarot-tracker-mcp-server
- **Runtime**: Node.js 20.x (us-east-2)
- **HTTP URL**: https://fjmqe5vx4n6r6tklpsiyzey6ea0zuzgo.lambda-url.us-east-2.on.aws/
- **Access Methods**: AWS Lambda invoke + HTTP REST API with CORS
- **Authentication**: Public access (AuthType: NONE)

### File Structure
```
mcp-server/
├── index.js           # Lambda handler with Function URL support
├── server.js          # Shared TarotTrackerMCPServer class
├── test-lambda.js     # Local testing script
├── package.json       # Node.js dependencies (@supabase/supabase-js)
└── lambda.zip         # Deployment package
```

### Testing Methods
1. **Local Testing**: `npm start` runs test-lambda.js with sample queries
2. **AWS Lambda Invoke**: Direct Lambda invocation via AWS CLI with JSON payloads
3. **HTTP REST API**: curl requests to Function URL with MCP protocol JSON

### Integration Capabilities
- **Amazon Bedrock**: Configure as tool for AI chatbot data queries
- **MCP Clients**: IDE integration for programmatic data access
- **Custom Applications**: HTTP REST API for any application integration
- **AI Assistants**: Real-time tarot session data for conversational AI

### Key Implementation Details
- **Shared Class Pattern**: Eliminates code duplication between local and Lambda versions
- **Function URL Compatibility**: Handler detects both API Gateway and Function URL events
- **MCP Protocol Compliance**: Proper tools/list and tools/call method handling
- **Error Handling**: Comprehensive error responses with proper HTTP status codes
- **CORS Support**: Full cross-origin support for web application integration

## Development Notes
- **Version bumping**: MUST increment version number on every code change
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
- Timer text color: Dynamic color switching based on dark mode state
- Canvas redraw: Automatic redraw when settings change (dark mode toggle)
- Multi-user data separation: Each user has isolated data in database and localStorage
- Database-driven user management: No localStorage user list, fetched live from database
- Loading states: All database operations show loading spinners for user feedback
- Service worker strategy: Network-first caching for immediate updates during development
- Service worker exclusions: Supabase API calls excluded from service worker interception to prevent duplicate requests
- Service worker error handling: Proper Response object handling to prevent conversion errors
- Update notification system: Working "Update Now" button with fallback to hard reload
- Notification system: All system messages use snackbars instead of alerts/toasts
- Snackbar design: Full-width notifications with color coding and centered text
- User experience: No confirmation dialogs for user switching, seamless username changes
- Z-index hierarchy: Snackbars (3000) > Sheets (2001) > Drawers (2000) > Overlays (1999)
- Performance optimization: All console.log statements removed for production performance
- Timer notifications: Configurable push notifications when timer expires (default: enabled)
- Global timer access: Timer object available on window for settings integration
- **Session Loading Architecture**: Loading flag prevents database saves during session restoration
- **Price Fallback System**: Readings with null price use session price for calculations
- **Database Error Handling**: Proper validation prevents empty date strings causing 400 errors
- **State Management Integrity**: SessionStore maintains clean architecture during loading operations
- **Timezone Handling**: Avoid Date object conversion for display to prevent timezone shifts
- **Report Date Ranges**: Use raw date strings directly instead of converting through Date objects
- **Weekend Range Logic**: Proper Friday-Sunday calculation with correct day boundaries
- **Date Normalization**: All YYYY-MM-DD dates converted to MM/DD/YYYY before Date object creation to avoid UTC/local timezone issues
- **JavaScript Date Parsing**: YYYY-MM-DD format creates UTC dates, MM/DD/YYYY creates local dates - normalize to avoid timezone shifts
- **Variable Naming Conflicts**: Avoid conflicts with global CDN variables (e.g., rename `const supabase` to `const supabaseClient`)
- **Documentation Maintenance**: README.md contains complete deployment architecture with Mermaid diagrams

## Usage
1. Set reading price (defaults to $40)
2. Click "+ Add Reading" for each tarot reading performed
3. Enter tip amounts in the tip input boxes
4. View real-time totals in the summary table
5. Delete individual readings using the red × button if needed
6. Use the "-" button to remove the most recent reading

### Report Features
- **Date Range Presets**: Today, This Weekend, This Month, YTD, 1 Year, Last Year, All Time, Custom
- **Custom Date Inputs**: Only visible when "Custom" preset is selected
- **Weekend Logic**: Shows current weekend or most recent past weekend (Friday-Sunday)
- **Timestamp Filtering**: Uses actual reading timestamps, not session creation dates
- **Migration Fix**: Uses actual session date from database, not today's date
- **Date Range Fixes**: All presets set endDate to 23:59:59.999 to include full day's events
- **Weekend Calculation**: Friday start of day (00:00:00) to Sunday end of day (23:59:59.999)
- **Report Sorting**: Data displays in chronological ascending order
- **Date Display**: Report headers use raw YYYY-MM-DD format to avoid timezone conversion issues

## Technical Implementation

### Dynamic Logo and Favicon System
- **Global Variables**: APP_TITLE and APP_LOGO automatically detect development mode
- **Development Detection**: localhost, 127.0.0.1, 192.168.x.x, port 8080, or dev=true parameter
- **Favicon**: Dynamic favicon updates based on environment (logo192.png vs logo192-dev.png)
- **Manifest Routing**: Server redirects manifest.json to manifest-dev.json in development
- **Production Manifest**: manifest.json uses regular logos for production deployment
- **Development Manifest**: manifest-dev.json uses dev logos with [DEV] branding

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
- `.header`: Professional header bar with sticky positioning and shadow
- `.header-actions`: Container for version badge and settings button
- `.version-badge`: Version display in header with rounded styling
- `.settings-btn`: Header settings button with hover effects
- `.settings-drawer`: Comprehensive settings panel with sections
- `.settings-select`: Dropdown inputs in settings (80px min-width for narrow screens)
- `.timer-canvas-container`: Flex container for canvas centering
- `.timer-canvas`: 300x300px canvas, border: none, padding: 0, margin: 0
- `.start-btn`: flex:3, 70px height, prominent green styling
- `.tip-input`: 70px width with !important for mobile override
- `.payment-method-btn`: Single button for payment method selection
- `.reading-item`: 2px solid #ddd border-bottom for visual separation
- `.event-settings`: collapsible panel with smooth transitions
- `.day-btn.active`: highlighted state for selected day
- `.sheet`: Bottom modal sheet with slideUpSheet animation
- `.snackbar`: Full-width top notification with slideDown animation and centered text
- `.user-btn`: User selection button styled like input elements
- `.spinner`: Loading spinner for database operations (40px size)

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

## Multi-User Support
- **User Selection**: Sheet modal with database-driven user list
- **Data Separation**: Each user has isolated sessions and readings
- **No Login Required**: Simple username-based identification
- **Live User List**: Fetched from database on sheet open
- **Add New Users**: Prompt dialog creates new user immediately
- **User Switching**: Can switch users anytime, loads their specific data
- **Database Schema**: user_name field (NOT NULL) in sessions table
- **localStorage Keys**: User-specific keys (readingTracker_{user})
- **Session Filtering**: All database queries filtered by user_name

## Deployment
- **AWS Amplify**: Hosted under 'reading-tracker' app
- **Live URL**: https://tracker.blacksheep-gypsies.com
- **Custom Domain**: Subdomain in Amplify + CNAME in Squarespace DNS
- **Updates**: Upload zip file to Amplify console for deployment
- **GitHub**: Repository available for version control
- **PWA Support**: Installable as standalone app with service worker
- **DNS Integration**: Squarespace DNS → CloudFront → Amplify hosting
- **SSL Management**: Amplify managed certificates with automatic renewal