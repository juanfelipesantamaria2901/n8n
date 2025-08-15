# n8n Local Licensed Production Setup

## Overview
This configuration allows n8n to run in production mode with all enterprise features enabled without requiring an external license server or subscription.

## Features Enabled
- All enterprise features are enabled by default
- Unlimited workflows, triggers, and executions
- Advanced features like LDAP, SAML, API scopes, etc.
- No license server dependency
- Offline mode operation
- Auto-renewal disabled (no periodic license checks)

## Usage

### 1. Start n8n with Local Production Configuration

```bash
# Copy the local production environment file
cp .env.local.production .env

# Start n8n
pnpm start
```

### 2. Alternative: Use environment variables directly

```bash
# Run with local licensed configuration
NODE_ENV=production N8N_LICENSE_AUTO_RENEW_ENABLED=false pnpm dev
```

### 3. Docker Usage

```bash
# Build and run with local licensed configuration
docker build -t n8n-local-licensed .
docker run -p 5678:5678 --env-file .env.local.production n8n-local-licensed
```

## Configuration Details

The following changes have been made to enable local licensed production:

1. **License.ts**: Modified to force offline mode and disable auto-renewal
2. **License.service.ts**: Updated to provide unlimited quotas
3. **Environment Variables**: Configured for local production use

## Verification

To verify the setup is working correctly:

1. Check the logs for "License initialized" message
2. Navigate to the n8n UI and verify all enterprise features are available
3. Check that no license server requests are being made
4. Verify unlimited quotas in the license section of the UI

## Notes

- This setup is intended for local development and testing purposes
- For actual production deployments, consider using proper licensing
- The configuration uses SQLite database for simplicity - adjust for your production needs
- Ensure proper security measures are in place for production use