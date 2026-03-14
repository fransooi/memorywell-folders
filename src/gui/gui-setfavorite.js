#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { showDialog, showListDialog } = require(path.join(__dirname, 'gui-helpers.js'));

const cwd = process.cwd();

try {
  const archivesDir = path.join(cwd, '00-folders');
  
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
  
  const favoriteDir = path.join(cwd, '05-favorite');
  const archivesWithStatus = archives.map(archive => {
    const isFav = fs.existsSync(path.join(favoriteDir, archive));
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
