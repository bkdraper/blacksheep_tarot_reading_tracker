# Lambda Architecture - Dual Protocol Design

## Overview
The Tarot Tracker uses a dual Lambda architecture to serve the same tool functionality through different protocols: streaming JSONRPC for MCP hosts and vanilla REST for AWS Bedrock Agent.

## The Problem

### Protocol Incompatibility
- **MCP Hosts** (VSCode, Amazon Q): Require streaming responses in JSONRPC format
- **AWS Bedrock Agent**: Refuses to support streaming, requires vanilla REST responses

### The Solution
Two Lambda functions wrapping the same core tool logic, each handling protocol-specific requirements.

## Architecture Diagram

```
┌─────────────────────────────────────────────────┐
│           Shared Tool Definitions               │
│              (server.js)                        │
│  - list_sessions                                │
│  - list_readings                                │
│  - search_locations                             │
│  - aggregate_readings                           │
└─────────────────┬───────────────────────────────┘
                  │
        ┌─────────┴─────────┐
        │                   │
┌───────▼────────┐  ┌──────▼──────────┐
│  MCP Lambda    │  │ Bedrock Lambda  │
│  (Protocol A)  │  │  (Protocol B)   │
└───────┬────────┘  └──────┬──────────┘
        │                   │
┌───────▼────────┐  ┌──────▼──────────┐
│ Streaming      │  │ Direct          │
│ JSONRPC        │  │ REST Response   │
│ Response       │  │                 │
└───────┬────────┘  └──────┬──────────┘
        │                   │
┌───────▼────────┐  ┌──────▼──────────┐
│ MCP Hosts      │  │ Bedrock Agent   │
│ (VSCode, Q)    │  │ (ChatGPSY)      │
└────────────────┘  └─────────────────┘
```

## Lambda Functions

### Chat Proxy Lambda (SSE for Frontend)
**Function Name**: `blacksheep_tarot-tracker-bedrock-chat-proxy`
**URL**: https://57h2jhw5tcjn35yzuitv4zjmfu0snuom.lambda-url.us-east-2.on.aws/
**Handler**: `blacksheep_tarot-tracker-bedrock-chat-proxy-lambda.handler`
**Timeout**: 120 seconds
**CloudWatch Logs**: https://us-east-2.console.aws.amazon.com/cloudwatch/home?region=us-east-2#logsV2:log-groups/log-group/$252Faws$252Flambda$252Fblacksheep_tarot-tracker-bedrock-chat-proxy

**Purpose**: Public API endpoint for ChatGPSY frontend to communicate with Bedrock Agent

**Key Features**:
- Server-Sent Events (SSE) format (ready for when Bedrock supports real streaming)
- User context injection: `[User context: ${userName}]`
- Structured JSON logging for observability
- Error translation to user-friendly messages
- Security boundary (keeps AWS credentials server-side)

**Current Limitation**: Despite SSE infrastructure, Bedrock Agent doesn't actually stream. It buffers the entire response and sends one chunk at the end. The SSE setup is future-proofing for when AWS supports real streaming.

**Structured Logging**:
```json
// REQUEST
{"type":"REQUEST","requestId":"abc","userName":"Amanda","messagePreview":"What were..."}

// SUCCESS  
{"type":"SUCCESS","requestId":"abc","duration":2341,"chunkCount":1,"totalBytes":1024}

// ERROR
{"type":"ERROR","requestId":"abc","errorType":"ValidationException","errorMessage":"..."}
```

**CloudWatch Insights Queries**:
```
# Find slow queries
fields @timestamp, userName, duration
| filter type = "SUCCESS" and duration > 5000
| sort duration desc

# Find errors
fields @timestamp, userName, errorMessage
| filter type = "ERROR"
| sort @timestamp desc

# User activity
fields @timestamp, messagePreview
| filter userName = "Amanda"
| sort @timestamp desc
```

### MCP Lambda (Streaming JSONRPC)
**Function Name**: `blacksheep_tarot-tracker-mcp-server`
**URL**: https://fjmqe5vx4n6r6tklpsiyzey6ea0zuzgo.lambda-url.us-east-2.on.aws/
**Handler**: `index.handler`

**Purpose**: Serve MCP hosts that require streaming JSONRPC protocol

**Response Format**:
```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": {
    "content": [
      {
        "type": "text",
        "text": "JSON data here"
      }
    ]
  }
}
```

**Characteristics**:
- Streaming response
- JSONRPC 2.0 protocol
- Required by MCP specification
- Used by VSCode MCP extension, Amazon Q

### Bedrock Lambda (Vanilla REST)
**Function Name**: `blacksheep_tarot-tracker-bedrock`
**ARN**: arn:aws:lambda:us-east-2:944012085152:function:blacksheep_tarot-tracker-bedrock
**Handler**: `bedrock.handler`

**Purpose**: Serve AWS Bedrock Agent which doesn't support streaming

**Response Format**:
```json
{
  "messageVersion": "1.0",
  "response": {
    "actionGroup": "TarotDataTools",
    "function": "list_sessions",
    "functionResponse": {
      "responseBody": {
        "TEXT": {
          "body": "JSON data here"
        }
      }
    }
  }
}
```

