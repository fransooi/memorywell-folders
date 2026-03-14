#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function isMemoryWell(dir) {
  const requiredDirs = ['01-last-week', '02-last-month', '03-last-year', '04-favorites', '05-folders'];
  
  if (requiredDirs.every(d => fs.existsSync(path.join(dir, d)))) {
    return true;
  }
  
  if (fs.existsSync(path.join(dir, '00-memorywell-folders'))) {
    return true;
  }
  
  if (fs.existsSync(path.join(dir, '00-memorywell'))) {
    return requiredDirs.every(d => fs.existsSync(path.join(dir, '00-memorywell', d)));
  }
  
  return false;
}

function getRootFiles(cwd) {
  const protectedDirs = ['00-memorywell', '00-memorywell-folders', '01-last-week', '02-last-month', '03-last-year', '04-favorites', '05-folders'];
  
  return fs.readdirSync(cwd).filter(item => {
    if (protectedDirs.includes(item)) return false;
    if (item.startsWith('.')) return false;
    
    const itemPath = path.join(cwd, item);
    const stat = fs.statSync(itemPath);
    return stat.isFile() || stat.isDirectory();
  });
}

function copyItem(srcPath, destPath, recursive) {
  const stat = fs.lstatSync(srcPath);
  
  if (stat.isDirectory()) {
    if (!recursive) {
      console.log(`  ⊘ Skipped directory (--norecursive): ${path.basename(srcPath)}`);
      return;
    }
    
    fs.mkdirSync(destPath, { recursive: true });
    const items = fs.readdirSync(srcPath);
    
    items.forEach(item => {
      copyItem(path.join(srcPath, item), path.join(destPath, item), recursive);
    });
  } else if (stat.isFile()) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    fs.utimesSync(destPath, stat.atime, stat.mtime);
  }
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

function importToMemoryWell() {
  const cwd = process.cwd();
  
  if (!isMemoryWell(cwd)) {
    console.log('❌ Not a MemoryWell directory. Run "mwinit" first.');
    process.exit(1);
  }
  
  const args = process.argv.slice(2);
  const sourcePath = args.find(arg => !arg.startsWith('--'));
  const mode = args.find(arg => arg === '--merge' || arg === '--replace' || arg === '--autopush');
  const noRecursive = args.includes('--norecursive');
  const recursive = !noRecursive;
  
  if (!sourcePath) {
    console.log('❌ Missing source path');
    console.log('\nUsage: mwimport <path> [--merge|--replace|--autopush] [--norecursive]');
    console.log('\nModes:');
    console.log('  --merge      Merge with existing files (default)');
    console.log('  --replace    Delete existing files first');
    console.log('  --autopush   Import and push automatically');
    console.log('\nOptions:');
    console.log('  --norecursive  Copy only files, skip subdirectories');
    process.exit(1);
  }
  
  const resolvedSource = path.resolve(sourcePath);
  
  if (!fs.existsSync(resolvedSource)) {
    console.log(`❌ Source path not found: ${resolvedSource}`);
    process.exit(1);
  }
  
  const stat = fs.statSync(resolvedSource);
  if (!stat.isDirectory()) {
    console.log(`❌ Source must be a directory: ${resolvedSource}`);
    process.exit(1);
  }
  
  console.log(`\n📥 Importing from: ${resolvedSource}`);
  console.log(`   Mode: ${mode || '--merge (default)'}`);
  console.log(`   Recursive: ${recursive ? 'yes' : 'no'}\n`);
  
  try {
    // Handle replace mode
    if (mode === '--replace') {
      const rootFiles = getRootFiles(cwd);
      if (rootFiles.length > 0) {
        deleteRootFiles(cwd, rootFiles);
      }
    }
    
    // Copy contents of source directory to root
    const sourceItems = fs.readdirSync(resolvedSource);
    let copiedCount = 0;
    let skippedCount = 0;
    
    sourceItems.forEach(item => {
      if (item.startsWith('.')) return;
      
      const srcPath = path.join(resolvedSource, item);
      const destPath = path.join(cwd, item);
      
      if (mode === '--merge' && fs.existsSync(destPath)) {
        console.log(`  ⊕ Skipped (exists): ${item}`);
        skippedCount++;
      } else {
        copyItem(srcPath, destPath, recursive);
        console.log(`  ✓ Copied: ${item}`);
        copiedCount++;
      }
    });
    
    console.log(`\n✅ Import completed!`);
    console.log(`   Files/folders copied: ${copiedCount}`);
    if (skippedCount > 0) {
      console.log(`   Files/folders skipped: ${skippedCount}`);
    }
    
    // Auto-push if requested
    if (mode === '--autopush') {
      console.log('\n📦 Auto-pushing imported files...\n');
      
      const pushScript = path.join(__dirname, 'push.js');
      const description = `Imported from ${path.basename(resolvedSource)}`;
      
      try {
        execSync(`node "${pushScript}" "${description}"`, {
          cwd,
          stdio: 'inherit'
        });
      } catch (error) {
        console.error('❌ Auto-push failed:', error.message);
        process.exit(1);
      }
    }
    
  } catch (error) {
    console.error('❌ Error during import:', error.message);
    process.exit(1);
  }
}

importToMemoryWell();
