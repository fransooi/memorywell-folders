#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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

function getBaseDir(cwd) {
  if (fs.existsSync(path.join(cwd, '00-memorywell'))) {
    return path.join(cwd, '00-memorywell');
  }
  return cwd;
}

function getArchivesDir(cwd) {
  return path.join(getBaseDir(cwd), '05-folders');
}

function listArchives(archivesDir) {
  if (!fs.existsSync(archivesDir)) {
    return [];
  }
  
  return fs.readdirSync(archivesDir)
    .filter(name => /^\d{2}-\d{8}-\d{6}/.test(name))
    .sort()
    .reverse();
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

function isArchiveImage(archiveName) {
  return archiveName.includes('-IMAGE');
}

function isArchiveDelta(archiveName) {
  return archiveName.includes('-DELTA');
}

function copyItem(srcPath, destPath) {
  const stat = fs.lstatSync(srcPath);
  
  if (stat.isDirectory()) {
    fs.mkdirSync(destPath, { recursive: true });
    const items = fs.readdirSync(srcPath);
    
    items.forEach(item => {
      if (item.startsWith('.memorywell')) return;
      copyItem(path.join(srcPath, item), path.join(destPath, item));
    });
  } else if (stat.isFile()) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    fs.utimesSync(destPath, stat.atime, stat.mtime);
  }
}

function getArchiveChain(archivesDir, targetArchive) {
  const chain = [];
  let currentArchive = targetArchive;
  
  while (currentArchive) {
    const archivePath = path.join(archivesDir, currentArchive);
    const metaPath = path.join(archivePath, '.memorywell-meta.json');
    
    chain.unshift(currentArchive);
    
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      if (meta.type === 'DELTA' && meta.baseImage) {
        currentArchive = meta.baseImage;
      } else {
        break;
      }
    } else {
      break;
    }
  }
  
  return chain;
}

function reconstructFromDelta(cwd, archivesDir, archiveName) {
  const chain = getArchiveChain(archivesDir, archiveName);
  
  if (chain.length === 0) {
    throw new Error('Could not build archive chain');
  }
  
  const baseImage = chain[0];
  
  if (!isArchiveImage(baseImage)) {
    throw new Error(`Base archive is not an IMAGE: ${baseImage}`);
  }
  
  console.log(`\n🔗 Reconstructing from chain:`);
  chain.forEach((archive, idx) => {
    const type = isArchiveImage(archive) ? 'IMAGE' : 'DELTA';
    console.log(`   ${idx + 1}. ${archive} [${type}]`);
  });
  console.log('');
  
  const baseImagePath = path.join(archivesDir, baseImage);
  const items = fs.readdirSync(baseImagePath);
  
  items.forEach(item => {
    if (item.startsWith('.memorywell')) return;
    
    const srcPath = path.join(baseImagePath, item);
    const destPath = path.join(cwd, item);
    
    copyItem(srcPath, destPath);
  });
  
  console.log(`  ✓ Copied base IMAGE: ${baseImage}`);
  
  for (let i = 1; i < chain.length; i++) {
    const deltaArchive = chain[i];
    const deltaPath = path.join(archivesDir, deltaArchive);
    const deltaItems = fs.readdirSync(deltaPath);
    
    deltaItems.forEach(item => {
      if (item.startsWith('.memorywell')) return;
      
      const srcPath = path.join(deltaPath, item);
      const destPath = path.join(cwd, item);
      
      copyItem(srcPath, destPath);
    });
    
    console.log(`  ✓ Applied DELTA: ${deltaArchive}`);
  }
}

function createAutoArchive(cwd, description) {
  const { execSync } = require('child_process');
  const pushScript = path.join(__dirname, 'push.js');
  
  console.log('\n📦 Creating automatic archive of current files...');
  
  try {
    execSync(`node "${pushScript}" "${description}"`, { 
      cwd, 
      stdio: 'inherit' 
    });
    console.log('✓ Auto-archive created\n');
    return true;
  } catch (error) {
    console.error('❌ Failed to create auto-archive:', error.message);
    return false;
  }
}

function askPopMode() {
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  return new Promise((resolve) => {
    console.log('\n⚠️  Root directory contains files. Choose an option:');
    console.log('  1. DELETE - Remove all current files (⚠️  DESTRUCTIVE)');
    console.log('  2. MERGE - Keep current files + restore archive files');
    console.log('  3. ARCHIVE - Create archive of current files first, then restore');
    console.log('');
    
    rl.question('Enter choice (1/2/3) or q to cancel: ', (answer) => {
      rl.close();
      resolve(answer.trim().toLowerCase());
    });
  });
}

