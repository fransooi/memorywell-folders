#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

function isMemoryWell(dir) {
  // Mode 1: --nolinks=false --hidden=false (structure at root)
  const requiredDirs = ['01-last-week', '02-last-month', '03-last-year', '04-favorites', '05-folders'];
  if (requiredDirs.every(d => fs.existsSync(path.join(dir, d)))) {
    return true;
  }
  
  // Mode 2 & 3: --nolinks=true (00-memorywell-folders)
  if (fs.existsSync(path.join(dir, '00-memorywell-folders'))) {
    return true;
  }
  
  // Mode 4: --hidden=true (00-memorywell with structure)
  if (fs.existsSync(path.join(dir, '00-memorywell'))) {
    return requiredDirs.every(d => fs.existsSync(path.join(dir, '00-memorywell', d)));
  }
  
  return false;
}

function showHelp() {
  console.log(`
MemoryWell Init - Initialize a directory as a MemoryWell

Usage: mwinit [options]

Options:
  --nolinks    Archives only mode (no time-based organization)
  --hidden     Hide structure in single folder
  --help       Show this help message

Modes:
  Mode 1: mwinit                    Full structure at root
  Mode 2: mwinit --nolinks          Archives only in 00-memorywell-folders/
  Mode 4: mwinit --hidden           Hidden structure in 00-memorywell/
  
Examples:
  mwinit                    # Full visible structure
  mwinit --hidden           # Hidden structure in 00-memorywell/
  mwinit --nolinks          # Ultra-simple archives only
`);
  process.exit(0);
}

function createGUIApps(cwd, installDir) {
  const platform = os.platform();
  
  if (platform === 'darwin') {
    const apps = [
      { name: 'Push', script: 'gui/gui-push.js', icon: '📦' },
      { name: 'Pop', script: 'gui/gui-pop.js', icon: '📂' },
      { name: 'Find', script: 'gui/gui-find.js', icon: '🔍' },
      { name: 'SetFavorite', script: 'gui/gui-setfavorite.js', icon: '⭐' }
    ];
    
    apps.forEach(app => {
      const appDir = path.join(cwd, `MemoryWell-${app.name}.app`);
      const contentsDir = path.join(appDir, 'Contents');
      const macosDir = path.join(contentsDir, 'MacOS');
      const resourcesDir = path.join(contentsDir, 'Resources');
      
      fs.mkdirSync(macosDir, { recursive: true });
      fs.mkdirSync(resourcesDir, { recursive: true });
      
      const infoPlist = `<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
    <key>CFBundleExecutable</key>
    <string>run</string>
    <key>CFBundleName</key>
    <string>MemoryWell ${app.name}</string>
    <key>CFBundleIconFile</key>
    <string>icon</string>
    <key>CFBundlePackageType</key>
    <string>APPL</string>
</dict>
</plist>`;
      
      fs.writeFileSync(path.join(contentsDir, 'Info.plist'), infoPlist);
      
      const scriptPath = installDir ? path.join(installDir, app.script) : path.join(__dirname, '..', app.script);
      const runScript = `#!/bin/bash
cd "$(dirname "$0")/../../.."
node "${scriptPath}"`;
      
      fs.writeFileSync(path.join(macosDir, 'run'), runScript);
      fs.chmodSync(path.join(macosDir, 'run'), 0o755);
      
      console.log(`  ✓ Created ${app.icon} MemoryWell-${app.name}.app`);
    });
  } else if (platform === 'linux') {
    const apps = [
      { name: 'Push', script: 'gui/gui-push.js', icon: '📦' },
      { name: 'Pop', script: 'gui/gui-pop.js', icon: '📤' },
      { name: 'Extract', script: 'gui/gui-extract.js', icon: '📂' },
      { name: 'Import', script: 'gui/gui-import.js', icon: '📥' },
      { name: 'Find', script: 'gui/gui-find.js', icon: '🔍' },
      { name: 'SetFavorite', script: 'gui/gui-setfavorite.js', icon: '⭐' },
      { name: 'Remap', script: 'gui/gui-remap.js', icon: '🔄' }
    ];
    
    apps.forEach(app => {
      const scriptPath = installDir ? path.join(installDir, app.script) : path.join(__dirname, '..', app.script);
      const desktopFile = `#!/bin/bash
cd "$(dirname "$0")"
node "${scriptPath}"`;
      
      const fileName = path.join(cwd, `memorywell-${app.name.toLowerCase()}.sh`);
      fs.writeFileSync(fileName, desktopFile);
      fs.chmodSync(fileName, 0o755);
      
      console.log(`  ✓ Created ${app.icon} memorywell-${app.name.toLowerCase()}.sh`);
    });
  }
}

function initMemoryWell() {
  const cwd = process.cwd();
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    showHelp();
  }
  
  const noLinks = args.includes('--nolinks');
  const hidden = args.includes('--hidden');
  
  if (isMemoryWell(cwd)) {
    console.log('❌ This directory is already a MemoryWell');
    process.exit(1);
  }
  
  try {
    const dirs = ['01-last-week', '02-last-month', '03-last-year', '04-favorites', '05-folders'];
    
    if (noLinks && hidden) {
      // Mode 3: --nolinks=true --hidden=true
      // Same as mode 2: just 00-memorywell-folders
      const foldersDir = path.join(cwd, '00-memorywell-folders');
      fs.mkdirSync(foldersDir, { recursive: true });
      console.log('✓ Created 00-memorywell-folders/');
      console.log('\n✅ MemoryWell initialized (no links + hidden mode)!');
    } else if (noLinks) {
      // Mode 2: --nolinks=true --hidden=false
      // Just 00-memorywell-folders at root
      const foldersDir = path.join(cwd, '00-memorywell-folders');
      fs.mkdirSync(foldersDir, { recursive: true });
      console.log('✓ Created 00-memorywell-folders/');
      console.log('\n✅ MemoryWell initialized (no links mode)!');
    } else if (hidden) {
      // Mode 4: --nolinks=false --hidden=true
      // Structure inside 00-memorywell/
      const baseDir = path.join(cwd, '00-memorywell');
      dirs.forEach(dir => {
        const dirPath = path.join(baseDir, dir);
        fs.mkdirSync(dirPath, { recursive: true });
      });
      console.log('✓ Created 00-memorywell/ (with internal structure)');
      console.log('\n✅ MemoryWell initialized (hidden mode)!');
    } else {
      // Mode 1: --nolinks=false --hidden=false (default)
      // Structure at root
      dirs.forEach(dir => {
        const dirPath = path.join(cwd, dir);
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✓ Created ${dir}/`);
      });
      console.log('\n✅ MemoryWell initialized successfully!');
    }
    
    console.log('\nYou can now use:');
    console.log('  - mwpush: Archive files from root');
    console.log('  - mwextract: Restore an archive to root');
    console.log('  - mwfind: Search through archives');
    console.log('  - mwimport: Import external directories');
    console.log('  - mwremap: Remap symlinks');
    console.log('  - mwsetfavorite: Mark archives as favorites');
  } catch (error) {
    console.error('❌ Error initializing MemoryWell:', error.message);
    process.exit(1);
  }
}

initMemoryWell();
