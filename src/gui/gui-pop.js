#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { showDialog, showListDialog } = require(path.join(__dirname, 'gui-helpers.js'));

const cwd = process.cwd();

try {
  const archivesDir = path.join(cwd, '00-folders');
  
  if (!fs.existsSync(archivesDir)) {
    showDialog('MemoryWell Pop', 'No archives found!', 'warning');
    process.exit(0);
  }
  
  const archives = fs.readdirSync(archivesDir)
    .filter(name => /^\d{2}-\d{8}-\d{6}/.test(name))
    .sort()
    .reverse();
  
  if (archives.length === 0) {
    showDialog('MemoryWell Pop', 'No archives found!', 'warning');
    process.exit(0);
  }
  
  const selected = showListDialog(
    'MemoryWell Pop',
    'Select an archive to restore:',
    archives
  );
  
  if (!selected) {
    process.exit(0);
  }
  
  const cmd = `node "${path.join(__dirname, '..', 'pop.js')}" "${selected}"`;
  const output = execSync(cmd, { cwd, encoding: 'utf8' });
  
  showDialog('MemoryWell Pop', 'Archive restored successfully!\n\n' + output, 'info');
  
} catch (error) {
  showDialog('MemoryWell Pop', 'Error: ' + error.message, 'error');
  process.exit(1);
}