**Characteristics**:
- Direct (non-streaming) response
- Bedrock-specific format
- No JSONRPC wrapper
- Used by ChatGPSY AI assistant

## Shared Tool Logic

### Tool Definitions (server.js)
Both lambdas use identical tool implementations:

```javascript
// list_sessions - Get session summaries
// list_readings - Get individual reading records  
// search_locations - Partial name search
// aggregate_readings - Universal aggregation with grouping/filtering/sorting
```

### Database Access
Both lambdas connect to the same Supabase database:
- URL: `https://uuindvqgdblkjzvjsyrz.supabase.co`
- Table: `blacksheep_reading_tracker_sessions`
- Identical query logic
- Same data transformations

## Deployment Strategy

### When to Deploy Both
Deploy to both lambdas when:
- Adding new tools to server.js
- Modifying tool logic
- Changing database queries
- Updating shared dependencies

### Deployment Commands
```bash
# Package the code
cd mcp-server
zip -r lambda.zip .

# Deploy to MCP Lambda
aws lambda update-function-code \
  --function-name blacksheep_tarot-tracker-mcp-server \
  --zip-file fileb://lambda.zip \
  --region us-east-2

# Deploy to Bedrock Lambda
aws lambda update-function-code \
  --function-name blacksheep_tarot-tracker-bedrock \
  --zip-file fileb://lambda.zip \
  --region us-east-2
```

### Quick Deploy Script
```bash
# mcp-server/deploy-dual.sh
#!/bin/bash
zip -r lambda.zip . -x "*.git*" "node_modules/*" "*.backup"

aws lambda update-function-code \
  --function-name blacksheep_tarot-tracker-mcp-server \
  --zip-file fileb://lambda.zip \
  --region us-east-2

aws lambda update-function-code \
  --function-name blacksheep_tarot-tracker-bedrock \
  --zip-file fileb://lambda.zip \
  --region us-east-2

echo "Deployed to both lambdas"
```

## Code Structure

### File Organization
```
mcp-server/
├── server.js                                      # Shared tool definitions
├── index.js                                       # MCP handler (streaming JSONRPC)
├── bedrock.js                                     # Bedrock handler (vanilla REST)
├── blacksheep_tarot-tracker-bedrock-chat-proxy-lambda.js  # Chat proxy (SSE)
├── mcp-handler.js                                 # MCP protocol logic
├── bedrock-handler.js                             # Bedrock protocol logic
├── package.json                                   # Shared dependencies
└── deploy-dual.sh                                 # Deployment script
```

### Handler Separation
```javascript
// index.js - MCP Lambda
exports.handler = async (event) => {
  const tools = require('./server.js');
  const result = await tools.executeTool(toolName, params);
  
  // Wrap in JSONRPC format
  return {
    jsonrpc: "2.0",
    id: event.id,
    result: { content: [{ type: "text", text: result }] }
  };
};

// bedrock.js - Bedrock Lambda  
exports.handler = async (event) => {
  const tools = require('./server.js');
  const result = await tools.executeTool(toolName, params);
  
  // Wrap in Bedrock format
  return {
    messageVersion: "1.0",
    response: {
      actionGroup: "TarotDataTools",
      function: toolName,
      functionResponse: {
        responseBody: { TEXT: { body: result } }
      }
    }
  };
};
```

## Testing

### Test MCP Lambda
```bash
curl -X POST \
  https://fjmqe5vx4n6r6tklpsiyzey6ea0zuzgo.lambda-url.us-east-2.on.aws/ \
  -H "Content-Type: application/json" \
  -d '{"jsonrpc":"2.0","id":1,"method":"tools/list"}'
```

### Test Bedrock Lambda
```bash
aws lambda invoke \
  --function-name blacksheep_tarot-tracker-bedrock \
  --payload '{"function":"list_sessions","parameters":{}}' \
  --region us-east-2 \
  response.json
```

### Local Testing
```bash
cd mcp-server
node test-lambda.js  # Tests tool logic locally
```

## Benefits of This Architecture

### Single Source of Truth
- Tool logic defined once in server.js
- No duplication of business logic
- Easier to maintain and test

### Protocol Flexibility
- Each lambda handles its protocol's quirks
- Clean separation of concerns
- Easy to add new protocol adapters

### Independent Scaling
- MCP and Bedrock lambdas scale independently
- Different timeout/memory configurations possible
- Isolated failure domains

## Limitations

### Deployment Overhead
- Must deploy to both lambdas for tool changes
- Risk of version mismatch if one deploy fails
- No atomic deployment across both

### Code Duplication
- Protocol handling code duplicated
- Package dependencies duplicated
- Slightly larger total footprint

## Future Considerations

### Potential Improvements
- Shared Lambda layer for common code
- Automated deployment pipeline
- Version checking to ensure sync
- Unified testing framework

### Alternative Architectures Considered
- Single lambda with protocol detection (rejected: Bedrock can't stream)
- API Gateway with routing (rejected: adds latency)
- Separate codebases (rejected: maintenance burden)

## References
- mcp-server/server.js: Shared tool definitions
- mcp-server/index.js: MCP handler
- mcp-server/bedrock.js: Bedrock handler
- ARCHITECTURE.md: Overall system architecture
