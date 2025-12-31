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

export const bedrockHandler = async (event, context) => {
  console.log('Processing direct Bedrock Agent call');
  try {
    const toolName = event.function;
    const args = convertBedrockParameters(event.parameters);
    console.log('Calling tool:', toolName, 'with args:', JSON.stringify(args));
    
    const result = await mcpServer.callTool(toolName, args, true);
    console.log('Tool result received:', JSON.stringify(result));
    
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
    
    console.log('Returning Bedrock response:', JSON.stringify(bedrockResponse));
    return bedrockResponse;
  } catch (error) {
    console.error('Error processing Bedrock request:', error);
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