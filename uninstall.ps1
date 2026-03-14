# MemoryWell Uninstallation Script for Windows

$ErrorActionPreference = "Stop"

$INSTALL_DIR = "$env:USERPROFILE\.memorywell"
$BIN_DIR = "$env:USERPROFILE\.local\bin"

Write-Host "🗑️  MemoryWell Uninstallation" -ForegroundColor Cyan
Write-Host "============================" -ForegroundColor Cyan
Write-Host ""

if (Test-Path $INSTALL_DIR) {
    Write-Host "Removing $INSTALL_DIR..."
    Remove-Item -Path $INSTALL_DIR -Recurse -Force
} else {
    Write-Host "MemoryWell directory not found at $INSTALL_DIR"
}

Write-Host "Removing command wrappers from $BIN_DIR..."
Remove-Item -Path "$BIN_DIR\mwinit.bat" -ErrorAction SilentlyContinue
Remove-Item -Path "$BIN_DIR\mwpush.bat" -ErrorAction SilentlyContinue
Remove-Item -Path "$BIN_DIR\mwpop.bat" -ErrorAction SilentlyContinue
Remove-Item "$BIN_DIR\mwextract.cmd" -ErrorAction SilentlyContinue
Remove-Item -Path "$BIN_DIR\mwfind.bat" -ErrorAction SilentlyContinue
Remove-Item -Path "$BIN_DIR\mwsetfavorite.bat" -ErrorAction SilentlyContinue
Remove-Item -Path "$BIN_DIR\mwremap.bat" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "✅ MemoryWell has been uninstalled" -ForegroundColor Green
Write-Host ""
