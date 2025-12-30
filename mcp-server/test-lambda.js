import { TarotTrackerMCPServer } from './server.js';

const mcpServer = new TarotTrackerMCPServer();

// Test the tools/list endpoint
const testToolsList = async () => {
  console.log('Testing tools/list...');
  
  const request = {
    jsonrpc: '2.0',
    id: 1,
    method: 'tools/list'
  };
  
  const result = await mcpServer.handleRequest(request);
  console.log('Response:', result);
  console.log('---');
};

// Test the get_session_summary tool
const testSessionSummary = async () => {
  console.log('Testing get_session_summary...');
  
  const request = {
    jsonrpc: '2.0',
    id: 2,
    method: 'tools/call',
    params: {
      name: 'get_session_summary',
      arguments: {
        user_name: 'Amanda'
      }
    }
  };
  
  const result = await mcpServer.handleRequest(request);
  console.log('Response:', result);
  console.log('---');
};

// Test the get_reading_records tool
const testReadingRecords = async () => {
  console.log('Testing get_reading_records...');
  
  const request = {
    jsonrpc: '2.0',
    id: 3,
    method: 'tools/call',
    params: {
      name: 'get_reading_records',
      arguments: {
        user_name: 'Amanda',
        location_filter: 'denver',
        limit: 5
      }
    }
  };
  
  const result = await mcpServer.handleRequest(request);
  console.log('Response:', JSON.stringify(result, null, 2));
  console.log('---');
};

// Run tests
const runTests = async () => {
  await testToolsList();
  await testSessionSummary();
  await testReadingRecords();
};

runTests().catch(console.error);