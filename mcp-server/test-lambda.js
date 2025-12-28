import { handler } from './index.js';

// Test the tools/list endpoint
const testToolsList = async () => {
  console.log('Testing tools/list...');
  
  const event = {
    httpMethod: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list'
    })
  };
  
  const result = await handler(event, {});
  console.log('Response:', JSON.parse(result.body));
  console.log('---');
};

// Test the get_session_summary tool
const testSessionSummary = async () => {
  console.log('Testing get_session_summary...');
  
  const event = {
    httpMethod: 'POST',
    body: JSON.stringify({
      jsonrpc: '2.0',
      id: 2,
      method: 'tools/call',
      params: {
        name: 'get_session_summary',
        arguments: {
          user_name: 'Amanda'
        }
      }
    })
  };
  
  const result = await handler(event, {});
  console.log('Response:', JSON.parse(result.body));
  console.log('---');
};

// Run tests
const runTests = async () => {
  await testToolsList();
  await testSessionSummary();
};

runTests().catch(console.error);