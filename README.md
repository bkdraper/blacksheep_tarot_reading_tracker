# Tarot Reading Tracker

Mobile-optimized single page app for tracking tarot readings and tips. Built with pure HTML/CSS/JS and Supabase cloud database.

## Version: v3.99.9

## Architecture Overview

```mermaid
graph TB
    subgraph "Frontend"
        A[User Browser] --> B[index.html]
        B --> C[SessionStore]
        B --> D[Timer]
        B --> E[GpsyChat]
        B --> F[ReadingsManager]
    end
    
    subgraph "Authentication"
        B --> G[Supabase Auth]
        G --> H[Google OAuth]
    end
    
    subgraph "Database"
        C --> I[(Supabase DB)]
        F --> I
        I --> J[sessions table]
        I --> K[readings table]
        I --> L[user_profiles table]
    end
    
    subgraph "AI Chat"
        E --> M[Chat Proxy Lambda]
        M --> N[Bedrock Agent]
        N --> O[Bedrock Lambda]
        O --> P[MCP Tools]
        P --> I
    end
    
    C --> Q[localStorage]
    
    style G fill:#4285f4
    style I fill:#3ecf8e
    style N fill:#ff9900
```

## Database Schema

```mermaid
erDiagram
    auth_users ||--o{ user_profiles : has
    auth_users ||--o{ sessions : creates
    sessions ||--o{ readings : contains
    
    auth_users {
        uuid id PK
        string email
        jsonb user_metadata
    }
    
    user_profiles {
        uuid user_id PK
        string role
        timestamptz created_at
    }
    
    sessions {
        uuid id PK
        uuid user_id FK
        string user_name
        date session_date
        string location
        numeric reading_price
        jsonb readings
        timestamptz created_at
    }
    
    readings {
        uuid id PK
        uuid session_id FK
        timestamptz timestamp
        numeric tip
        numeric price
        string payment
        string source
        timestamptz created_at
    }
```

## Google OAuth Flow

```mermaid
sequenceDiagram
    participant U as User
    participant A as App (Browser)
    participant S as Supabase Auth
    participant G as Google OAuth
    
    U->>A: Click "Sign in with Google"
    A->>S: supabase.auth.signInWithOAuth({provider: 'google'})
    S->>A: Redirect URL to Google
    A->>G: Redirect to accounts.google.com
    U->>G: Select Google account & approve
    G->>S: Redirect to callback with auth code
    Note over S: Supabase exchanges code for tokens<br/>Creates/updates user in auth.users
    S->>A: Redirect to app with session
    A->>S: supabase.auth.getSession()
    S->>A: Returns {user, session}
    Note over A: user.id = UUID<br/>user.email = Google email<br/>user.user_metadata.full_name
    A->>A: Store user_id + role in memory
    A->>A: Show app interface
```

**Key Points:**
1. **User clicks sign-in** → App calls Supabase SDK
2. **Supabase redirects** → User goes to Google's login page
3. **User approves** → Google sends auth code to Supabase callback URL
4. **Supabase handles exchange** → Converts code to access/refresh tokens
5. **Supabase creates user** → Stores in `auth.users` table (managed by Supabase)
6. **Redirect back to app** → With session cookie/token
7. **App gets session** → Extracts `user_id`, `email`, `full_name`
8. **App queries role** → Looks up `user_profiles` table for admin/user role
9. **App loads data** → Filters by `user_id` (or shows all if admin)

## Features
- **Authentication**: Google OAuth sign-in with role-based access control
- Track readings with timestamps, tips, payment methods, sources
- Real-time totals calculation
- Multi-user support with data separation by user_id
- Session management with cloud sync
- Countdown timer with audio alarms
- AI chat assistant (Gpsy) for data queries
- Report generation with date ranges
- PWA installable as standalone app
- **Admin Mode**: View and analyze data for all users

## Quick Start
1. Sign in with Google account
2. Enter event location/date
3. Click "Create Session" to start tracking
4. Click "+ Add Reading" for each reading
5. Enter tips and select payment methods
6. View real-time totals
7. Use timer for reading sessions
8. Generate reports as needed
9. **Admin users**: Switch between users to view their data

## Live App
**URL**: https://tracker.blacksheep-gypsies.com

