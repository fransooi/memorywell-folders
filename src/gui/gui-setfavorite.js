#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { showDialog, showListDialog } = require(path.join(__dirname, 'gui-helpers.js'));

function getBaseDir(cwd) {
  if (fs.existsSync(path.join(cwd, '00-memorywell'))) {
    return path.join(cwd, '00-memorywell');
  }
  return cwd;
}

const cwd = process.cwd();

try {
  const archivesDir = path.join(getBaseDir(cwd), '05-folders');
  
  if (!fs.existsSync(archivesDir)) {
    showDialog('MemoryWell Set Favorite', 'No archives found!', 'warning');
    process.exit(0);
  }
  
  const archives = fs.readdirSync(archivesDir)
    .filter(name => /^\d{2}-\d{8}-\d{6}/.test(name))
    .sort()
    .reverse();
  
  if (archives.length === 0) {
    showDialog('MemoryWell Set Favorite', 'No archives found!', 'warning');
    process.exit(0);
  }
  
  const favoritesDir = path.join(getBaseDir(cwd), '04-favorites');
  const archivesWithStatus = archives.map(archive => {
    const isFav = fs.existsSync(path.join(favoritesDir, archive));
    return isFav ? `⭐ ${archive}` : `   ${archive}`;
  });
  
  const selected = showListDialog(
    'MemoryWell Set Favorite',
    'Select an archive to toggle favorite status:',
    archivesWithStatus
  );
  
  if (!selected) {
    process.exit(0);
  }
  
  const archiveName = selected.replace(/^[⭐ ]+/, '').trim();
  
  const cmd = `node "${path.join(__dirname, '..', 'setfavorite.js')}" "${archiveName}"`;
  const output = execSync(cmd, { cwd, encoding: 'utf8' });
  
  showDialog('MemoryWell Set Favorite', output, 'info');
  
} catch (error) {
  showDialog('MemoryWell Set Favorite', 'Error: ' + error.message, 'error');
  process.exit(1);
}
