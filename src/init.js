#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const os = require('os');

function isMemoryWell(dir) {
  // Check for --nolinks mode (structure inside 00-memorywell)
  if (fs.existsSync(path.join(dir, '00-memorywell'))) {
    const requiredDirs = ['01-last-week', '02-last-month', '03-last-year', '04-favorites', '05-folders'];
    return requiredDirs.every(d => fs.existsSync(path.join(dir, '00-memorywell', d)));
  }
  // Check for full mode (structure at root)
  const requiredDirs = ['01-last-week', '02-last-month', '03-last-year', '04-favorites', '05-folders'];
  return requiredDirs.every(d => fs.existsSync(path.join(dir, d)));
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
      { name: 'push', script: 'gui/gui-push.js', icon: '📦' },
      { name: 'extract', script: 'gui/gui-extract.js', icon: '📂' },
      { name: 'find', script: 'gui/gui-find.js', icon: '🔍' },
      { name: 'setfavorite', script: 'gui/gui-setfavorite.js', icon: '⭐' }
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
  const useGUI = args.includes('--gui');
  const hidden = args.includes('--hidden');
  
  if (isMemoryWell(cwd)) {
    console.log('❌ This directory is already a MemoryWell');
    process.exit(1);
  }
  
  try {
    const dirs = ['01-last-week', '02-last-month', '03-last-year', '04-favorites', '05-folders'];
    
    if (hidden) {
      // Hidden mode: structure inside 00-memorywell/
      const baseDir = path.join(cwd, '00-memorywell');
      
      dirs.forEach(dir => {
        const dirPath = path.join(baseDir, dir);
        fs.mkdirSync(dirPath, { recursive: true });
      });
      
      console.log('✓ Created 00-memorywell/ (with internal structure)');
      console.log('\n✅ MemoryWell initialized (hidden mode - single visible folder)!');
    } else {
      // Full mode: structure at root
      dirs.forEach(dir => {
        const dirPath = path.join(cwd, dir);
        fs.mkdirSync(dirPath, { recursive: true });
        console.log(`✓ Created ${dir}/`);
      });
      
      console.log('\n✅ MemoryWell initialized successfully!');
    }
    
    if (useGUI) {
      console.log('\n📱 Creating GUI applications...');
      const installDir = process.env.HOME ? path.join(process.env.HOME, '.memorywell') : null;
      createGUIApps(cwd, installDir);
      console.log('\n✨ GUI apps created! Double-click to use.');
    }
    
    console.log('\nYou can now use:');
    console.log('  - mwpush: Archive files from root');
    console.log('  - mwextract: Restore an archive to root');
    console.log('  - mwfind: Search through archives');
    
    if (useGUI) {
      console.log('\nOr use the GUI apps in this folder!');
    }
  } catch (error) {
    console.error('❌ Error initializing MemoryWell:', error.message);
    process.exit(1);
  }
}

initMemoryWell();
