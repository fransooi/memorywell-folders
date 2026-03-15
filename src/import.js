#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const ignore = require('ignore');
const { execSync } = require('child_process');

// Create ignore instance from .gitignore file
function createIgnoreFilter(gitignorePath) {
  if (!fs.existsSync(gitignorePath)) {
    return null;
  }
  
  // Check if path is a directory
  const stat = fs.statSync(gitignorePath);
  if (stat.isDirectory()) {
    console.log(`❌ Error: --gitignore expects a file path, not a directory: ${gitignorePath}`);
    console.log(`💡 Usage: mwimport <source> --gitignore [path/to/.gitignore]`);
    process.exit(1);
  }
  
  const content = fs.readFileSync(gitignorePath, 'utf8');
  const ig = ignore().add(content);
  return ig;
}

// Check if a path should be ignored based on gitignore rules
function shouldIgnore(relativePath, isDirectory, ignoreFilter) {
  if (!ignoreFilter) return false;
  
  // For directories, check both with and without trailing slash
  if (isDirectory) {
    return ignoreFilter.ignores(relativePath) || ignoreFilter.ignores(relativePath + '/');
  }
  
  return ignoreFilter.ignores(relativePath);
}

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

function copyItem(srcPath, destPath, recursive, ignoreFilter = null, sourceRoot = null, mergeMode = false, fileCounter = { copied: 0, skipped: 0 }, rootFolderName = '') {
  const stat = fs.lstatSync(srcPath);
  
  // Check gitignore filtering
  if (ignoreFilter && sourceRoot) {
    const relativePath = path.relative(sourceRoot, srcPath);
    if (shouldIgnore(relativePath, stat.isDirectory(), ignoreFilter)) {
      return; // Skip this item
    }
  }
  
  if (stat.isDirectory()) {
    if (!recursive) {
      console.log(`  ⊘ Skipped directory (--norecursive): ${path.basename(srcPath)}`);
      return;
    }
    
    fs.mkdirSync(destPath, { recursive: true });
    const items = fs.readdirSync(srcPath);
    
    items.forEach(item => {
      copyItem(path.join(srcPath, item), path.join(destPath, item), recursive, ignoreFilter, sourceRoot, mergeMode, fileCounter, rootFolderName);
    });
  } else if (stat.isFile()) {
    const fileName = path.basename(srcPath);
    const folderDisplay = rootFolderName.length > 15 ? rootFolderName.substring(0, 12) + '...' : rootFolderName.padEnd(15, ' ');
    const fileDisplay = fileName.length > 20 ? fileName.substring(0, 17) + '...' : fileName.padEnd(20, ' ');
    
    // In merge mode, skip if file exists and is identical
    if (mergeMode && fs.existsSync(destPath)) {
      const destStat = fs.statSync(destPath);
      if (stat.size === destStat.size && Math.abs(stat.mtimeMs - destStat.mtimeMs) < 1000) {
        fileCounter.skipped++;
        process.stdout.write(`\r  ⊘ Skipping.. ${folderDisplay} ${fileCounter.skipped} ${fileDisplay}`);
        return; // Skip identical file
      }
    }
    
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    fs.utimesSync(destPath, stat.atime, stat.mtime);
    
    // Show progress animation
    fileCounter.copied++;
    process.stdout.write(`\r  📋 Copying.. ${folderDisplay} ${fileCounter.copied} ${fileDisplay}`);
  }
}

