#!/usr/bin/env node

const path = require('path');
const fs = require('fs');
const { execSync } = require('child_process');
const { showDialog, showListDialog, showYesNoDialog } = require(path.join(__dirname, 'gui-helpers.js'));

function getBaseDir(cwd) {
  if (fs.existsSync(path.join(cwd, '00-memorywell-folders'))) {
    return cwd;
  }
  if (fs.existsSync(path.join(cwd, '00-memorywell'))) {
    return path.join(cwd, '00-memorywell');
  }
  return cwd;
}

function getArchivesDir(cwd) {
  if (fs.existsSync(path.join(cwd, '00-memorywell-folders'))) {
    return path.join(cwd, '00-memorywell-folders');
  }
  return path.join(getBaseDir(cwd), '05-folders');
}

const cwd = process.cwd();

try {
  const archivesDir = getArchivesDir(cwd);
  
  if (!fs.existsSync(archivesDir)) {
    showDialog('MemoryWell Pop', 'No archives found!', 'warning');
    process.exit(0);
  }
  
  const archives = fs.readdirSync(archivesDir)
    .filter(name => /^\d{2}-\d{8}-\d{6}/.test(name))
    .sort();
  
  if (archives.length === 0) {
    showDialog('MemoryWell Pop', 'No archives to pop!', 'warning');
    process.exit(0);
  }
  
  // Ask which mode
  const useSpecific = showYesNoDialog(
    'MemoryWell Pop',
    'Pop a specific archive?\n\n(No = pop last archive)'
  );
  
  let cmd = `node "${path.join(__dirname, '..', 'pop.js')}"`;
  
  if (useSpecific) {
    // Show archive list
    const archivesWithDates = archives.map(archive => {
      const date = archive.split('-')[1];
      const type = archive.includes('-IMAGE') ? 'IMAGE' : 'DELTA';
      return `${archive} [${type}]`;
    });
    
    const selected = showListDialog(
      'MemoryWell Pop',
      'Select archive to pop:',
      archivesWithDates
    );
    
    if (!selected) {
      process.exit(0);
    }
    
    const archiveName = selected.split(' [')[0];
    const isDelta = selected.includes('[DELTA]');
    
    // If DELTA, ask about --onedelta
    let useOneDelta = false;
    if (isDelta) {
      useOneDelta = showYesNoDialog(
        'MemoryWell Pop',
        'Consolidate multiple deltas into one?\n\n(--onedelta mode)'
      );
    }
    
    cmd += ` "${archiveName}"`;
    
    if (useOneDelta) {
      cmd += ' --onedelta';
    }
  }
  
  // Execute pop
  const output = execSync(cmd, { cwd, encoding: 'utf8' });
  
  showDialog('MemoryWell Pop', 'Pop completed successfully!\n\n' + output, 'info');
  
} catch (error) {
  showDialog('MemoryWell Pop', 'Error: ' + error.message, 'error');
  process.exit(1);
}
