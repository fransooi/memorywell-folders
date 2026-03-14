#!/usr/bin/env node

const path = require('path');
const { execSync } = require('child_process');
const { showDialog, getTextInput, showYesNoDialog } = require(path.join(__dirname, 'gui-helpers.js'));

const cwd = process.cwd();

try {
  // Get source path
  const sourcePath = getTextInput(
    'MemoryWell Import',
    'Enter path to directory to import:',
    ''
  );
  
  if (!sourcePath) {
    process.exit(0);
  }
  
  // Ask for mode
  const useReplace = showYesNoDialog(
    'MemoryWell Import',
    'Delete existing files before import?\n\n(--replace mode)'
  );
  
  const useAutoPush = showYesNoDialog(
    'MemoryWell Import',
    'Automatically push after import?\n\n(--autopush mode)'
  );
  
  const useRecursive = showYesNoDialog(
    'MemoryWell Import',
    'Import subdirectories recursively?\n\n(Default: yes)'
  );
  
  // Build command
  let cmd = `node "${path.join(__dirname, '..', 'import.js')}" "${sourcePath}"`;
  
  if (useReplace) {
    cmd += ' --replace';
  } else if (useAutoPush) {
    cmd += ' --autopush';
  } else {
    cmd += ' --merge';
  }
  
  if (!useRecursive) {
    cmd += ' --norecursive';
  }
  
  // Execute import
  const output = execSync(cmd, { cwd, encoding: 'utf8' });
  
  showDialog('MemoryWell Import', 'Import completed successfully!\n\n' + output, 'info');
  
} catch (error) {
  showDialog('MemoryWell Import', 'Error: ' + error.message, 'error');
  process.exit(1);
}
