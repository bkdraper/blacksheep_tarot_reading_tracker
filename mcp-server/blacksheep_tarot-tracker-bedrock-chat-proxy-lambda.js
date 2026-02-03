// Lambda function with STREAMING support for Bedrock Agent responses
import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";

const client = new BedrockAgentRuntimeClient({ region: "us-east-2" });

export const handler = awslambda.streamifyResponse(async (event, responseStream) => {
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
    
    // Stream each chunk as it arrives
    for await (const chunk of response.completion) {
      if (chunk.chunk?.bytes) {
        const text = new TextDecoder().decode(chunk.chunk.bytes);
        responseStream.write(`data: ${JSON.stringify({ chunk: text })}\n\n`);
      }
    }
    
    responseStream.write('data: [DONE]\n\n');
    
  } catch (error) {
    console.error('Chat Proxy Error:', error);
    console.error('Error $response:', error.$response);
    
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
