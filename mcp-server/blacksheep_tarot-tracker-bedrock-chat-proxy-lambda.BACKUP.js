// Lambda function to proxy Bedrock Agent requests
// Deploy this to AWS Lambda and expose via API Gateway

import { BedrockAgentRuntimeClient, InvokeAgentCommand } from "@aws-sdk/client-bedrock-agent-runtime";

const client = new BedrockAgentRuntimeClient({ region: "us-east-2" });

export const handler = async (event) => {
  try {
    // Handle both direct invoke and Function URL formats
    let body;
    if (event.body) {
      body = typeof event.body === 'string' ? JSON.parse(event.body) : event.body;
    } else {
      body = event; // Direct invoke
    }
    
    const { message, sessionId, userName } = body;
    
    // Prepend user context to message if userName provided
    const contextualMessage = userName 
      ? `[User context: The user asking this question is ${userName}. When they say "my" or "I", they mean ${userName}'s data.] ${message}`
      : message;
    
    const command = new InvokeAgentCommand({
      agentId: "0LC3MUMHNN",
      agentAliasId: "CYVKITJVFL", // "live" alias
      sessionId: sessionId,
      inputText: contextualMessage
    });
    
    const response = await client.send(command);
    
    // Collect streaming response
    let fullResponse = '';
    for await (const chunk of response.completion) {
      if (chunk.chunk?.bytes) {
        const text = new TextDecoder().decode(chunk.chunk.bytes);
        fullResponse += text;
      }
    }
    
    return {
      statusCode: 200,
      body: JSON.stringify({ response: fullResponse })
    };
    
  } catch (error) {
    console.error('Error:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};
