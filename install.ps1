# MemoryWell Installation Script for Windows
# Requires PowerShell 5.1 or later

$ErrorActionPreference = "Stop"

$INSTALL_DIR = "$env:USERPROFILE\.memorywell"
$BIN_DIR = "$env:USERPROFILE\.local\bin"

Write-Host "🔧 MemoryWell Installation" -ForegroundColor Cyan
Write-Host "==========================" -ForegroundColor Cyan
Write-Host ""

# Create directories
if (-not (Test-Path $BIN_DIR)) {
    Write-Host "Creating $BIN_DIR..."
    New-Item -ItemType Directory -Path $BIN_DIR -Force | Out-Null
}

# Check if in PATH
$currentPath = [Environment]::GetEnvironmentVariable("Path", "User")
if ($currentPath -notlike "*$BIN_DIR*") {
    Write-Host ""
    Write-Host "⚠️  WARNING: $BIN_DIR is not in your PATH" -ForegroundColor Yellow
    Write-Host ""
    Write-Host "Adding to PATH automatically..."
    [Environment]::SetEnvironmentVariable(
        "Path",
        "$currentPath;$BIN_DIR",
        "User"
    )
    Write-Host "✓ Added to PATH. Please restart your terminal." -ForegroundColor Green
    Write-Host ""
}

Write-Host "Installing MemoryWell to $INSTALL_DIR..."

if (Test-Path $INSTALL_DIR) {
    Write-Host "Removing existing installation..."
    Remove-Item -Path $INSTALL_DIR -Recurse -Force
}

New-Item -ItemType Directory -Path $INSTALL_DIR -Force | Out-Null
New-Item -ItemType Directory -Path "$INSTALL_DIR\gui" -Force | Out-Null

$SCRIPT_DIR = Split-Path -Parent $MyInvocation.MyCommand.Path

# Copy files
Copy-Item "$SCRIPT_DIR\src\init.js" "$INSTALL_DIR\"
Copy-Item "$SCRIPT_DIR\src\push.js" "$INSTALL_DIR\"
Copy-Item "$SCRIPT_DIR\src\pop.js" "$INSTALL_DIR\"
Copy-Item "$ScriptDir\src\extract.js" "$InstallDir\extract.js"
Copy-Item "$SCRIPT_DIR\src\import.js" "$INSTALL_DIR\"
Copy-Item "$SCRIPT_DIR\src\find.js" "$INSTALL_DIR\"
Copy-Item "$SCRIPT_DIR\src\setfavorite.js" "$INSTALL_DIR\"
Copy-Item "$SCRIPT_DIR\src\remap.js" "$INSTALL_DIR\"
Copy-Item "$SCRIPT_DIR\src\gui\gui-helpers.js" "$INSTALL_DIR\gui\"
Copy-Item "$SCRIPT_DIR\src\gui\gui-push.js" "$INSTALL_DIR\gui\"
Copy-Item "$SCRIPT_DIR\src\gui\gui-pop.js" "$INSTALL_DIR\gui\"
Copy-Item "$ScriptDir\src\gui\gui-extract.js" "$InstallDir\gui-extract.js"
Copy-Item "$SCRIPT_DIR\src\gui\gui-import.js" "$INSTALL_DIR\gui\"
Copy-Item "$SCRIPT_DIR\src\gui\gui-find.js" "$INSTALL_DIR\gui\"
Copy-Item "$SCRIPT_DIR\src\gui\gui-setfavorite.js" "$INSTALL_DIR\gui\"
Copy-Item "$SCRIPT_DIR\src\gui\gui-remap.js" "$INSTALL_DIR\gui\"

Write-Host "Creating command wrappers..."

# Create batch wrappers
@"
@echo off
node "%USERPROFILE%\.memorywell\init.js" %*
"@ | Out-File -FilePath "$BIN_DIR\mwinit.bat" -Encoding ASCII

@"
@echo off
node "%USERPROFILE%\.memorywell\push.js" %*
"@ | Out-File -FilePath "$BIN_DIR\mwpush.bat" -Encoding ASCII

@"
@echo off
node "%USERPROFILE%\.memorywell\pop.js" %*
"@ | Out-File -FilePath "$BIN_DIR\mwpop.bat" -Encoding ASCII

@'
@echo off
node "%USERPROFILE%\.memorywell\extract.js" %*
'@ | Out-File -FilePath "$BinDir\mwextract.cmd" -Encoding ASCII

@"
@echo off
node "%USERPROFILE%\.memorywell\import.js" %*
"@ | Out-File -FilePath "$BIN_DIR\mwimport.bat" -Encoding ASCII

@"
@echo off
node "%USERPROFILE%\.memorywell\find.js" %*
"@ | Out-File -FilePath "$BIN_DIR\mwfind.bat" -Encoding ASCII

@"
@echo off
node "%USERPROFILE%\.memorywell\setfavorite.js" %*
"@ | Out-File -FilePath "$BIN_DIR\mwsetfavorite.bat" -Encoding ASCII

@"
@echo off
node "%USERPROFILE%\.memorywell\remap.js" %*
"@ | Out-File -FilePath "$BIN_DIR\mwremap.bat" -Encoding ASCII

Write-Host ""
Write-Host "✅ Installation complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Available commands:"
Write-Host "  mwinit         - Initialize a MemoryWell folder"
Write-Host "  mwpush         - Archive files to MemoryWell"
Write-Host "  mwpop          - Restore files from archive"
Write-Host "  mwfind         - Search through archives"
Write-Host "  mwsetfavorite  - Mark/unmark archives as favorite"
Write-Host ""
Write-Host "Quick start:"
Write-Host "  cd your-folder"
Write-Host "  mwinit"
Write-Host "  # Add some files..."
Write-Host '  mwpush "my first archive"'
Write-Host ""
Write-Host "⚠️  Please restart your terminal for PATH changes to take effect" -ForegroundColor Yellow
Write-Host ""
