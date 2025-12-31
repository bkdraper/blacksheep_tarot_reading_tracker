import { TarotTrackerMCPServer } from './server.js';

const server = new TarotTrackerMCPServer();

async function testMCPClientRequest() {
  console.log('Testing exact MCP client request format...\n');
  
  // This is what the MCP client is sending based on the error
  const mcpRequest = {
    jsonrpc: "2.0",
    id: 1,
    method: "tools/call",
    params: {
      name: "get_session_summary",
      arguments: {
        parameters: {
          user_name: "Amanda",
          start_date: "2024-10-01",
          end_date: "2024-10-31"
        }
      }
    }
  };
  
  console.log('Request:', JSON.stringify(mcpRequest, null, 2));
  
  try {
    const response = await server.handleRequest(mcpRequest);
    console.log('\nResponse:', JSON.stringify(response, null, 2));
  } catch (error) {
    console.log('\nError:', error.message);
  }
}

testMCPClientRequest();