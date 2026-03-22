#!/bin/bash
# Install yy-codereview to system PATH

set -e

SCRIPT_DIR="$(cd "$(dirname "$(readlink -f "$0" 2>/dev/null || echo "$0")")" && pwd)"
INSTALL_DIR="/usr/local/bin"

echo "Installing yy-codereview..."

# Build the project first
echo "Building project..."
cd "$SCRIPT_DIR"
mvn package -DskipTests -q

# Make scripts executable
chmod +x "$SCRIPT_DIR/yy-codereview"

# Create symlink
echo "Creating symlink in $INSTALL_DIR..."
sudo ln -sf "$SCRIPT_DIR/yy-codereview" "$INSTALL_DIR/yy-codereview"

echo ""
echo "✅ Installation complete!"
echo ""
echo "Usage:"
echo "  cd /path/to/your-project"
echo "  yy-codereview \"review current branch\""
echo ""
echo "Make sure to set your API key:"
echo "  export AI_API_KEY=your-key"
echo ""
