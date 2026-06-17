---
inclusion: manual
---

# Bedrock Agent Streaming — Research & Implementation Plan

## Last Updated: June 13, 2026

## Summary

Real token-level streaming is now available for standard Bedrock Agents (the same `InvokeAgent` API we use).
This is NOT AgentCore — it's a parameter on the existing API. Our SSE infrastructure is already in place
and working; the only thing missing is enabling `streamFinalResponse: true` in the InvokeAgentCommand.

## Current Architecture (Working)

```
Frontend (gpsy-chat.js)
  → fetch() to Lambda Function URL
    → proxy_lambda.js (awslambda.streamifyResponse + SSE format)
      → InvokeAgentCommand (Bedrock Agent 0LC3MUMHNN / alias 3T7P4GYJYK)
        → Agent processes, calls tools, returns response
      ← response.completion yields chunk(s)
    ← SSE: data: {"chunk": "..."}\n\n
  ← ReadableStream reader, progressive DOM update
```

**Problem**: Despite the streaming infrastructure, Bedrock Agent buffers internally and sends
one single chunk at the end. The frontend SSE reader works — it just only ever gets one event.

## The Fix: `streamingConfigurations`

AWS added `streamingConfigurations` to the InvokeAgent API. When enabled, the agent streams
its final text response token-by-token (or in small chunks based on guardrail interval).

### What to Change in proxy_lambda.js

```javascript
// BEFORE (current)
const command = new InvokeAgentCommand({
  agentId: '0LC3MUMHNN',
  agentAliasId: '3T7P4GYJYK',
  sessionId: sessionId,
  inputText: contextualMessage,
  sessionState: sessionAttributes ? {
    promptSessionAttributes: sessionAttributes
  } : undefined
});

// AFTER (streaming enabled)
const command = new InvokeAgentCommand({
  agentId: '0LC3MUMHNN',
  agentAliasId: '3T7P4GYJYK',
  sessionId: sessionId,
  inputText: contextualMessage,
  sessionState: sessionAttributes ? {
    promptSessionAttributes: sessionAttributes
  } : undefined,
  streamingConfigurations: {
    streamFinalResponse: true,
    applyGuardrailInterval: 20  // characters per chunk (lower = more granular)
  }
});
```

### Prerequisites

1. **IAM Permission**: The Bedrock Agent's execution role needs `bedrock:InvokeModelWithResponseStream`
   on the model ARN. Check the agent's IAM role in the Bedrock console.

2. **SDK Version**: Need `@aws-sdk/client-bedrock-agent-runtime` version that supports
   `streamingConfigurations`. Should be available in any version from mid-2025+.
   Current mcp-server/package.json should be checked for the SDK version.

3. **No Frontend Changes Needed**: The SSE reader in gpsy-chat.js already handles multiple
   chunks progressively. It updates the DOM bubble on each chunk. This will "just work."

### What Changes in Behavior

| Aspect | Before | After |
|--------|--------|-------|
| Chunks received | 1 (entire response) | Many (token groups) |
| Time to first visible text | Full agent processing time (5-30s) | After agent finishes tool calls + first tokens generate |
| Frontend DOM updates | Once | Progressive, like watching typing |
| Error mid-stream | Not possible (all or nothing) | Possible — need to handle partial responses |

### Important Caveat: Tool Execution Phase

Streaming only applies to the **final text generation** phase. The agent still:
1. Reads the prompt
2. Decides which tool(s) to call
3. Executes tool calls (our MCP tools hit Supabase)
4. Receives tool results
5. **Then** generates the final response ← THIS part streams

So for queries that require tool calls (most Gpsy queries), users still wait during steps 1-4.
The streaming kicks in at step 5 — generating the natural language response from the data.

For simple conversational queries (no tools), streaming starts almost immediately.

## AgentCore — Different Product, Not Relevant (Yet)

AgentCore is a separate AWS service for deploying custom agents built with any framework
(Strands, LangGraph, CrewAI, plain Python). It supports:
- Full bidirectional streaming via WebSocket/WebRTC
- Bring-your-own-agent code
- Persistent sessions with microVMs

This is NOT what we need. Our Bedrock Agent with action groups works fine.
AgentCore would be a complete rewrite of the agent architecture.

## API Gateway Response Streaming (Nov 2025)

AWS launched response streaming for REST API Gateway in November 2025. This means:
- If we ever move away from Lambda Function URLs to API Gateway, streaming still works
- Uses `InvokeWithResponseStream` Lambda API under the hood
- Supports SSE format natively

**We don't need this** — we're already on Lambda Function URLs which have had streaming since 2023.

## Alternative: Lambda Function URL Streaming (What We Already Have)

Our `proxy_lambda.js` already uses `awslambda.streamifyResponse()`. This is the correct
approach and requires no infrastructure changes. Just add the `streamingConfigurations` param.

## Implementation Checklist

- [ ] Verify SDK version in mcp-server/package.json supports `streamingConfigurations`
- [ ] Check Bedrock Agent execution role has `bedrock:InvokeModelWithResponseStream` permission
- [ ] Add `streamingConfigurations` to InvokeAgentCommand in proxy_lambda.js
- [ ] Test locally with test-e2e.mjs (may need adaptation for streaming)
- [ ] Deploy Lambda (zip + aws lambda update-function-code)
- [ ] Verify in production — watch for multi-chunk SSE events in browser DevTools Network tab
- [ ] Consider: should we show a different "thinking" state during tool execution vs text streaming?

## Guardrail Interval Tuning

The `applyGuardrailInterval` controls chunk granularity:
- Lower value (e.g., 3) = more frequent, smaller chunks = smoother typing effect
- Higher value (e.g., 50+) = fewer, larger chunks = less smooth but fewer API calls
- Default is 50 characters

For a chat UI, something like 15-25 characters gives a nice typing feel without
overwhelming the DOM with updates.

## Risk Assessment

**Low risk change:**
- Frontend already handles streaming (just never got multiple chunks before)
- Lambda already streams (just passes through what Bedrock gives it)
- Only change is one parameter in the InvokeAgentCommand
- Fallback: if streaming fails, Bedrock falls back to buffered single-chunk (existing behavior)

## References

- AWS Docs: https://docs.aws.amazon.com/bedrock/latest/userguide/agents-invoke-agent.html
- StreamingConfigurations API: https://docs.aws.amazon.com/bedrock/latest/APIReference/API_agent-runtime_StreamingConfigurations.html
- Lambda Response Streaming: https://docs.aws.amazon.com/lambda/latest/dg/config-rs-write-functions.html
- Blog (strategies): https://aws.amazon.com/blogs/compute/serverless-strategies-for-streaming-llm-responses/
- API Gateway Streaming (Nov 2025): https://aws.amazon.com/blogs/compute/building-responsive-apis-with-amazon-api-gateway-response-streaming/
