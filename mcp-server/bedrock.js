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
  console.log('Bedrock Lambda: Processing request');
  
  try {
    const toolName = event.function;
    const args = convertBedrockParameters(event.parameters);
    
    // Check for required parameters and use REPROMPT if missing
    if (!args.user_name) {
      return {
        messageVersion: "1.0",
        response: {
          actionGroup: "TarotDataTools",
          function: toolName,
          functionResponse: {
            responseState: "REPROMPT",
            responseBody: {
              "TEXT": {
                body: "I need a user name to get their tarot reading data. Which user would you like information about?"
              }
            }
          }
        },
        sessionAttributes: {},
        promptSessionAttributes: {}
      };
    }
    
    // Set default limit for top_locations if not provided
    if (toolName === 'get_top_locations' && !args.limit) {
      args.limit = 5;
    }
    
    const result = await mcpServer.callTool(toolName, args, true);
    
    return {
      messageVersion: "1.0",
      response: {
        actionGroup: "TarotDataTools",
        function: toolName,
        functionResponse: {
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
  } catch (error) {
    console.error('Bedrock Lambda: Error:', error);
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