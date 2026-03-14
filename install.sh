#!/bin/bash

set -e

INSTALL_DIR="${HOME}/.memorywell"
BIN_DIR="${HOME}/.local/bin"

echo "🔧 MemoryWell Installation"
echo "=========================="
echo ""

if [ ! -d "$BIN_DIR" ]; then
    echo "Creating $BIN_DIR..."
    mkdir -p "$BIN_DIR"
fi

if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo ""
    echo "⚠️  WARNING: $BIN_DIR is not in your PATH"
    echo ""
    echo "Add this line to your shell configuration file:"
    echo ""
    
    if [ -n "$ZSH_VERSION" ]; then
        echo "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.zshrc"
        echo "  source ~/.zshrc"
    elif [ -n "$BASH_VERSION" ]; then
        echo "  echo 'export PATH=\"\$HOME/.local/bin:\$PATH\"' >> ~/.bashrc"
        echo "  source ~/.bashrc"
    else
        echo "  export PATH=\"\$HOME/.local/bin:\$PATH\""
    fi
    echo ""
fi

echo "Installing MemoryWell to $INSTALL_DIR..."

if [ -d "$INSTALL_DIR" ]; then
    echo "Removing existing installation..."
    rm -rf "$INSTALL_DIR"
fi

mkdir -p "$INSTALL_DIR"

SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"

mkdir -p "$INSTALL_DIR/gui"

cp "$SCRIPT_DIR/src/init.js" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/src/push.js" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/src/pop.js" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/src/extract.js" "$INSTALL_DIR/extract.js"
cp "$SCRIPT_DIR/src/import.js" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/src/find.js" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/src/setfavorite.js" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/src/remap.js" "$INSTALL_DIR/"
cp "$SCRIPT_DIR/src/gui/gui-helpers.js" "$INSTALL_DIR/gui/"
cp "$SCRIPT_DIR/src/gui/gui-push.js" "$INSTALL_DIR/gui/"
cp "$SCRIPT_DIR/src/gui/gui-pop.js" "$INSTALL_DIR/gui/"
cp "$SCRIPT_DIR/src/gui/gui-extract.js" "$INSTALL_DIR/gui/"
cp "$SCRIPT_DIR/src/gui/gui-import.js" "$INSTALL_DIR/gui/"
cp "$SCRIPT_DIR/src/gui/gui-find.js" "$INSTALL_DIR/gui/"
cp "$SCRIPT_DIR/src/gui/gui-setfavorite.js" "$INSTALL_DIR/gui/"
cp "$SCRIPT_DIR/src/gui/gui-remap.js" "$INSTALL_DIR/gui/"

chmod +x "$INSTALL_DIR"/*.js
chmod +x "$INSTALL_DIR/gui"/*.js

echo "Creating command wrappers..."

cat > "$BIN_DIR/mwinit" << 'EOF'
#!/bin/bash
node "$HOME/.memorywell/init.js" "$@"
EOF

cat > "$BIN_DIR/mwpush" << 'EOF'
#!/bin/bash
node "$HOME/.memorywell/push.js" "$@"
EOF

cat > "$BIN_DIR/mwpop" << 'EOF'
#!/bin/bash
node "$HOME/.memorywell/pop.js" "$@"
EOF

cat > "$BIN_DIR/mwextract" << 'EOF'
#!/bin/bash
node "$HOME/.memorywell/extract.js" "$@"
EOF

cat > "$BIN_DIR/mwimport" << 'EOF'
#!/bin/bash
node "$HOME/.memorywell/import.js" "$@"
EOF

cat > "$BIN_DIR/mwfind" << 'EOF'
#!/bin/bash
node "$HOME/.memorywell/find.js" "$@"
EOF

cat > "$BIN_DIR/mwsetfavorite" << 'EOF'
#!/bin/bash
node "$HOME/.memorywell/setfavorite.js" "$@"
EOF

cat > "$BIN_DIR/mwremap" << 'EOF'
#!/bin/bash
node "$HOME/.memorywell/remap.js" "$@"
EOF

chmod +x "$BIN_DIR"/mw*

echo ""
echo "✅ Installation complete!"
echo ""
echo "Available commands:"
echo "  mwinit         - Initialize a MemoryWell folder"
echo "  mwpush         - Archive files to MemoryWell"
echo "  mwpop          - Restore files from archive"
echo "  mwfind         - Search through archives"
echo "  mwsetfavorite  - Mark/unmark archives as favorite"
echo ""
echo "Quick start:"
echo "  cd your-folder"
echo "  mwinit"
echo "  # Add some files..."
echo "  mwpush \"my first archive\""
echo ""

if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo "⚠️  Don't forget to add $BIN_DIR to your PATH (see instructions above)"
    echo ""
fi
