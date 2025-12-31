import { TarotTrackerMCPServer } from './server.js';

const mcpServer = new TarotTrackerMCPServer();

export const mcpHandler = awslambda.streamifyResponse(async (event, responseStream, context) => {
  const httpMethod = event.requestContext?.http?.method || event.httpMethod;

  // Unified metadata for HTTP transport
  const metadata = {
    statusCode: 200,
    headers: {
      'Content-Type': 'application/json',
      'mcp-protocol-version': '2024-11-05',
      'Access-Control-Allow-Origin': '*'
    }
  };

  // Handle CORS preflight
  if (httpMethod === 'OPTIONS') {
    metadata.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS';
    metadata.headers['Access-Control-Allow-Headers'] = 'Content-Type';
    const stream = awslambda.HttpResponseStream.from(responseStream, metadata);
    stream.end();
    return;
  }

  // Handle POST requests for MCP HTTP transport
  if (httpMethod === 'POST') {
    try {
      const request = JSON.parse(event.body);
      const response = await mcpServer.handleRequest(request);
      
      const stream = awslambda.HttpResponseStream.from(responseStream, metadata);
      stream.write(JSON.stringify(response));
      stream.end();
    } catch (error) {
      metadata.statusCode = 500;
      const stream = awslambda.HttpResponseStream.from(responseStream, metadata);
      stream.write(JSON.stringify({ error: error.message }));
      stream.end();
    }
    return;
  }

  // Return 405 for GET to force HTTP transport
  const stream = awslambda.HttpResponseStream.from(responseStream, { statusCode: 405 });
  stream.end();
});