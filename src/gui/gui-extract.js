#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { showDialog, showListDialog, showYesNoDialog } = require(path.join(__dirname, 'gui-helpers.js'));

function getBaseDir(cwd) {
  if (fs.existsSync(path.join(cwd, '00-memorywell'))) {
    return path.join(cwd, '00-memorywell');
  }
  return cwd;
}

function getRootFiles(cwd) {
  const protectedDirs = ['00-memorywell', '01-last-week', '02-last-month', '03-last-year', '04-favorites', '05-folders'];
  
  return fs.readdirSync(cwd).filter(item => {
    if (protectedDirs.includes(item)) return false;
    if (item.startsWith('.')) return false;
    
    const itemPath = path.join(cwd, item);
    const stat = fs.statSync(itemPath);
    return stat.isFile() || stat.isDirectory();
  });
}

function askExtractModeGUI() {
  const choice1 = showYesNoDialog(
    'MemoryWell Extract - Files Exist',
    'Root directory contains files.\n\nDELETE all current files? (DESTRUCTIVE)'
  );
  
  if (choice1) return 'delete';
  
  const choice2 = showYesNoDialog(
    'MemoryWell Extract - Files Exist',
    'MERGE mode?\n\nKeep current files + add archive files?'
  );
  
  if (choice2) return 'merge';
  
  const choice3 = showYesNoDialog(
    'MemoryWell Extract - Files Exist',
    'ARCHIVE mode?\n\nCreate backup of current files first, then restore?'
  );
  
  if (choice3) return 'archive';
  
  return null;
}

const cwd = process.cwd();

try {
  const archivesDir = path.join(getBaseDir(cwd), '05-folders');
  
  if (!fs.existsSync(archivesDir)) {
    showDialog('MemoryWell Extract', 'No archives found!', 'warning');
    process.exit(0);
  }
  
  const archives = fs.readdirSync(archivesDir)
    .filter(name => /^\d{2}-\d{8}-\d{6}/.test(name))
    .sort()
    .reverse();
  
  if (archives.length === 0) {
    showDialog('MemoryWell Extract', 'No archives found!', 'warning');
    process.exit(0);
  }
  
  const archivesWithDates = archives.map(archive => {
    const date = archive.split('-')[1];
    return `${archive} - ${date}`;
  });
  
  const selected = showListDialog(
    'MemoryWell Extract',
    'Select an archive to restore:',
    archivesWithDates
  );
  
  if (!selected) {
    process.exit(0);
  }
  
  const archiveName = selected.split(' - ')[0];
  
  // Ask if user wants to extract to a different location
  const useCustomDest = showYesNoDialog(
    'MemoryWell Extract',
    'Extract to a different location?'
  );
  
  let destPath = null;
  if (useCustomDest) {
    destPath = getTextInput(
      'MemoryWell Extract',
      'Enter destination path:',
      ''
    );
    if (!destPath) {
      process.exit(0);
    }
  }
  
  const rootFiles = getRootFiles(cwd);
  let mode = '';
  
  if (rootFiles.length > 0) {
    const chosenMode = askExtractModeGUI();
    
    if (!chosenMode) {
      showDialog('MemoryWell Extract', 'Operation cancelled', 'warning');
      process.exit(0);
    }
    
    mode = ` --mode=${chosenMode}`;
  }
  
  let cmd = `node "${path.join(__dirname, '..', 'extract.js')}" "${archiveName}"`;
  
  if (destPath) {
    cmd += ` --dest="${destPath}"`;
  }
  if (mode) {
    cmd += mode;
  }
  
  const output = execSync(cmd, { cwd, encoding: 'utf8' });
  
  showDialog('MemoryWell Extract', 'Archive restored successfully!\n\n' + output, 'info');
  
} catch (error) {
  showDialog('MemoryWell Extract', 'Error: ' + error.message, 'error');
  process.exit(1);
}
