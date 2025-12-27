# Tarot Reading Tracker

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

## Architecture Overview

```mermaid
graph TB
    A[User Browser] --> B[index.html]
    B --> C[SessionStore Class]
    B --> D[Timer Class]
    B --> E[SettingsStore Class]
    C --> F[Supabase Database]
    C --> G[localStorage Backup]
    B --> H[Service Worker]
    H --> I[PWA Features]
    
    subgraph "Data Flow"
        F --> |Cloud Sync| C
        C --> |Fallback| G
    end
```

## Deployment Architecture

### High-Level Integration
```mermaid
graph TB
    A[User Browser] --> B[tracker.blacksheep-gypsies.com]
    B --> C[Squarespace DNS]
    C --> |CNAME Record| D[CloudFront Distribution]
    D --> E[AWS Amplify]
    E --> F[Static Site Files]
    
    subgraph "Squarespace"
        C
        G[Domain Management]
        G --> C
    end
    
    subgraph "AWS"
        D
        E
        H[Certificate Manager]
        H --> |SSL Certificate| D
        I[Amplify Console]
        I --> |Deploy| E
    end
```

### Deployment Flow
```mermaid
graph LR
    A[Local Development] --> B[Zip File Creation]
    B --> C[AWS Amplify Console]
    C --> D[Static Site Hosting]
    D --> E[tracker.blacksheep-gypsies.com]
    
    subgraph "DNS Setup"
        F[Squarespace DNS] --> |CNAME| G[staging.d2otujcpa37fuv.amplifyapp.com]
        G --> E
    end
    
    subgraph "SSL"
        H[Amplify Managed Certificate] --> E
    end
```

## Technical Requirements
- **Pure web technologies**: HTML/CSS/JS only, no frameworks
- **Mobile-first**: Optimized for mobile browsers and touch interfaces
- **Cloud sync**: Supabase database with localStorage backup
- **Session management**: Complete lifecycle with phase-based UI
- **Single file**: Self-contained HTML file for easy deployment

## Code Architecture

### Core Classes
- **SessionStore**: Manages session state, readings, and database sync
- **Timer**: Handles countdown timer with canvas visualization and audio alerts
- **SettingsStore**: Manages app preferences and customization
- **AnalyticsNotifier**: Handles notifications and performance tracking

### Data Structure
Each reading contains:
- `timestamp`: Full ISO datetime format
- `tip`: Numeric tip amount (default 0)
- `price`: Individual reading price (null uses session price as fallback)
- `payment`: Payment method (cash, cc, venmo, paypal, cashapp, or custom text)
- `source`: Referral source (referral, renu, pog, repeat, or custom text)

Session state:
- `sessionId`: Database session ID
- `user`: Selected user name (required for session creation)
- `location`: Event location text
- `sessionDate`: Event date (YYYY-MM-DD format)
- `price`: Base price per reading (default $40)
- `readings`: Array of reading objects

## Features

### Session Management
1. **Session Phases**: SETUP → READY_TO_CREATE → ACTIVE lifecycle
2. **Session Creation**: Location + day selection creates unique sessions
3. **Session Loading**: Load existing sessions from database or localStorage
4. **Session Persistence**: Automatic cloud sync with localStorage backup
5. **Multi-User Support**: User selection with database-driven user list

### Core Functionality
1. **Add Reading**: Creates new reading entry with current time and session price as default
2. **Remove Reading**: Removes last reading from list with confirmation dialog
3. **Individual Delete**: Delete any specific reading with confirmation
4. **Tip Tracking**: Enter tips for each reading
5. **Payment Method Selection**: Choose payment method for each reading
6. **Source Tracking**: Track referral sources for each reading
7. **Real-time Totals**: Automatic calculation of all totals with fallback pricing
8. **Countdown Timer**: Comprehensive timer with audio alarms and visual warnings
9. **Report Generation**: Create summary reports with grouping and totals

### Timer Features
- **Canvas Display**: 300x300px circular countdown with 72px text
- **Audio Alarms**: Web Audio API generated beeps (1000Hz square wave)
- **Visual Progress**: Circular progress bar with gradient colors from green to red
- **Haptic Feedback**: Button presses with vibration patterns
- **Wake Lock System**: Screen Wake Lock API + silent audio fallback

## File Structure
- `index.html`: Main application file with SessionStore and Timer classes
- `manifest.json`: PWA manifest for app installation
- `serviceWorker.js`: Service worker with network-first caching strategy
- `server.js`: Node.js server for local hosting
- `package.json`: Node.js project configuration
- `README.md`: Project documentation
- `.gitignore`: Git ignore file
- `.amazonq/rules/tarot-tracker-rules.md`: Development rules and guidelines
- `logo192.png` / `logo192-dev.png`: App icons for production/development

## Deployment

### AWS Amplify Setup
- **App Name**: `reading-tracker`
- **App ID**: `d2otujcpa37fuv`
- **Console URL**: https://us-east-1.console.aws.amazon.com/amplify/apps/d2otujcpa37fuv/overview
- **Live URL**: https://tracker.blacksheep-gypsies.com
- **Amplify Domain**: https://staging.d2otujcpa37fuv.amplifyapp.com

### Deployment Process
1. **Create Deployment Package**:
   - Zip all files in project root
   - Exclude: `.amazonq/`, `.git/`, `.gitignore`
   
