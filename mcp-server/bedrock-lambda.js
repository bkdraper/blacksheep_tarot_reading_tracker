import { TarotTrackerMCPServer } from './server.js';

const mcpServer = new TarotTrackerMCPServer();

const convertBedrockParameters = (parameters) => {
  const args = {};
  if (parameters && Array.isArray(parameters)) {
    parameters.forEach(param => {
      args[param.name] = param.value;
    });
  }
  return args;
};

export const handler = async (event, context) => {
  console.log('Bedrock Lambda: Processing Bedrock Agent call');
  console.log('Bedrock Lambda: Full event:', JSON.stringify(event, null, 2));
  
  try {
    const toolName = event.function;
    const args = convertBedrockParameters(event.parameters);
    console.log('Bedrock Lambda: Calling tool:', toolName, 'with args:', JSON.stringify(args));
    
    const result = await mcpServer.callTool(toolName, args, true);
    console.log('Bedrock Lambda: Tool result received:', JSON.stringify(result));
    
    const bedrockResponse = {
      messageVersion: "1.0",
      response: {
        actionGroup: "TarotDataTools",
        function: toolName,
        functionResponse: {
          responseState: "SUCCESS",
          responseBody: {
            "TEXT": {
              body: typeof result === 'string' ? result : JSON.stringify(result)
            }
          }
        }
      },
      sessionAttributes: {},
      promptSessionAttributes: {}
    };
    
    console.log('Bedrock Lambda: Returning response:', JSON.stringify(bedrockResponse));
    return bedrockResponse;
  } catch (error) {
    console.error('Bedrock Lambda: Error processing request:', error);
    return {
      messageVersion: "1.0",
      response: {
        actionGroup: "TarotDataTools",
        function: event.function,
        functionResponse: {
          responseState: "FAILURE",
          responseBody: {
            "TEXT": {
              body: `Error: ${error.message}`
            }
          }
        }
      },
      sessionAttributes: {},
      promptSessionAttributes: {}
    };
  }
};