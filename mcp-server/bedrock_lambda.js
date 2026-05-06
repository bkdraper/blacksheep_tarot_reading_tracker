import { TarotTrackerMCPServer } from './server.js';

// Cache user_id per sessionId - promptSessionAttributes only injected on first tool call per turn
const sessionUserCache = new Map();

const convertBedrockParameters = (parameters) => {
  console.log('[PARAMS] input:', JSON.stringify(parameters));
  const args = {};
  if (!parameters || !Array.isArray(parameters)) {
    console.warn('[PARAMS] No parameters or not an array:', typeof parameters);
    return args;
  }
  parameters.forEach(param => {
    let value = param.value;
    if ((param.name === 'filters' || param.name === 'options') && typeof value === 'string') {
      try {
        value = JSON.parse(value);
        console.log(`[PARAMS] Parsed ${param.name} JSON:`, JSON.stringify(value));
      } catch (e) {
        console.warn(`[PARAMS] Failed to parse ${param.name} as JSON:`, value);
      }
    }
    args[param.name] = value;
    console.log(`[PARAMS] Set arg "${param.name}" = "${value}"`);
  });
  console.log('[PARAMS] Final args:', JSON.stringify(args));
  return args;
};

export const handler = async (event, context) => {
  const mcpServer = new TarotTrackerMCPServer();
  const toolName = event.function;
  const sessionId = event.sessionId;

  console.log('[BEDROCK] -- INVOCATION START --------------------------');
  console.log('[BEDROCK] Tool:', toolName);
  console.log('[BEDROCK] SessionId:', sessionId);
  console.log('[BEDROCK] Agent version:', event.agent?.version, 'alias:', event.agent?.alias);
  console.log('[BEDROCK] Raw parameters:', JSON.stringify(event.parameters));
  console.log('[BEDROCK] promptSessionAttributes:', JSON.stringify(event.promptSessionAttributes));
  console.log('[BEDROCK] sessionAttributes:', JSON.stringify(event.sessionAttributes));
  console.log('[BEDROCK] inputText preview:', event.inputText?.substring(0, 120));

  try {
    const args = convertBedrockParameters(event.parameters);

    // -- AUTH: user_id resolution ------------------------------------------
    const promptAttrs = event.promptSessionAttributes || {};
    console.log('[AUTH] promptAttrs.current_user_id:', promptAttrs.current_user_id || '(none)');
    console.log('[AUTH] args.user_id from parameters:', args.user_id || '(none)');
    console.log('[AUTH] sessionUserCache has sessionId:', sessionUserCache.has(sessionId), '→ cached:', sessionUserCache.get(sessionId) || '(none)');

    if (promptAttrs.current_user_id) {
      sessionUserCache.set(sessionId, promptAttrs.current_user_id);
      console.log('[AUTH] OK Cached user_id from promptSessionAttributes:', promptAttrs.current_user_id);
    } else {
      console.log('[AUTH] promptSessionAttributes empty - this is a 2nd+ tool call in the turn');
    }

    if (!args.user_id && sessionUserCache.has(sessionId)) {
      args.user_id = sessionUserCache.get(sessionId);
      console.log('[AUTH] OK Injected user_id from cache:', args.user_id);
    } else if (args.user_id) {
      console.log('[AUTH] OK user_id already in args:', args.user_id);
    } else if (args.user_name) {
      console.log('[AUTH] WARN No user_id - falling back to user_name:', args.user_name);
    } else {
      console.warn('[AUTH] FAIL No user context available - query will return empty results');
    }

    // -- FILTERS -----------------------------------------------------------
    if (args.day_of_week) console.log('[FILTER] day_of_week:', args.day_of_week);
    if (args.location)    console.log('[FILTER] location:', args.location);
    if (args.start_date)  console.log('[FILTER] start_date:', args.start_date);
    if (args.end_date)    console.log('[FILTER] end_date:', args.end_date);
    if (args.filters)     console.log('[FILTER] filters object:', JSON.stringify(args.filters));
    if (args.limit)       console.log('[FILTER] limit:', args.limit);

    console.log('[BEDROCK] Final args passed to callTool:', JSON.stringify(args));

    // -- TOOL CALL ---------------------------------------------------------
    console.log('[BEDROCK] Calling mcpServer.callTool("' + toolName + '")...');
    const callStart = Date.now();
    const result = await mcpServer.callTool(toolName, args, true);
    const callMs = Date.now() - callStart;
    console.log('[BEDROCK] callTool completed in', callMs + 'ms');
    console.log('[BEDROCK] result type:', typeof result, '| null?', result === null, '| undefined?', result === undefined);

    if (result === null || result === undefined) {
      console.error('[BEDROCK] FAIL callTool returned null/undefined');
    } else {
      const resultStr = JSON.stringify(result);
      console.log('[BEDROCK] result length:', resultStr.length, 'chars');
      console.log('[BEDROCK] result preview:', resultStr.substring(0, 200));
      if (result.sessions !== undefined)  console.log('[BEDROCK] sessions count:', result.sessions?.length);
      else if (result.readings !== undefined) console.log('[BEDROCK] readings count:', result.readings?.length);
      else if (result.no_results)         console.log('[BEDROCK] no_results, suggestions:', JSON.stringify(result.suggestions));
      else if (result.error)              console.warn('[BEDROCK] tool error:', result.error);
      else                                console.log('[BEDROCK] result keys:', Object.keys(result));
    }

    // -- RESPONSE ----------------------------------------------------------
    const body = typeof result === 'string' ? result : JSON.stringify(result);
    console.log('[BEDROCK] Returning SUCCESS, body length:', body.length);
    console.log('[BEDROCK] -- INVOCATION END ----------------------------');
    return {
      messageVersion: '1.0',
      response: {
        actionGroup: 'TarotDataTools',
        function: toolName,
        functionResponse: {
          responseBody: { TEXT: { body } }
        }
      },
      sessionAttributes: {},
      promptSessionAttributes: {}
    };

  } catch (error) {
    console.error('[BEDROCK] FAIL EXCEPTION:', error.message);
    console.error('[BEDROCK] Stack:', error.stack);
    console.log('[BEDROCK] -- INVOCATION END (ERROR) ---------------------');
    return {
      messageVersion: '1.0',
      response: {
        actionGroup: 'TarotDataTools',
        function: toolName,
        functionResponse: {
          responseState: 'FAILURE',
          responseBody: { TEXT: { body: `Error: ${error.message}` } }
        }
      },
      sessionAttributes: {},
      promptSessionAttributes: {}
    };
  }
};