## Local Development
```bash
npm start  # Runs on port 8080
# Access at http://192.168.5.62:8080
```

## Tech Stack
- Pure HTML/CSS/JavaScript (no frameworks)
- Supabase PostgreSQL database with normalized schema
- Supabase Auth with Google OAuth
- localStorage backup for offline
- Service Worker for PWA features
- AWS Amplify hosting
- AWS Lambda + Bedrock for AI chat

## File Structure
- `index.html`: Main application
- `manifest.json`: PWA manifest
- `serviceWorker.js`: Cache strategy
- `mcp-server/`: Data access API
- See `ARCHITECTURE.md` for technical details

## Recent Changes (v3.99.9)
- Added profile dropdown menu with Sign Out option (replaces direct logout button)
- Profile button now displays Google profile picture if available
- Added RLS policies to user_profiles table for secure access
- Fixed infinite recursion in RLS policy (simplified to allow authenticated reads)
- Admin users see user switcher button, regular users do not
- Profile menu closes on outside click
- Auth module controls profile button visibility and content

## Previous Changes (v3.99.8)
- Refactored SessionStore to remove user data storage
- Auth module is now single source of truth for userId and userName
- SessionStore reads from window.auth via getters (userId, userName)
- Removed _userId and _userName properties from SessionStore
- Deprecated old user selection methods (showUserSelection, selectUser, addNewUser, loadUsers)
- All DB operations and localStorage keys use userId from Auth
- All 227 tests passing

## Previous Changes (v3.99.7)
- Implemented Google OAuth authentication with Supabase Auth
- Created Auth module (modules/auth.js) with role-based access control
- Added user profile button and login prompt UI
- Session controls hidden when not authenticated
- Auth.checkAuth() restores last session after successful login
- Created user_profiles table for admin/user roles
- Added comprehensive Auth unit and integration tests

## Previous Changes (v3.99.6)
- Added HTML validation to ChatGPSY responses to prevent DOM corruption
- Validates HTML structure using DOMParser before rendering
- Counts open/close tags to detect incomplete HTML (tables, lists, divs)
- Shows error message instead of rendering malformed HTML
- Prevents catastrophic failure where one bad response breaks entire chat
- Strengthened Bedrock Agent prompt with explicit list formatting rules

## Previous Changes (v3.99.5)
- Centralized DOM synchronization in updateUI() as single source of truth
- Removed direct DOM updates from setters (user, location, sessionDate, price)
- Setters now only update internal state and call updateUI()
- Eliminates duplication and prevents potential circular update issues
- All 148 tests pass

## Previous Changes (v3.99.4)
- Refactored SessionStore to use setters consistently for all state changes
- Split save() into save() and saveToLocalStorage() to avoid redundant DB writes
- Fixed localStorage not updating when loading existing sessions
- Improved user/startOver methods to use setters with _loading flag
- Added XSS sanitization with Utils.sanitize() for user-generated content
- Added offline indicator badge in header with network status monitoring
- Fixed duplicate session check to happen before insert attempt
- Added double confirmation to startNewSession()

## Previous Changes (v3.99.3)
- Consolidated button CSS into base classes (btn, btn-primary, btn-secondary, btn-danger, btn-ghost)
- Added size modifiers (btn-small, btn-large, btn-xlarge)
- Reduced CSS by ~150 lines through consolidation
- All buttons now use consistent styling patterns

## Previous Changes (v3.99.2)
- Added IDs to all unique buttons and containers following {type}-{area}-{purpose} convention
- IDs are additive (classes remain unchanged) for future refactoring
- No functional changes, all tests pass

## Previous Changes (v3.99.1)
- Fixed bug where Add Reading and Delete Reading buttons disappeared after creating new session
- Added comprehensive DOM tests to verify UI state across all session phases

## Previous Changes (v3.99.0)
- Removed ~100 lines of duplicate utility functions from index.html
- All utility functions now sourced from Utils module
- Integrated AnalyticsNotifier module for analytics notifications
- Reduced index.html from 1153 to 1053 lines (9% reduction)

## Documentation
- `ARCHITECTURE.md`: Technical architecture and deployment
- `CHANGELOG.md`: Version history
- `.amazonq/rules/`: Development guidelines

## Browser Support
Modern mobile browsers with ES6, Flexbox, Web Audio API, Service Workers
