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
- `mcp-server/`: MCP server for programmatic data access

## MCP Server

### Overview
The Model Context Protocol (MCP) server provides programmatic access to tarot tracker data for AI assistants, chatbots, and other applications. Built with Node.js and deployed to AWS Lambda with HTTP REST API support.

### Architecture
```mermaid
graph TB
    A[MCP Client] --> B[AWS Lambda Function]
    B --> C[TarotTrackerMCPServer Class]
    C --> D[Supabase Database]
    
    subgraph "Access Methods"
        E[AWS Lambda Invoke] --> B
        F[HTTP REST API] --> B
        G[Local Testing] --> H[test-lambda.js]
        H --> C
    end
    
    subgraph "MCP Tools"
        I[get_session_summary]
        J[get_top_locations]
        K[get_recent_sessions]
        L[get_reading_records]
    end
    
    C --> I
    C --> J
    C --> K
    C --> L
```

#### Server-Sent Events (SSE) Support
The MCP server implements a **shared class pattern** to support both AWS Lambda invoke and HTTP REST API access methods:

- **TarotTrackerMCPServer Class**: Core server logic with Supabase integration
- **Lambda Handler**: Detects both API Gateway and Function URL events automatically
- **HTTP Compatibility**: Function URL provides direct HTTP access without API Gateway overhead
- **MCP Protocol Compliance**: Proper `tools/list` and `tools/call` method handling
- **CORS Support**: Full cross-origin support for web application integration

This architecture eliminates code duplication while providing multiple access patterns for different client types.

#### MCP Protocol Requirements
The Model Context Protocol requires specific response formats and streaming capabilities:

**Response Streaming**: MCP clients expect streaming responses for tool calls, requiring the server to:
- Return `content` array with `type: "text"` objects
- Support JSON-RPC 2.0 protocol structure
- Handle both synchronous and asynchronous tool execution
- Provide proper error handling with MCP-compliant error codes

**Implementation Details**:
```javascript
// MCP-compliant response format
return {
  content: [{
    type: 'text',
    text: JSON.stringify(result, null, 2)
  }]
};

// Lambda handler detects event types
const isApiGateway = event.httpMethod || event.requestContext;
const isFunctionUrl = event.headers && !event.requestContext;

// Dual compatibility for AWS Lambda
if (isApiGateway) {
  body = event.body;
} else if (isFunctionUrl) {
  body = event.body;
} else {
  // Direct Lambda invoke
  body = JSON.stringify(event);
}
```

**Why Response Streaming Was Required**:
- **MCP Client Expectations**: Clients like Amazon Q expect streaming text responses
- **Large Data Sets**: Reading records can contain hundreds of entries requiring chunked delivery
- **Real-time Processing**: Tool results need to be delivered as they're computed
- **Protocol Compliance**: MCP specification mandates specific content structure for tool responses

#### AWS Lambda Streaming Requirements
AWS Lambda Function URLs require `streamifyResponse` for HTTP transport compatibility:

**streamifyResponse Usage**:
```javascript
// awslambda is a global object provided by AWS Lambda runtime
export const handler = awslambda.streamifyResponse(async (event, responseStream, context) => {
  // Unified metadata for HTTP transport
  const metadata = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'mcp-protocol-version': '2024-11-05',
      'Access-Control-Allow-Origin': '*'
    }
  };

  const stream = awslambda.HttpResponseStream.from(responseStream, metadata);
  stream.write(JSON.stringify(response));
  stream.end();
});
```

**Required Headers**:
- `Content-Type: application/json` - MCP protocol requirement for JSON-RPC 2.0
- `mcp-protocol-version: 2024-11-05` - Protocol version identification
- `Access-Control-Allow-Origin: *` - CORS support for web clients
- `Access-Control-Allow-Methods: POST, OPTIONS` - HTTP method permissions
- `Access-Control-Allow-Headers: Content-Type` - Header permissions for CORS

**Why Everything Goes Through Stream**:
- **Function URL Compatibility**: Lambda Function URLs require streaming for HTTP responses
- **CORS Handling**: Preflight OPTIONS requests need proper streaming response
- **Error Handling**: Both success and error responses must use the same streaming pattern
- **Protocol Consistency**: MCP clients expect consistent streaming behavior across all endpoints
- **Performance**: Streaming allows immediate response delivery without buffering

