# Bearer Token Setup

## What We Added

Simple bearer token authentication to block unauthorized access.

## Setup (One Time)

### 1. Set the token in Lambda environment variable

```bash
aws lambda update-function-configuration \
  --function-name blacksheep_tarot-tracker-bedrock-chat-proxy \
  --environment "Variables={API_TOKEN=BSG_TRACKER_AUTH_TOKEN}" \
  --region us-east-2
```

### 2. Deploy the updated Lambda code

Use your existing deployment method to deploy:
- `blacksheep_tarot-tracker-bedrock-chat-proxy-lambda.js` (Lambda)
- `modules/gpsy-chat.js` (Browser)

## How It Works

**Browser sends:**
```
Authorization: Bearer BSG_TRACKER_AUTH_TOKEN
```

**Lambda validates:**
- Checks if header matches `process.env.API_TOKEN`
- Blocks request if missing or wrong
- Logs blocked attempts to CloudWatch

## Security Level

⚠️ **This is NOT real security** - the token is visible in browser source code.

**What it blocks:**
- ✅ Casual bots scanning for open endpoints
- ✅ Random people who find the URL
- ✅ Automated scrapers

**What it doesn't block:**
- ❌ Anyone who views your JavaScript source
- ❌ Determined attackers

**Why it's still useful:**
- Raises the bar from "completely open" to "need to find token"
- Easy to rotate if you detect abuse
- Foundation for real Google OAuth later

## Rotating the Token

If you detect abuse:

1. Generate new token (any random string)
2. Update Lambda env var:
```bash
aws lambda update-function-configuration \
  --function-name blacksheep_tarot-tracker-bedrock-chat-proxy \
  --environment "Variables={API_TOKEN=NEW_TOKEN_HERE}" \
  --region us-east-2
```
3. Update `gpsy-chat.js` with new token
4. Deploy updated browser code

## Monitoring

Check for blocked requests:
```bash
aws logs filter-log-events \
  --log-group-name /aws/lambda/blacksheep_tarot-tracker-bedrock-chat-proxy \
  --filter-pattern "BLOCKED_UNAUTHORIZED" \
  --region us-east-2
```

## Current Protection Stack

✅ Bearer token (blocks casual abuse)
✅ Concurrency limit: 5 (prevents parallel attacks)
⏳ Budget alert: $10/month (prevents surprise bills)

## Future: Google OAuth

When you implement Google login, you'll:
1. Replace static token with Google JWT
2. Validate JWT signature in Lambda
3. Extract user email from JWT
4. Same validation pattern, just real tokens
