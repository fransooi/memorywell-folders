#!/usr/bin/env node

const path = require('path');
const { execSync } = require('child_process');
const { showDialog } = require(path.join(__dirname, 'gui-helpers.js'));

const cwd = process.cwd();

try {
  const cmd = `node "${path.join(__dirname, '..', 'remap.js')}"`;
  const output = execSync(cmd, { cwd, encoding: 'utf8' });
  
  showDialog('MemoryWell Remap', 'Symlinks remapped successfully!\n\n' + output, 'info');
  
} catch (error) {
  showDialog('MemoryWell Remap', 'Error: ' + error.message, 'error');
  process.exit(1);
}
