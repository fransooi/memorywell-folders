#!/usr/bin/env node

const path = require('path');
const { execSync } = require('child_process');
const { showDialog, getTextInput, showYesNoDialog } = require(path.join(__dirname, 'gui-helpers.js'));

const cwd = process.cwd();

try {
  let description = getTextInput(
    'MemoryWell Push',
    'Enter archive description (optional):',
    ''
  );
  
  if (description === null) {
    process.exit(0);
  }
  
  const useDelta = showYesNoDialog(
    'MemoryWell Push',
    'Use delta mode (save only changed files)?'
  );
  
  const setFavorite = showYesNoDialog(
    'MemoryWell Push',
    'Mark this archive as favorite?'
  );
  
  let cmd = `node "${path.join(__dirname, '..', 'push.js')}"`;
  if (useDelta) cmd += ' --usedelta';
  if (setFavorite) cmd += ' --setfavorite';
  if (description) cmd += ` "${description}"`;
  
  const output = execSync(cmd, { cwd, encoding: 'utf8' });
  
  showDialog('MemoryWell Push', 'Archive created successfully!\n\n' + output, 'info');
  
} catch (error) {
  showDialog('MemoryWell Push', 'Error: ' + error.message, 'error');
  process.exit(1);
}