### Available Tools

#### 1. get_session_summary
**Description**: Get earnings summary for a user and date range

**Parameters**:
- `user_name` (required): User name to query
- `start_date` (optional): Start date (YYYY-MM-DD)
- `end_date` (optional): End date (YYYY-MM-DD)

**Returns**:
```json
{
  "user_name": "Amanda",
  "sessions_count": 16,
  "total_readings": 121,
  "total_earnings": 5709.96,
  "average_per_session": "356.87",
  "date_range": {}
}
```

#### 2. get_top_locations
**Description**: Get best performing locations by earnings

**Parameters**:
- `user_name` (required): User name to query
- `limit` (optional): Number of locations to return (default: 5)

**Returns**:
```json
{
  "top_locations": [
    {
      "location": "Va Beach BMSE Fall 25",
      "earnings": 1148.71,
      "sessions": 2,
      "readings": 19
    }
  ]
}
```

#### 3. get_recent_sessions
**Description**: Get recent sessions for a user

**Parameters**:
- `user_name` (required): User name to query
- `limit` (optional): Number of sessions to return (default: 10)

**Returns**:
```json
{
  "recent_sessions": [
    {
      "date": "2025-11-23",
      "location": "Cincinnati Fall 25",
      "readings_count": 8,
      "total_earnings": 326
    }
  ]
}
```

#### 4. get_reading_records
**Description**: Get individual reading records with detailed data for analysis

**Parameters**:
- `user_name` (required): User name to query
- `start_date` (optional): Start date (YYYY-MM-DD)
- `end_date` (optional): End date (YYYY-MM-DD)
- `location_filter` (optional): Filter locations containing this text (case-insensitive)
- `limit` (optional): Number of records to return (default: 100)

**Returns**:
```json
{
  "reading_records": [
    {
      "session_date": "2025-09-21",
      "location": "Denver fall 25",
      "timestamp": "2025-09-22T00:04:00.000Z",
      "price": 30,
      "tip": 7.5,
      "total": 37.5,
      "payment_method": "CC",
      "source": null
    }
  ],
  "total_count": 10,
  "returned_count": 5,
  "location_filter": "denver"
}
```

**Use Cases**:
- Analyze payment method patterns by location
- Track referral source effectiveness
- Detailed transaction-level analysis
- Filter readings by specific criteria

### Bedrock Agent Integration

#### Planned Architecture
The MCP server will integrate with Amazon Bedrock Agent to provide conversational AI capabilities within the tarot tracker app:

```mermaid
graph TB
    A[Tarot Tracker App] --> B[Chat Interface]
    B --> C[Bedrock Agent]
    C --> D[MCP Lambda Function]
    D --> E[Supabase Database]
    
    subgraph "Agent Configuration"
        F[TarotTrackerAgent]
        G[Action Group: TarotDataTools]
        H[4 MCP Tools]
    end
    
    C --> F
    F --> G
    G --> H
```

#### Response Formatting Strategy
**HTML Output Approach**: Bedrock Agent will be configured to return HTML-formatted responses for rich data display:

```html
<!-- Agent Response Format -->
<p>Here are Amanda's top locations:</p>
<table class='data-table'>
<thead><tr><th>Location</th><th>Earnings</th><th>Sessions</th></tr></thead>
<tbody>
<tr><td>Va Beach BMSE Fall 25</td><td>$1,148.71</td><td>2</td></tr>
<tr><td>Cincinnati Fall 25</td><td>$1,013.00</td><td>2</td></tr>
</tbody>
</table>
<p>She's performing really well at these locations!</p>
```

**Benefits of HTML Approach**:
- **Zero parsing complexity** - Direct HTML insertion into chat bubbles
- **Perfect positioning** - Tables appear exactly where intended in responses
- **Full styling control** - CSS can style all HTML elements
- **Multiple formats** - Supports tables, lists, code blocks, etc.
- **Natural flow** - Works seamlessly with conversational responses

### MCP Client Integration

#### Amazon Q Developer IDE Integration
The MCP server can be integrated with Amazon Q Developer for IDE-based data queries:

**Configuration** (`~/.aws/amazonq/mcp.json`):
```json
{
  "servers": {
    "Tarot Tracker": {
      "url": "https://fjmqe5vx4n6r6tklpsiyzey6ea0zuzgo.lambda-url.us-east-2.on.aws/",
      "type": "http"
    }
  }
}
```

