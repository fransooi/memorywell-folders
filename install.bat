@echo off
setlocal EnableDelayedExpansion

set "INSTALL_DIR=%USERPROFILE%\.memorywell"
set "BIN_DIR=%USERPROFILE%\.local\bin"

echo MemoryWell Installation
echo =======================
echo.

node --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Node.js is not installed or is not in PATH.
    echo Please install Node.js from https://nodejs.org/ and try again.
    exit /b 1
)

if not exist "%BIN_DIR%" (
    echo Creating %BIN_DIR%...
    mkdir "%BIN_DIR%"
)

echo Checking PATH...
powershell -NoProfile -Command "$current = [Environment]::GetEnvironmentVariable('Path', 'User'); if ($current -notlike '*%BIN_DIR%*') { [Environment]::SetEnvironmentVariable('Path', $current + ';%BIN_DIR%', 'User'); Write-Host 'Added %BIN_DIR% to your PATH.' } else { Write-Host '%BIN_DIR% is already in your PATH.' }"

if exist "%INSTALL_DIR%" (
    echo Removing existing installation...
    rmdir /S /Q "%INSTALL_DIR%"
)

mkdir "%INSTALL_DIR%"
mkdir "%INSTALL_DIR%\gui"

echo Installing MemoryWell to %INSTALL_DIR%...

copy "%~dp0src\init.js"          "%INSTALL_DIR%\" >nul
copy "%~dp0src\push.js"          "%INSTALL_DIR%\" >nul
copy "%~dp0src\pop.js"           "%INSTALL_DIR%\" >nul
copy "%~dp0src\extract.js"       "%INSTALL_DIR%\" >nul
copy "%~dp0src\import.js"        "%INSTALL_DIR%\" >nul
copy "%~dp0src\find.js"          "%INSTALL_DIR%\" >nul
copy "%~dp0src\setfavorite.js"   "%INSTALL_DIR%\" >nul
copy "%~dp0src\remap.js"         "%INSTALL_DIR%\" >nul

copy "%~dp0src\gui\gui-helpers.js"      "%INSTALL_DIR%\gui\" >nul
copy "%~dp0src\gui\gui-push.js"         "%INSTALL_DIR%\gui\" >nul
copy "%~dp0src\gui\gui-pop.js"          "%INSTALL_DIR%\gui\" >nul
copy "%~dp0src\gui\gui-extract.js"      "%INSTALL_DIR%\gui\" >nul
copy "%~dp0src\gui\gui-import.js"       "%INSTALL_DIR%\gui\" >nul
copy "%~dp0src\gui\gui-find.js"         "%INSTALL_DIR%\gui\" >nul
copy "%~dp0src\gui\gui-setfavorite.js"  "%INSTALL_DIR%\gui\" >nul
copy "%~dp0src\gui\gui-remap.js"        "%INSTALL_DIR%\gui\" >nul

rem Dependencies -- the scripts require "ignore"
if not exist "%~dp0node_modules\ignore" (
    echo Installing dependencies...
    pushd "%~dp0"
    call npm install --omit=dev --no-audit --no-fund
    popd
)
if exist "%~dp0node_modules" (
    xcopy "%~dp0node_modules" "%INSTALL_DIR%\node_modules" /E /I /Y >nul
)

echo Creating command wrappers...

(
    echo @echo off
    echo node "%%USERPROFILE%%\.memorywell\init.js" %%*
) > "%BIN_DIR%\mwinit.bat"

(
    echo @echo off
    echo node "%%USERPROFILE%%\.memorywell\push.js" %%*
) > "%BIN_DIR%\mwpush.bat"

(
    echo @echo off
    echo node "%%USERPROFILE%%\.memorywell\pop.js" %%*
) > "%BIN_DIR%\mwpop.bat"

(
    echo @echo off
    echo node "%%USERPROFILE%%\.memorywell\extract.js" %%*
) > "%BIN_DIR%\mwextract.bat"

(
    echo @echo off
    echo node "%%USERPROFILE%%\.memorywell\import.js" %%*
) > "%BIN_DIR%\mwimport.bat"

(
    echo @echo off
    echo node "%%USERPROFILE%%\.memorywell\find.js" %%*
) > "%BIN_DIR%\mwfind.bat"

(
    echo @echo off
    echo node "%%USERPROFILE%%\.memorywell\setfavorite.js" %%*
) > "%BIN_DIR%\mwsetfavorite.bat"

(
    echo @echo off
    echo node "%%USERPROFILE%%\.memorywell\remap.js" %%*
) > "%BIN_DIR%\mwremap.bat"

echo.
echo Installation complete!
echo.
echo Available commands:
echo   mwinit         - Initialize a MemoryWell folder
echo   mwpush         - Archive files to MemoryWell
echo   mwpop          - Restore files from archive
echo   mwextract      - Restore files without removing archive
echo   mwimport       - Import external directories
echo   mwfind         - Search through archives
echo   mwsetfavorite  - Mark/unmark archives as favorite
echo   mwremap        - Remap archive links
echo.
echo Quick start:
echo   cd your-folder
echo   mwinit
echo   mwpush "my first archive"
echo.
echo IMPORTANT: Please restart your command prompt for PATH changes to take effect.
echo.
pause
endlocal