function deleteRootFiles(cwd, rootFiles) {
  console.log('\n🗑️  Deleting current files...');
  rootFiles.forEach(file => {
    const filePath = path.join(cwd, file);
    const stat = fs.statSync(filePath);
    
    if (stat.isDirectory()) {
      fs.rmSync(filePath, { recursive: true, force: true });
    } else {
      fs.unlinkSync(filePath);
    }
    console.log(`  ✓ Deleted: ${file}`);
  });
}

async function extractMemoryWell() {
  const cwd = process.cwd();
  
  if (!isMemoryWell(cwd)) {
    console.log('❌ Not a MemoryWell directory. Run "init" first.');
    process.exit(1);
  }
  
  const args = process.argv.slice(2);
  const archiveName = args.find(arg => !arg.startsWith('--'));
  const mode = args.find(arg => arg.startsWith('--mode='))?.split('=')[1];
  
  if (!archiveName) {
    const archivesDir = getArchivesDir(cwd);
    const archives = listArchives(archivesDir);
    
    if (archives.length === 0) {
      console.log('⚠️  No archives found');
      process.exit(0);
    }
    
    console.log('📦 Available archives (most recent first):');
    archives.forEach((archive, idx) => {
      console.log(`   ${idx + 1}. ${archive}`);
    });
    console.log('\nUsage: extract <archive-name>');
    console.log('Example: extract 00-20260314-164523-first-try');
    process.exit(0);
  }
  
  const archivesDir = getArchivesDir(cwd);
  const archivePath = path.join(archivesDir, archiveName);
  
  if (!fs.existsSync(archivePath)) {
    console.log(`❌ Archive not found: ${archiveName}`);
    process.exit(1);
  }
  
  const rootFiles = getRootFiles(cwd);
  
  if (rootFiles.length > 0) {
    let chosenMode = mode;
    
    if (!chosenMode) {
      const choice = await askPopMode();
      
      if (choice === 'q' || choice === '') {
        console.log('❌ Operation cancelled');
        process.exit(0);
      }
      
      if (choice === '1') chosenMode = 'delete';
      else if (choice === '2') chosenMode = 'merge';
      else if (choice === '3') chosenMode = 'archive';
      else {
        console.log('❌ Invalid choice');
        process.exit(1);
      }
    }
    
    console.log('\nFiles currently at root:');
    rootFiles.forEach(file => console.log(`   - ${file}`));
    
    if (chosenMode === 'delete') {
      deleteRootFiles(cwd, rootFiles);
    } else if (chosenMode === 'archive') {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
      const success = createAutoArchive(cwd, `auto-backup-before-pop-${timestamp}`);
      if (!success) {
        console.log('❌ Cannot proceed without successful archive');
        process.exit(1);
      }
    } else if (chosenMode === 'merge') {
      console.log('\n📝 MERGE mode: Current files will be kept, archive files will be added/overwritten');
    }
  }
  
  try {
    const archivesDir = getArchivesDir(cwd);
    
    if (isArchiveDelta(archiveName)) {
      reconstructFromDelta(cwd, archivesDir, archiveName);
      
      console.log(`\n📂 Restored DELTA archive: ${archiveName}`);
      console.log('\n✅ Extract completed successfully!');
    } else {
      const archiveItems = fs.readdirSync(archivePath);
      let restoredCount = 0;
      
      archiveItems.forEach(item => {
        if (item.startsWith('.memorywell')) return;
        
        const srcPath = path.join(archivePath, item);
        const destPath = path.join(cwd, item);
        
        if (mode === 'merge' && fs.existsSync(destPath)) {
          console.log(`  ⊕ Skipped (exists): ${item}`);
        } else {
          fs.renameSync(srcPath, destPath);
          console.log(`  ✓ Restored: ${item}`);
          restoredCount++;
        }
      });
      
      if (mode !== 'merge') {
        fs.rmdirSync(archivePath);
      }
      
      console.log(`\n📂 Restored IMAGE archive: ${archiveName}`);
      console.log(`   Files restored: ${restoredCount}`);
      console.log('\n✅ Extract completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error during extract:', error.message);
    process.exit(1);
  }
}

(async () => {
  await extractMemoryWell();
})();
