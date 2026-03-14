#!/usr/bin/env node

const path = require('path');
const { execSync } = require('child_process');
const { showDialog, getTextInput } = require(path.join(__dirname, 'gui-helpers.js'));

const cwd = process.cwd();

try {
  const searchTerm = getTextInput(
    'MemoryWell Find',
    'Enter search term (archive name):',
    ''
  );
  
  if (!searchTerm) {
    process.exit(0);
  }
  
  let cmd = `node "${path.join(__dirname, '..', 'find.js')}" --name "${searchTerm}"`;
  
  const output = execSync(cmd, { cwd, encoding: 'utf8' });
  
  showDialog('MemoryWell Find', output || 'No results found', 'info');
  
} catch (error) {
  showDialog('MemoryWell Find', 'Error: ' + error.message, 'error');
  process.exit(1);
}
