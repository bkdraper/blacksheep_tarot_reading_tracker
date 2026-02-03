import { TarotTrackerMCPServer } from './server.js';

const mcpServer = new TarotTrackerMCPServer();

const convertBedrockParameters = (parameters) => {
  const args = {};
  if (parameters && Array.isArray(parameters)) {
    parameters.forEach(param => {
      let value = param.value;
      // Parse JSON strings for object/array parameters
      if (typeof value === 'string' && (value.startsWith('{') || value.startsWith('['))) {
        try {
          value = JSON.parse(value);
        } catch (e) {
          // Keep as string if parse fails
        }
      }
      args[param.name] = value;
    });
  }
  return args;
};

const validateAndFixDate = (dateStr) => {
  if (!dateStr || !dateStr.match(/^\d{4}-\d{2}-\d{2}$/)) return dateStr;
  
  const [year, month, day] = dateStr.split('-').map(Number);
  const daysInMonth = new Date(year, month, 0).getDate();
  
  if (day > daysInMonth) {
    return `${year}-${String(month).padStart(2, '0')}-${String(daysInMonth).padStart(2, '0')}`;
  }
  return dateStr;
};

export const handler = async (event, context) => {
  console.log('Bedrock Lambda: Processing request');
  console.log('Event:', JSON.stringify(event, null, 2));
  
  try {
    const toolName = event.function;
    const args = convertBedrockParameters(event.parameters);
    
    // Fix invalid dates
    if (args.filters) {
      if (args.filters.start_date) args.filters.start_date = validateAndFixDate(args.filters.start_date);
      if (args.filters.end_date) args.filters.end_date = validateAndFixDate(args.filters.end_date);
    }
    if (args.start_date) args.start_date = validateAndFixDate(args.start_date);
    if (args.end_date) args.end_date = validateAndFixDate(args.end_date);
    
    console.log('Tool:', toolName);
    console.log('Args:', JSON.stringify(args, null, 2));
    
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