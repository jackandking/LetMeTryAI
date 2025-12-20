#!/bin/bash

set -e

echo "🚀 Building and committing MCP server..."

# Navigate to MCP server directory
cd "$(dirname "$0")/../mcp-servers/letmetry-mysql"

echo "📦 Installing dependencies..."
npm install

echo "🔨 Building TypeScript..."
npm run build

echo "✅ Build complete!"

# Check if dist directory exists and has files
if [ ! -d "dist" ] || [ -z "$(ls -A dist)" ]; then
  echo "❌ Error: dist directory is empty or doesn't exist"
  exit 1
fi

echo "📝 Files in dist directory:"
ls -lh dist/

# Navigate back to repo root
cd ../..

echo "➕ Adding dist files to git..."
git add mcp-servers/letmetry-mysql/dist/

# Check if there are changes to commit
if git diff --cached --quiet; then
  echo "ℹ️  No changes to commit - dist files are already up to date"
else
  echo "💾 Committing changes..."
  git commit -m "chore: build and commit MCP server dist files

- Built letmetry-mysql MCP server
- Added dist/index.js and related files
- Ready for GitHub Copilot MCP integration"
  
  echo "🚀 Pushing to remote..."
  git push
  
  echo "✅ MCP server built and committed successfully!"
fi

echo ""
echo "🎉 Done! Your MCP server is ready to use in GitHub Copilot."
echo ""
echo "Next steps:"
echo "1. Go to https://github.com/jackandking/LetMeTryAI/settings"
echo "2. Enable Model Context Protocol (MCP) in Copilot settings"
echo "3. Use '@copilot' in issues to access MySQL MCP tools"