**Usage Examples**:
- "What was Amanda's best two locations?"
- "How did she do in Denver?"
- "Show me Amanda's recent sessions"
- "Get Amanda's earnings summary for this month"

**Benefits**:
- **Real-time Data Access**: Query live tarot session data from IDE
- **Natural Language Interface**: Ask questions in plain English
- **Contextual Analysis**: Get detailed breakdowns and comparisons
- **Development Integration**: Access data while working on the application

### File Structure
```
mcp-server/
├── index.js           # Lambda handler (deployment entry point)
├── server.js          # Shared TarotTrackerMCPServer class
├── test-lambda.js     # Local testing script
├── package.json       # Node.js dependencies
└── lambda.zip         # Deployment package
```

### AWS Lambda Deployment

#### Deployment Details
- **Function Name**: `blacksheep_tarot-tracker-mcp-server`
- **Runtime**: Node.js 20.x
- **Region**: us-east-2
- **ARN**: `arn:aws:lambda:us-east-2:944012085152:function:blacksheep_tarot-tracker-mcp-server`
- **HTTP URL**: `https://fjmqe5vx4n6r6tklpsiyzey6ea0zuzgo.lambda-url.us-east-2.on.aws/`

#### Deployment Process
1. **Create Deployment Package**:
   ```bash
   cd mcp-server
   # Update lambda.zip with: index.js, server.js, package.json, node_modules/
   ```

2. **Deploy to Lambda**:
   ```bash
   aws lambda update-function-code --function-name blacksheep_tarot-tracker-mcp-server --zip-file fileb://lambda.zip --region us-east-2
   ```

3. **Configure Function URL** (if not exists):
   ```bash
   aws lambda create-function-url-config --function-name blacksheep_tarot-tracker-mcp-server --auth-type NONE --cors AllowCredentials=false,AllowHeaders=Content-Type,AllowMethods=POST,AllowOrigins=* --region us-east-2
   ```

### Testing Methods

#### 1. Local Testing
```bash
cd mcp-server
npm start  # Runs test-lambda.js
```

**Output Example**:
```
Testing tools/list...
Response: { tools: [...] }

Testing get_session_summary...
Response: { content: [...] }
```

#### 2. AWS Lambda Invoke
```bash
aws lambda invoke --function-name blacksheep_tarot-tracker-mcp-server --cli-binary-format raw-in-base64-out --payload '{"httpMethod":"POST","body":"{\"jsonrpc\":\"2.0\",\"id\":1,\"method\":\"tools/call\",\"params\":{\"name\":\"get_session_summary\",\"arguments\":{\"user_name\":\"Amanda\"}}}"}'  --region us-east-2 temp.json && type temp.json && del temp.json
```

#### 3. HTTP REST API (curl)
```bash
curl -X POST https://fjmqe5vx4n6r6tklpsiyzey6ea0zuzgo.lambda-url.us-east-2.on.aws/ -H "Content-Type: application/json" -d '{"jsonrpc":"2.0","id":1,"method":"tools/call","params":{"name":"get_session_summary","arguments":{"user_name":"Amanda"}}}'
```

**Response Format**:
```json
{
  "content": [
    {
      "type": "text",
      "text": "{\n  \"user_name\": \"Amanda\",\n  \"sessions_count\": 16,\n  \"total_readings\": 121,\n  \"total_earnings\": 5709.96,\n  \"average_per_session\": \"356.87\",\n  \"date_range\": {}\n}"
    }
  ]
}
```

### Integration Examples

#### Amazon Bedrock Chatbot
Configure the Lambda function as a tool for Bedrock agents to query tarot data:
```json
{
  "toolSpec": {
    "name": "tarot_tracker_query",
    "description": "Query tarot reading session data",
    "inputSchema": {
      "json": {
        "type": "object",
        "properties": {
          "tool_name": {"type": "string"},
          "user_name": {"type": "string"},
          "limit": {"type": "number"}
        }
      }
    }
  }
}
```

#### MCP Client Configuration
For IDE integration or other MCP clients:
```json
{
  "mcpServers": {
    "tarot-tracker": {
      "command": "node",
      "args": ["path/to/mcp-server/test-lambda.js"]
    }
  }
}
```

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