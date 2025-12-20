#!/bin/bash

###############################################################################
# LetMeTry MCP Server Setup Script
# 
# This script sets up the LetMeTry MySQL MCP Server for GitHub Copilot
# No API key is required - the server connects directly to letmetry.cloud
#
# Usage: ./scripts/setup-mcp.sh
###############################################################################

set -e  # Exit on error

echo "================================================"
echo "LetMeTry MySQL MCP Server Setup"
echo "================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Get the script directory and project root
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
MCP_DIR="$PROJECT_ROOT/mcp-servers/letmetry-mysql"

echo -e "${BLUE}Project root: $PROJECT_ROOT${NC}"
echo -e "${BLUE}MCP server directory: $MCP_DIR${NC}"
echo ""

# Check if Node.js is installed
if ! command -v node &> /dev/null; then
    echo -e "${YELLOW}Error: Node.js is not installed${NC}"
    echo "Please install Node.js (v16 or higher) from https://nodejs.org/"
    exit 1
fi

NODE_VERSION=$(node --version)
echo -e "${GREEN}✓ Node.js found: $NODE_VERSION${NC}"

# Check if npm is installed
if ! command -v npm &> /dev/null; then
    echo -e "${YELLOW}Error: npm is not installed${NC}"
    echo "Please install npm (usually comes with Node.js)"
    exit 1
fi

NPM_VERSION=$(npm --version)
echo -e "${GREEN}✓ npm found: v$NPM_VERSION${NC}"
echo ""

# Navigate to MCP server directory
cd "$MCP_DIR"

echo -e "${BLUE}Installing MCP server dependencies...${NC}"
npm install

echo ""
echo -e "${BLUE}Building MCP server...${NC}"
npm run build

echo ""
echo -e "${GREEN}================================================${NC}"
echo -e "${GREEN}✓ MCP Server setup completed successfully!${NC}"
echo -e "${GREEN}================================================${NC}"
echo ""
echo -e "${BLUE}Next steps:${NC}"
echo "1. The MCP server is now ready to use with GitHub Copilot"
echo "2. Configuration is in .github/copilot-mcp.json"
echo "3. Try these commands in Copilot:"
echo "   - 'Show me the latest 10 images from beauty_images table'"
echo "   - 'Query the beauty_images table'"
echo "   - 'Get the schema for beauty_images table'"
echo ""
echo -e "${YELLOW}Note: No API key is required. The server connects directly to letmetry.cloud${NC}"
echo ""
