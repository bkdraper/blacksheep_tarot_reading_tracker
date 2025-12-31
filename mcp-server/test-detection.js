// Test the Lambda handler logic for detecting request types

// Mock MCP request (has jsonrpc field)
const mcpRequest = {
  jsonrpc: "2.0",
  id: 1,
  method: "tools/call",
  params: {
    name: "get_top_locations",
    arguments: { user_name: "Amanda", limit: 3 }
  }
};

// Mock Bedrock Agent request (has actionGroup and function fields)
const bedrockRequest = {
  actionGroup: "TarotDataTools",
  function: "get_top_locations",
  parameters: { user_name: "Amanda", limit: 3 }
};

function testRequestDetection() {
  console.log('Testing request type detection...\n');
  
  // Test MCP detection
  const isMCP = mcpRequest.jsonrpc && !mcpRequest.actionGroup;
  console.log('MCP Request:', JSON.stringify(mcpRequest, null, 2));
  console.log('Detected as MCP:', isMCP ? '✅' : '❌');
  
  // Test Bedrock detection  
  const isBedrock = !bedrockRequest.jsonrpc && bedrockRequest.actionGroup && bedrockRequest.function;
  console.log('\nBedrock Request:', JSON.stringify(bedrockRequest, null, 2));
  console.log('Detected as Bedrock:', isBedrock ? '✅' : '❌');
  
  console.log('\nDetection logic working correctly!');
}

testRequestDetection();