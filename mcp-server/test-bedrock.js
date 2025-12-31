import { TarotTrackerMCPServer } from './server.js';

const server = new TarotTrackerMCPServer();

async function testBedrockFormat() {
  console.log('Testing Bedrock Agent format...');
  
  try {
    // Test the new forBedrock parameter
    const result = await server.callTool('get_top_locations', {
      user_name: 'Amanda',
      limit: 3
    }, true);
    
    console.log('Bedrock format result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Verify it's raw JSON, not MCP format
    if (result.top_locations && Array.isArray(result.top_locations)) {
      console.log('✅ Bedrock format working - returns raw JSON');
    } else {
      console.log('❌ Bedrock format failed - wrong structure');
    }
    
  } catch (error) {
    console.log('❌ Bedrock format error:', error.message);
  }
}

async function testMCPFormat() {
  console.log('\nTesting MCP format (existing functionality)...');
  
  try {
    // Test existing MCP format
    const result = await server.callTool('get_top_locations', {
      user_name: 'Amanda',
      limit: 3
    }, false);
    
    console.log('MCP format result:');
    console.log(JSON.stringify(result, null, 2));
    
    // Verify it's MCP format
    if (result.content && result.content[0] && result.content[0].type === 'text') {
      console.log('✅ MCP format working - returns content array');
    } else {
      console.log('❌ MCP format failed - wrong structure');
    }
    
  } catch (error) {
    console.log('❌ MCP format error:', error.message);
  }
}

async function runTests() {
  await testMCPFormat();
  await testBedrockFormat();
  console.log('\nTest complete!');
}

runTests();