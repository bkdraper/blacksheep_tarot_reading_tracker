// Lambda function with STREAMING support for Bedrock Agent responses
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";

const client = new BedrockAgentRuntimeClient({ region: "us-east-2" });
const API_TOKEN = process.env.API_TOKEN; // Set in Lambda environment variables

export const handler = awslambda.streamifyResponse(async (event, responseStream) => {
  const requestId = event.requestContext?.requestId || 'unknown';
  const startTime = Date.now();
  
  const httpResponseMetadata = {
    statusCode: 200,
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    }
  };
  
  responseStream = awslambda.HttpResponseStream.from(responseStream, httpResponseMetadata);
  
  let body;
  try {
    // Bearer token validation
    const authHeader = event.headers?.authorization || event.headers?.Authorization;
    console.log('[PROXY] auth header present:', !!authHeader);
    if (!authHeader || authHeader !== `Bearer ${API_TOKEN}`) {
      console.warn('[PROXY] UNAUTHORIZED - rejecting request');
      console.warn(JSON.stringify({
        type: 'BLOCKED_UNAUTHORIZED',
        requestId,
        timestamp: new Date().toISOString(),
        ip: event.requestContext?.http?.sourceIp,
        authHeader: authHeader ? 'present' : 'missing'
      }));
      responseStream.write(`data: ${JSON.stringify({ chunk: 'Unauthorized - invalid or missing token' })}\n\n`);
      responseStream.write('data: [DONE]\n\n');
      responseStream.end();
      return;
    }
    console.log('[PROXY] -- REQUEST START --------------------------');
    console.log('[PROXY] requestId:', requestId);

    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
      console.log('[PROXY] parsed body from event.body');
    } else {
      body = event;
      console.log('[PROXY] using raw event as body');
    }

    const { message, sessionId, userName, sessionAttributes } = body;
    const userId = sessionAttributes?.current_user_id;
    const currentDate = sessionAttributes?.current_date;
    const timezone = sessionAttributes?.timezone;
    const loadedSession = sessionAttributes?.current_loaded_session;

    console.log('[PROXY] userName:', userName || '(none)');
    console.log('[PROXY] userId:', userId || '(none)');
    console.log('[PROXY] sessionId:', sessionId || '(none)');
    console.log('[PROXY] currentDate:', currentDate || '(none)');
    console.log('[PROXY] timezone:', timezone || '(none)');
    console.log('[PROXY] loadedSession:', loadedSession || '(none)');
    console.log('[PROXY] message:', message?.substring(0, 100) || '(none)');

    if (!userId) console.warn('[PROXY] WARNING: no userId - agent will lack user context');
    if (!sessionId) console.warn('[PROXY] WARNING: no sessionId - Bedrock session tracking broken');
    if (!message) console.warn('[PROXY] WARNING: no message');

    console.log(JSON.stringify({
      type: 'REQUEST',
      requestId,
      timestamp: new Date().toISOString(),
      userName,
      userId,
      sessionId,
      messageLength: message?.length || 0,
      messagePreview: message?.substring(0, 100) || '',
      sessionAttributes: sessionAttributes || null
    }));

    // Build context string - injected into inputText on every invocation
    // promptSessionAttributes only fires on first tool call per turn, so inputText is the reliable path
    const contextParts = [];
    if (userId)       contextParts.push(`user_id=${userId}`);
    if (userName)     contextParts.push(`user_name=${userName}`);
    if (currentDate)  contextParts.push(`today=${currentDate}`);
    if (timezone)     contextParts.push(`timezone=${timezone}`);
    if (loadedSession) contextParts.push(`loaded_session=${loadedSession}`);

    const contextualMessage = contextParts.length > 0
      ? `[Context: ${contextParts.join(', ')}. When user says "my" or "I", use user_id=${userId} in all tool calls.] ${message}`
      : message;

    console.log('[PROXY] contextParts:', contextParts.join(', '));
    console.log('[PROXY] contextualMessage preview:', contextualMessage?.substring(0, 150));
    console.log('[PROXY] invoking Bedrock agent 0LC3MUMHNN alias 3T7P4GYJYK...');

    const command = new InvokeAgentCommand({
      agentId: '0LC3MUMHNN',
      agentAliasId: '3T7P4GYJYK',
      sessionId: sessionId,
      inputText: contextualMessage,
      sessionState: sessionAttributes ? {
        promptSessionAttributes: sessionAttributes
      } : undefined
    });

    const agentStart = Date.now();
    const response = await client.send(command);
    console.log('[PROXY] agent responded in', Date.now() - agentStart, 'ms');

    let chunkCount = 0;
    let totalBytes = 0;

    for await (const chunk of response.completion) {
      if (chunk.chunk?.bytes) {
        const text = new TextDecoder().decode(chunk.chunk.bytes);
        console.log('[PROXY] chunk received, length:', chunk.chunk.bytes.length, 'preview:', text.substring(0, 80));
        responseStream.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
        chunkCount++;
        totalBytes += chunk.chunk.bytes.length;
      } else {
        console.log('[PROXY] non-chunk event received:', Object.keys(chunk).join(', '));
      }
    }

    responseStream.write('data: [DONE]\n\n');

    const duration = Date.now() - startTime;
    console.log('[PROXY] -- REQUEST END -- duration:', duration, 'ms | chunks:', chunkCount, '| bytes:', totalBytes);
    console.log(JSON.stringify({
      type: 'SUCCESS',
      requestId,
      timestamp: new Date().toISOString(),
      userName,
      sessionId,
      duration,
      chunkCount,
      totalBytes
    }));

  } catch (error) {
    const duration = Date.now() - startTime;
    console.error('[PROXY] -- ERROR ----------------------------------');
    console.error('[PROXY] errorType:', error.name || 'Unknown');
    console.error('[PROXY] errorMessage:', error.message);
    console.error('[PROXY] stack:', error.stack);
    if (error.$response) console.error('[PROXY] httpStatus:', error.$response.statusCode);
    console.error(JSON.stringify({
      type: 'ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      userName: body?.userName,
      sessionId: body?.sessionId,
      duration,
      errorType: error.name || 'Unknown',
      errorMessage: error.message,
      errorStack: error.stack
    }));

    let userMessage = 'Sorry, I encountered an error. Please try again.';
    if (error.message?.includes('Deserialization')) {
      userMessage = 'The data query returned an invalid result. Please try again.';
    } else if (error.message?.includes('timeout')) {
      userMessage = 'The query took too long. Please try again.';
    }
    console.log('[PROXY] sending error message to client:', userMessage);
    responseStream.write(`data: ${JSON.stringify({ chunk: userMessage })}\n\n`);
    responseStream.write('data: [DONE]\n\n');
  } finally {
    responseStream.end();
  }
});
