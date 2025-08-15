#!/bin/bash

# AI Assistant Configuration Setup Script
# This script configures n8n to use Vertex AI or other AI providers

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENV_FILE="$SCRIPT_DIR/.env"
AI_CONFIG_FILE="$SCRIPT_DIR/.env.ai-assistant"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

echo "🤖 AI Assistant Configuration Setup"
echo "=================================="

# Function to display help
show_help() {
    echo "Usage: $0 [OPTIONS]"
    echo ""
    echo "Configure AI Assistant for n8n"
    echo ""
    echo "Options:"
    echo "  -h, --help              Show this help message"
    echo "  -p, --provider NAME     Set AI provider (vertexai, openai, anthropic, azure, custom)"
    echo "  -u, --url URL           Custom AI service URL"
    echo "  --disable               Disable AI assistant"
    echo "  --check                 Check current configuration"
}

# Function to check if .env exists
ensure_env_file() {
    if [[ ! -f "$ENV_FILE" ]]; then
        echo -e "${YELLOW}Creating .env file...${NC}"
        touch "$ENV_FILE"
    fi
}

# Function to configure Vertex AI
configure_vertexai() {
    echo -e "${GREEN}Configuring Vertex AI...${NC}"
    
    ensure_env_file
    
    # Add or update AI assistant configuration
    {
        echo "# AI Assistant Configuration - Vertex AI"
        echo "N8N_AI_ASSISTANT_BASE_URL=https://vertexai.com"
        echo "N8N_FEATURES_AI_ASSISTANT=true"
        echo ""
        echo "# Google Cloud Configuration (update these values)"
        echo "GOOGLE_CLOUD_PROJECT=your-project-id"
        echo "GOOGLE_CLOUD_REGION=us-central1"
        echo "GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account.json"
    } >> "$ENV_FILE"
    
    echo -e "${GREEN}✅ Vertex AI configured successfully!${NC}"
    echo "Please update the Google Cloud project details in .env file"
}

# Function to configure custom AI service
configure_custom() {
    local url=$1
    if [[ -z "$url" ]]; then
        echo -e "${RED}Error: Custom URL is required${NC}"
        exit 1
    fi
    
    echo -e "${GREEN}Configuring custom AI service: $url${NC}"
    
    ensure_env_file
    
    # Add or update AI assistant configuration
    {
        echo "# AI Assistant Configuration - Custom Service"
        echo "N8N_AI_ASSISTANT_BASE_URL=$url"
        echo "N8N_FEATURES_AI_ASSISTANT=true"
    } >> "$ENV_FILE"
    
    echo -e "${GREEN}✅ Custom AI service configured successfully!${NC}"
}

# Function to disable AI assistant
disable_ai() {
    echo -e "${YELLOW}Disabling AI assistant...${NC}"
    
    ensure_env_file
    
    # Add or update to disable AI assistant
    {
        echo "# AI Assistant Configuration - Disabled"
        echo "N8N_FEATURES_AI_ASSISTANT=false"
    } >> "$ENV_FILE"
    
    echo -e "${GREEN}✅ AI assistant disabled${NC}"
}

# Function to check current configuration
check_config() {
    echo -e "${GREEN}Current AI Assistant Configuration:${NC}"
    echo "=================================="
    
    if [[ -f "$ENV_FILE" ]]; then
        if grep -q "N8N_AI_ASSISTANT_BASE_URL" "$ENV_FILE"; then
            echo -e "${GREEN}Base URL:${NC} $(grep "N8N_AI_ASSISTANT_BASE_URL" "$ENV_FILE" | cut -d'=' -f2)"
        else
            echo -e "${RED}Base URL: Not configured${NC}"
        fi
        
        if grep -q "N8N_FEATURES_AI_ASSISTANT" "$ENV_FILE"; then
            local enabled=$(grep "N8N_FEATURES_AI_ASSISTANT" "$ENV_FILE" | cut -d'=' -f2)
            if [[ "$enabled" == "true" ]]; then
                echo -e "${GREEN}Status: Enabled${NC}"
            else
                echo -e "${RED}Status: Disabled${NC}"
            fi
        else
            echo -e "${YELLOW}Status: Not configured (default: disabled)${NC}"
        fi
    else
        echo -e "${RED}.env file not found${NC}"
    fi
}

# Parse command line arguments
while [[ $# -gt 0 ]]; do
    case $1 in
        -h|--help)
            show_help
            exit 0
            ;;
        -p|--provider)
            PROVIDER="$2"
            shift 2
            ;;
        -u|--url)
            CUSTOM_URL="$2"
            shift 2
            ;;
        --disable)
            ACTION="disable"
            shift
            ;;
        --check)
            ACTION="check"
            shift
            ;;
        *)
            echo -e "${RED}Error: Unknown option $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# Default action based on provider
if [[ -z "$ACTION" ]]; then
    case "${PROVIDER:-vertexai}" in
        vertexai)
            configure_vertexai
            ;;
        openai)
            configure_custom "https://api.openai.com/v1"
            ;;
        anthropic)
            configure_custom "https://api.anthropic.com"
            ;;
        azure)
            configure_custom "https://your-resource.openai.azure.com"
            ;;
        custom)
            configure_custom "$CUSTOM_URL"
            ;;
        *)
            echo -e "${RED}Error: Unknown provider $PROVIDER${NC}"
            show_help
            exit 1
            ;;
    esac
else
    case "$ACTION" in
        disable)
            disable_ai
            ;;
        check)
            check_config
            ;;
    esac
fi

echo ""
echo -e "${GREEN}Next steps:${NC}"
echo "1. Review the configuration in .env file"
echo "2. Restart n8n to apply changes"
echo "3. Check AI functionality in the interface"
echo ""
echo "For detailed documentation, see AI_ASSISTANT_CONFIG.md"