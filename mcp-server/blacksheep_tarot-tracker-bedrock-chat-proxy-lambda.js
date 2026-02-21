// Lambda function with STREAMING support for Bedrock Agent responses
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";

const client = new BedrockAgentRuntimeClient({ region: "us-east-2" });

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
  
  try {
    let body;
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else {
      body = event;
    }
    
    const { message, sessionId, userName } = body;
    
    // Log incoming request
    console.log(JSON.stringify({
      type: 'REQUEST',
      requestId,
      timestamp: new Date().toISOString(),
      userName,
      sessionId,
      messageLength: message?.length || 0,
      messagePreview: message?.substring(0, 100) || ''
    }));
    
    const contextualMessage = userName 
      ? `[User context: The user asking this question is ${userName}. When they say "my" or "I", they mean ${userName}'s data.] ${message}`
      : message;
    
    const command = new InvokeAgentCommand({
      agentId: "0LC3MUMHNN",
      agentAliasId: "CYVKITJVFL",
      sessionId: sessionId,
      inputText: contextualMessage
    });
    
    const response = await client.send(command);
    
    // NOTE: Despite SSE setup, Bedrock Agent doesn't actually stream.
    // It buffers the entire response and sends one chunk at the end.
    // This infrastructure is ready for when AWS finally supports real streaming.
    let chunkCount = 0;  // Will always be 1 until Bedrock supports streaming
    let totalBytes = 0;
    
    // Stream each chunk as it arrives (currently just one chunk from Bedrock)
    for await (const chunk of response.completion) {
      if (chunk.chunk?.bytes) {
        const text = new TextDecoder().decode(chunk.chunk.bytes);
        responseStream.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
        chunkCount++;
        totalBytes += chunk.chunk.bytes.length;
      }
    }
    
    responseStream.write('data: [DONE]\n\n');
    
    // Log successful completion
    const duration = Date.now() - startTime;
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
    
    // Structured error logging
    console.error(JSON.stringify({
      type: 'ERROR',
      requestId,
      timestamp: new Date().toISOString(),
      userName: body?.userName,
      sessionId: body?.sessionId,
      duration,
      errorType: error.name || 'Unknown',
      errorMessage: error.message,
      errorStack: error.stack,
      errorResponse: error.$response ? {
        statusCode: error.$response.statusCode,
        headers: error.$response.headers
      } : null
    }));
    
    let userMessage = 'I had trouble processing that question. ';
    
    if (error.message?.includes('Deserialization')) {
      userMessage += 'The data query returned an invalid result. Please try again.';
    } else if (error.message?.includes('timeout')) {
      userMessage += 'The query took too long.';
    } else {
      userMessage += `Technical details: ${error.message}`;
    }
    
    responseStream.write(`data: ${JSON.stringify({ chunk: userMessage })}\n\n`);
    responseStream.write('data: [DONE]\n\n');
  } finally {
    responseStream.end();
  }
});
