#!/bin/bash

set -e

INSTALL_DIR="${HOME}/.memorywell"
BIN_DIR="${HOME}/.local/bin"

echo "🗑️  MemoryWell Uninstallation"
echo "============================"
echo ""

if [ -d "$INSTALL_DIR" ]; then
    echo "Removing $INSTALL_DIR..."
    rm -rf "$INSTALL_DIR"
else
    echo "MemoryWell directory not found at $INSTALL_DIR"
fi

echo "Removing command wrappers from $BIN_DIR..."
rm -f "$BIN_DIR/mwinit"
rm -f "$BIN_DIR/mwpush"
rm -f "$BIN_DIR/mwpop"
rm -f "$BIN_DIR/mwextract"
rm -f "$BIN_DIR/mwfind"
rm -f "$BIN_DIR/mwsetfavorite"
rm -f "$BIN_DIR/mwremap"

echo ""
echo "✅ MemoryWell has been uninstalled"
echo ""
