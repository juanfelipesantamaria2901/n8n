# AI Assistant Configuration Guide

## Overview
This guide provides configuration options for setting up AI assistant endpoints in n8n. Currently configured for Google Cloud Vertex AI integration.

## Current Configuration

### Vertex AI Setup
- **Base URL**: `https://vertexai.com`
- **Environment Variable**: `N8N_AI_ASSISTANT_BASE_URL=https://vertexai.com`
- **Feature Flag**: `N8N_FEATURES_AI_ASSISTANT=true`

### Environment Variables
```bash
# Required for AI Assistant
export N8N_AI_ASSISTANT_BASE_URL=https://vertexai.com
export N8N_FEATURES_AI_ASSISTANT=true

# Optional: Vertex AI specific
export GOOGLE_CLOUD_PROJECT=your-project-id
export GOOGLE_CLOUD_REGION=us-central1
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json
```

## Future AI Endpoint Configurations

### OpenAI
```bash
export N8N_AI_ASSISTANT_BASE_URL=https://api.openai.com/v1
export OPENAI_API_KEY=your-openai-key
```

### Azure OpenAI
```bash
export N8N_AI_ASSISTANT_BASE_URL=https://your-resource.openai.azure.com
export AZURE_OPENAI_API_KEY=your-azure-key
export AZURE_OPENAI_ENDPOINT=https://your-resource.openai.azure.com
```

### Anthropic Claude
```bash
export N8N_AI_ASSISTANT_BASE_URL=https://api.anthropic.com
export ANTHROPIC_API_KEY=your-anthropic-key
```

### Custom Microservice
```bash
export N8N_AI_ASSISTANT_BASE_URL=https://your-custom-ai-service.com/api
export AI_SERVICE_API_KEY=your-service-key
```

## Configuration Files

### Core Configuration
- **File**: `packages/@n8n/config/src/configs/ai-assistant.config.ts`
- **Schema**: Defines `AiAssistantConfig` with `baseUrl` property
- **Environment**: `N8N_AI_ASSISTANT_BASE_URL`

### Service Integration
- **File**: `packages/cli/src/services/ai.service.ts`
- **Initialization**: `AiAssistantClient` with baseUrl from `globalConfig.aiAssistant.baseUrl`

## Testing

### Verify Configuration
```bash
# Check if AI assistant is enabled
curl -X GET http://localhost:5678/rest/ai/sessions

# Test chat endpoint
curl -X POST http://localhost:5678/rest/ai/chat \
  -H "Content-Type: application/json" \
  -d '{"message":"Hello AI"}'
```

### Health Check
```bash
# Check AI service health
node -e "
const config = require('./packages/@n8n/config/src/configs/ai-assistant.config');
console.log('AI Base URL:', process.env.N8N_AI_ASSISTANT_BASE_URL);
console.log('Feature Enabled:', process.env.N8N_FEATURES_AI_ASSISTANT);
"
```

## Troubleshooting

### Common Issues
1. **"Failed to parse URL"**: Ensure `N8N_AI_ASSISTANT_BASE_URL` is set
2. **"AI Assistant not available"**: Check `N8N_FEATURES_AI_ASSISTANT=true`
3. **Authentication errors**: Verify API keys and service account credentials

### Debug Mode
```bash
export N8N_LOG_LEVEL=debug
export N8N_AI_ASSISTANT_LOG_LEVEL=debug
```

## Security Notes
- Never commit API keys to version control
- Use environment variables for sensitive configuration
- Rotate API keys regularly
- Use service accounts with minimal required permissions

## Next Steps
1. Set up Vertex AI project and service account
2. Configure environment variables
3. Test AI assistant functionality
4. Monitor usage and costs
5. Scale to additional AI providers as needed