#!/bin/bash

# Dual Lambda Deployment Script
# Deploys same codebase to two Lambda functions with different entry points

echo "Creating deployment package..."

# Create zip with all necessary files
zip -r lambda.zip index.js bedrock.js server.js package.json node_modules/

echo "Deploying to MCP Lambda (index.js handler)..."
aws lambda update-function-code \
  --function-name blacksheep_tarot-tracker-mcp-server \
  --zip-file fileb://lambda.zip \
  --region us-east-2

echo "Deploying to Bedrock Lambda (bedrock.js handler)..."
aws lambda update-function-code \
  --function-name blacksheep_tarot-tracker-bedrock \
  --zip-file fileb://lambda.zip \
  --region us-east-2

# Update handler configurations
echo "Configuring handlers..."
aws lambda update-function-configuration \
  --function-name blacksheep_tarot-tracker-mcp-server \
  --handler index.handler \
  --region us-east-2

aws lambda update-function-configuration \
  --function-name blacksheep_tarot-tracker-bedrock \
  --handler bedrock.handler \
  --region us-east-2

echo "Deployment complete!"
echo "MCP Function: blacksheep_tarot-tracker-mcp-server (index.handler)"
echo "Bedrock Function: blacksheep_tarot-tracker-bedrock (bedrock.handler)"