2. **Deploy to Amplify**:
   - Open AWS Amplify Console
   - Navigate to `reading-tracker` app
   - Drag and drop zip file to deploy
   - No build commands needed (auto-detected static site)
   
3. **Automatic Features**:
   - Static site hosting
   - Amplify managed SSL certificate
   - CDN distribution
   - Automatic HTTPS redirect

### DNS Configuration

#### Squarespace DNS Setup
1. **Access DNS Settings**:
   - Go to squarespace.com > Black Sheep Gypsies
   - Navigate: Domains (or Settings > Domains) > Domains and Email > blacksheep-gypsies.com > DNS > Custom Records
   
2. **Current CNAME Records**:
   ```
   Record #1 (Main subdomain):
   Host: tracker
   Points to: dol1ob2gp2gbk.cloudfront.net
   Type: CNAME
   
   Record #2 (SSL validation):
   Host: _00e066cf9a2c8485cb744a24362f4f31
   Points to: _8bbcb5e7ff17ac195a0e6305c697d5a7.xlfgrmvvlj.acm-validations.aws
   Type: TXT
   ```

#### Squarespace DNS Limitations
- **TTL**: Automatically set (usually 3600 seconds), cannot be manually configured
- **Record Types**: Supports A, AAAA, CNAME, MX, TXT
- **CNAME Restrictions**:
  - Cannot be used for root domain (subdomains only)
  - Must point to domain name (not IP address)
  - Cannot have other records with same name
  - Perfect for `tracker.blacksheep-gypsies.com`

#### CloudFront Integration
- **Setup**: CNAME points to CloudFront distribution (not Amplify domain directly)
- **Distribution**: `dol1ob2gp2gbk.cloudfront.net`
- **SSL**: Managed through AWS Certificate Manager with validation record

#### Amplify Domain Setup
1. **Add Custom Domain**:
   - In Amplify Console, go to Domain Management
   - Add domain: `tracker.blacksheep-gypsies.com`
   - Select "Amplify managed certificate"
   - Wait for SSL certificate provisioning

### SSL Certificate
- **Type**: Amplify Managed Certificate
- **Auto-renewal**: Yes
- **HTTPS Redirect**: Automatic
- **Configuration**: No manual setup required

## Development

### Local Development
```bash
npm start  # Runs server on port 8080
# Access at http://192.168.5.62:8080 on local network
```

### Version Management
- **CRITICAL**: Version number MUST be bumped on every code change
- Version displayed in header bar for cache-busting
- Current version: v3.93.2

### Development vs Production
- **Development Detection**: localhost, 127.0.0.1, 192.168.x.x, port 8080, or dev=true parameter
- **Dynamic Branding**: [DEV] prefix and dev logos in development mode
- **Manifest Routing**: Server redirects to manifest-dev.json in development

## Database Integration

### Supabase Configuration
- **Database**: PostgreSQL with real-time subscriptions
- **Table**: `blacksheep_reading_tracker_sessions`
- **Authentication**: Anonymous access with row-level security
- **Backup Strategy**: localStorage fallback for offline functionality

#### Supabase Project Setup
1. **Access Credentials**:
   - Go to supabase.com > bkdraper org > bookmarks
   - **Project URL**: Project Settings > Data API
   - **API Key**: API Keys > Legacy Anon
   
2. **Current Configuration**:
   - **Project URL**: `https://uuindvqgdblkjzvjsyrz.supabase.co`
   - **Anon Key**: `eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InV1aW5kdnFnZGJsa2p6dmpzeXJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTc4MDU5MDEsImV4cCI6MjA3MzM4MTkwMX0.vONUZEm1w2X4V033_cewR4JjtDXBCIYjTfWzUF5H7bQ`

#### Database Schema
**Table**: `blacksheep_reading_tracker_sessions`
- **Primary Key**: `id` (uuid)
- **Columns**:
  - `session_date` (date) - Event date
  - `location` (text) - Event location
  - `selected_day` (text) - Legacy field
  - `reading_price` (numeric) - Base price per reading
  - `readings` (jsonb) - Array of reading objects
  - `user_name` (text) - User identifier
  - `created_at` (timestamptz) - Auto-generated
  - `updated_at` (timestamptz) - Auto-generated

#### Security Configuration
- **Row Level Security**: Disabled (open access)
- **Access**: Anonymous users can read/write all data
- **Authentication**: Uses anon key only

### Data Persistence
- **Primary**: Supabase database for cloud sync
- **Backup**: localStorage with user-specific keys (`readingTracker_{user}`)
- **Auto-Save**: Every user action triggers save with debounced database sync
- **Offline Support**: Graceful degradation to localStorage when database unavailable

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
- Service Workers for PWA features
- Screen Wake Lock API (where available)

## Usage
1. **Setup**: Select user, enter event location and date
2. **Create Session**: Click "Create Session" to start tracking
3. **Add Readings**: Click "+ Add Reading" for each tarot reading performed
4. **Track Details**: Enter tips, select payment methods and sources
5. **Monitor Totals**: View real-time calculations in summary table
6. **Use Timer**: Set countdown timer for reading sessions
7. **Generate Reports**: Create detailed reports with grouping and export options
8. **Manage Data**: Load previous sessions or start new ones as needed