function showHelp() {
  console.log(`
MemoryWell Import - Import external directories into MemoryWell

Usage: mwimport <path> [options]

Arguments:
  path            Path to directory to import (required)

Options:
  --merge         Merge with existing files (default)
  --replace       Delete existing files first
  --autopush      Push current files, import, then push imported files
  --norecursive   Copy only files, skip subdirectories
  --gitignore [path]  Use .gitignore to filter files (optional custom path)
  --help          Show this help message

Examples:
  mwimport /path/to/project                    # Import and merge
  mwimport /path/to/project --replace          # Delete current, then import
  mwimport /path/to/project --autopush         # Push current, import, push imported
  mwimport /path/to/project --norecursive      # Import files only (no subdirs)
  mwimport /path/to/project --gitignore        # Filter with .gitignore
  mwimport /path/to/project --gitignore /path/.gitignore  # Custom .gitignore

Gitignore cascade:
  1. Custom path (if specified)
  2. .gitignore at project root
  3. .gitignore in installation directory
`);
  process.exit(0);
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
  
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    showHelp();
  }
  
  if (!isMemoryWell(cwd)) {
    console.log('❌ Not a MemoryWell directory. Run "mwinit" first.');
    process.exit(1);
  }
  
  const sourcePath = args.find(arg => !arg.startsWith('--'));
  let mode = args.find(arg => arg === '--merge' || arg === '--replace' || arg === '--autopush');
  const noRecursive = args.includes('--norecursive');
  const recursive = !noRecursive;
  const useGitignore = args.includes('--gitignore');
  
  // Parse gitignore if requested
  let ignoreFilter = null;
  let gitignorePath = null;
  
  if (useGitignore) {
    // Cascade logic for finding .gitignore:
    // 1. Check for custom path parameter
    const gitignoreIndex = args.indexOf('--gitignore');
    if (gitignoreIndex !== -1 && gitignoreIndex + 1 < args.length && !args[gitignoreIndex + 1].startsWith('--')) {
      gitignorePath = path.resolve(cwd, args[gitignoreIndex + 1]);
      if (!fs.existsSync(gitignorePath)) {
        console.log(`⚠️  Specified .gitignore not found: ${gitignorePath}`);
        gitignorePath = null;
      }
    }
    
    // 2. Check root directory
    if (!gitignorePath) {
      const rootGitignore = path.join(cwd, '.gitignore');
      if (fs.existsSync(rootGitignore)) {
        gitignorePath = rootGitignore;
      }
    }
    
    // 3. Check installation directory
    if (!gitignorePath) {
      const installGitignore = path.join(__dirname, '.gitignore');
      if (fs.existsSync(installGitignore)) {
        gitignorePath = installGitignore;
      }
    }
    
    if (gitignorePath) {
      ignoreFilter = createIgnoreFilter(gitignorePath);
      console.log(`📋 Using .gitignore: ${gitignorePath}\n`);
    } else {
      console.log(`⚠️  No .gitignore found (checked: parameter, root, installation)`);
      console.log('   Continuing without gitignore filtering...\n');
    }
  }
  
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
  
  // Check if root has files and no mode specified
  const rootFiles = getRootFiles(cwd);
  if (!mode && rootFiles.length > 0) {
    console.log(`\n⚠️  Root directory contains ${rootFiles.length} file(s)/folder(s)`);
    console.log('\nChoose import mode:');
    console.log('  1. Merge - Keep existing files and add new ones');
    console.log('  2. Replace - Delete existing files first');
    console.log('  3. Auto-push - Import and push automatically');
    console.log('  4. Cancel');
    
    const readline = require('readline');
    const rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout
    });
    
    rl.question('\nEnter choice (1-4): ', (answer) => {
      rl.close();
      
      const choice = answer.trim();
      
      if (choice === '1') {
        mode = '--merge';
      } else if (choice === '2') {
        mode = '--replace';
      } else if (choice === '3') {
        mode = '--autopush';
      } else if (choice === '4') {
        console.log('\n❌ Import cancelled');
        process.exit(0);
      } else {
        console.log('\n❌ Invalid choice');
        process.exit(1);
      }
      
      continueImport(cwd, resolvedSource, mode, recursive, rootFiles, ignoreFilter);
    });
    
    return;
  }
  
  continueImport(cwd, resolvedSource, mode, recursive, rootFiles, ignoreFilter);
}

function continueImport(cwd, resolvedSource, mode, recursive, rootFiles, ignoreFilter) {
  console.log(`\n📥 Importing from: ${resolvedSource}`);
  console.log(`   Mode: ${mode || '--merge (default)'}`);
  console.log(`   Recursive: ${recursive ? 'yes' : 'no'}\n`);
  
  try {
    // Auto-push BEFORE import if requested
    if (mode === '--autopush' && rootFiles.length > 0) {
      console.log('📦 Pushing current files first...\n');
      
      const pushScript = path.join(__dirname, 'push.js');
      const description = `Before importing ${path.basename(resolvedSource)}`;
      
      try {
        execSync(`node "${pushScript}" "${description}"`, {
          cwd,
          stdio: 'inherit'
        });
        console.log('');
      } catch (error) {
        console.error('❌ Auto-push failed:', error.message);
        process.exit(1);
      }
    }
    
    // Handle replace mode
    if (mode === '--replace') {
      if (rootFiles.length > 0) {
        deleteRootFiles(cwd, rootFiles);
      }
    }
    
    // Copy contents of source directory to root
    const sourceItems = fs.readdirSync(resolvedSource);
    const fileCounter = { copied: 0, skipped: 0 };
    const isMergeMode = (mode === '--merge' || !mode);
    
    sourceItems.forEach(item => {
      if (item.startsWith('.')) return;
      
      const srcPath = path.join(resolvedSource, item);
      const destPath = path.join(cwd, item);
      
      copyItem(srcPath, destPath, recursive, ignoreFilter, resolvedSource, isMergeMode, fileCounter, item);
    });
    
    // Clear progress line and show completion
    if (fileCounter.copied > 0 || fileCounter.skipped > 0) {
      process.stdout.write('\r' + ' '.repeat(120) + '\r'); // Clear line
    }
    console.log(`\n✅ Import completed!`);
    console.log(`   Files copied: ${fileCounter.copied}`);
    if (fileCounter.skipped > 0) {
      console.log(`   Files skipped: ${fileCounter.skipped}`);
    }
    
    // Auto-push AFTER import if requested
    if (mode === '--autopush') {
      console.log('\n📦 Pushing imported files...\n');
      
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
