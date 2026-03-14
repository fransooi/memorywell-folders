#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function isMemoryWell(dir) {
  const requiredDirs = ['00-folders', '01-last-week', '02-last-month', '03-last-year', '04-before', '05-favorite'];
  return requiredDirs.every(d => fs.existsSync(path.join(dir, d)));
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
  const protectedDirs = ['00-folders', '01-last-week', '02-last-month', '03-last-year', '04-before', '05-favorite'];
  
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

function popMemoryWell() {
  const cwd = process.cwd();
  
  if (!isMemoryWell(cwd)) {
    console.log('❌ Not a MemoryWell directory. Run "init" first.');
    process.exit(1);
  }
  
  const archiveName = process.argv[2];
  
  if (!archiveName) {
    const archivesDir = path.join(cwd, '00-folders');
    const archives = listArchives(archivesDir);
    
    if (archives.length === 0) {
      console.log('⚠️  No archives found');
      process.exit(0);
    }
    
    console.log('📦 Available archives (most recent first):');
    archives.forEach((archive, idx) => {
      console.log(`   ${idx + 1}. ${archive}`);
    });
    console.log('\nUsage: pop <archive-name>');
    console.log('Example: pop 00-20260314-164523-first-try');
    process.exit(0);
  }
  
  const archivePath = path.join(cwd, '00-folders', archiveName);
  
  if (!fs.existsSync(archivePath)) {
    console.log(`❌ Archive not found: ${archiveName}`);
    process.exit(1);
  }
  
  const rootFiles = getRootFiles(cwd);
  
  if (rootFiles.length > 0) {
    console.log('❌ Root directory is not empty. Please push or remove files first.');
    console.log('Files at root:');
    rootFiles.forEach(file => console.log(`   - ${file}`));
    process.exit(1);
  }
  
  try {
    const archivesDir = path.join(cwd, '00-folders');
    
    if (isArchiveDelta(archiveName)) {
      reconstructFromDelta(cwd, archivesDir, archiveName);
      
      console.log(`\n📂 Restored DELTA archive: ${archiveName}`);
      console.log('\n✅ Pop completed successfully!');
    } else {
      const archiveItems = fs.readdirSync(archivePath);
      
      archiveItems.forEach(item => {
        if (item.startsWith('.memorywell')) return;
        
        const srcPath = path.join(archivePath, item);
        const destPath = path.join(cwd, item);
        
        fs.renameSync(srcPath, destPath);
        console.log(`  ✓ Restored: ${item}`);
      });
      
      fs.rmdirSync(archivePath);
      
      console.log(`\n📂 Restored IMAGE archive: ${archiveName}`);
      console.log(`   Files restored: ${archiveItems.length}`);
      console.log('\n✅ Pop completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error during pop:', error.message);
    process.exit(1);
  }
}

popMemoryWell();
