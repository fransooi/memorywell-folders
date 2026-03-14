#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { remapMemoryWell } = require('./remap.js');

// Parse .gitignore file and return array of patterns
function parseGitignore(gitignorePath) {
  if (!fs.existsSync(gitignorePath)) {
    return [];
  }
  
  const content = fs.readFileSync(gitignorePath, 'utf8');
  return content
    .split('\n')
    .map(line => line.trim())
    .filter(line => line && !line.startsWith('#'));
}

// Check if a file path matches any gitignore pattern
function matchesGitignore(filePath, patterns, rootDir) {
  const relativePath = path.relative(rootDir, filePath);
  
  for (const pattern of patterns) {
    // Handle negation patterns
    if (pattern.startsWith('!')) {
      const negPattern = pattern.slice(1);
      if (matchPattern(relativePath, negPattern)) {
        return false; // Explicitly included
      }
      continue;
    }
    
    if (matchPattern(relativePath, pattern)) {
      return true;
    }
  }
  
  return false;
}

// Simple pattern matching for gitignore rules (git-compatible)
function matchPattern(filePath, pattern) {
  // Normalize path separators
  filePath = filePath.replace(/\\/g, '/');
  
  // Remove leading slash from pattern
  const isRooted = pattern.startsWith('/');
  if (isRooted) {
    pattern = pattern.slice(1);
  }
  
  // Directory pattern (ends with /)
  if (pattern.endsWith('/')) {
    const dirPattern = pattern.slice(0, -1);
    
    // Check if filePath is the directory itself or inside it
    if (filePath === dirPattern) return true;
    if (filePath.startsWith(dirPattern + '/')) return true;
    
    // If not rooted, check any path component
    if (!isRooted) {
      const parts = filePath.split('/');
      for (let i = 0; i < parts.length; i++) {
        if (parts[i] === dirPattern) return true;
      }
    }
    
    return false;
  }
  
  // Wildcard patterns
  if (pattern.includes('*')) {
    const regexPattern = pattern
      .replace(/\./g, '\\.')
      .replace(/\*\*/g, '§§DOUBLESTAR§§')
      .replace(/\*/g, '[^/]*')
      .replace(/§§DOUBLESTAR§§/g, '.*');
    const regex = new RegExp(`^${regexPattern}$`);
    
    // Check full path
    if (regex.test(filePath)) return true;
    
    // If not rooted, check from any directory level
    if (!isRooted) {
      const parts = filePath.split('/');
      for (let i = 0; i < parts.length; i++) {
        const subPath = parts.slice(i).join('/');
        if (regex.test(subPath)) return true;
      }
    }
    
    return false;
  }
  
  // Exact match
  if (filePath === pattern) return true;
  if (filePath.startsWith(pattern + '/')) return true;
  
  // If not rooted, check basename and any path component
  if (!isRooted) {
    if (path.basename(filePath) === pattern) return true;
    const parts = filePath.split('/');
    for (let i = 0; i < parts.length; i++) {
      if (parts[i] === pattern) return true;
      const subPath = parts.slice(i).join('/');
      if (subPath === pattern || subPath.startsWith(pattern + '/')) return true;
    }
  }
  
  return false;
}

function isMemoryWell(dir) {
  const requiredDirs = ['01-last-week', '02-last-month', '03-last-year', '04-favorites', '05-folders'];
  
  // Mode 1: structure at root
  if (requiredDirs.every(d => fs.existsSync(path.join(dir, d)))) {
    return true;
  }
  
  // Mode 2 & 3: --nolinks (00-memorywell-folders)
  if (fs.existsSync(path.join(dir, '00-memorywell-folders'))) {
    return true;
  }
  
  // Mode 4: --hidden (00-memorywell with structure)
  if (fs.existsSync(path.join(dir, '00-memorywell'))) {
    return requiredDirs.every(d => fs.existsSync(path.join(dir, '00-memorywell', d)));
  }
  
  return false;
}

function getBaseDir(dir) {
  // Mode 2 & 3: --nolinks
  if (fs.existsSync(path.join(dir, '00-memorywell-folders'))) {
    return dir;
  }
  // Mode 4: --hidden
  if (fs.existsSync(path.join(dir, '00-memorywell'))) {
    return path.join(dir, '00-memorywell');
  }
  // Mode 1: default
  return dir;
}

function getArchivesDir(dir) {
  const baseDir = getBaseDir(dir);
  // Mode 2 & 3: archives directly in 00-memorywell-folders
  if (fs.existsSync(path.join(dir, '00-memorywell-folders'))) {
    return path.join(dir, '00-memorywell-folders');
  }
  // Mode 1 & 4: archives in 05-folders
  return path.join(baseDir, '05-folders');
}

function getFavoritesDir(dir) {
  return path.join(getBaseDir(dir), '04-favorites');
}

function hasLinks(dir) {
  // Mode 2 & 3: no links
  return !fs.existsSync(path.join(dir, '00-memorywell-folders'));
}

function getTimeDirs(cwd) {
  const baseDir = getBaseDir(cwd);
  const isSimpleMode = baseDir !== cwd;
  
  if (isSimpleMode) {
    return []; // No visible time-based links in simple mode
  }
  
  return [
    { path: path.join(baseDir, '01-last-week'), days: 7 },
    { path: path.join(baseDir, '02-last-month'), days: 30 },
    { path: path.join(baseDir, '03-last-year'), days: 365 }
  ];
}

function getNextArchiveNumber(archivesDir) {
  if (!fs.existsSync(archivesDir)) {
    return 0;
  }
  
  const archives = fs.readdirSync(archivesDir)
    .filter(name => /^\d{2}-\d{8}-\d{6}/.test(name));
  
  if (archives.length === 0) return 0;
  
  const numbers = archives.map(name => parseInt(name.split('-')[0]));
  return Math.max(...numbers) + 1;
}

function findInsertionPoint(archivesDir, targetDateStr) {
  if (!fs.existsSync(archivesDir)) {
    return 0;
  }
  
  const archives = fs.readdirSync(archivesDir)
    .filter(name => /^\d{2}-\d{8}-\d{6}/.test(name))
    .sort();
  
  if (archives.length === 0) return 0;
  
  // Find where to insert based on date
  for (let i = 0; i < archives.length; i++) {
    const archiveDateStr = archives[i].split('-')[1] + '-' + archives[i].split('-')[2];
    if (targetDateStr < archiveDateStr) {
      return i;
    }
  }
  
  // Insert at end
  return archives.length;
}

function renumberArchives(archivesDir, fromNum) {
  const archives = fs.readdirSync(archivesDir)
    .filter(name => /^\d{2}-\d{8}-\d{6}/.test(name))
    .map(name => ({
      name,
      num: parseInt(name.split('-')[0])
    }))
    .filter(a => a.num >= fromNum)
    .sort((a, b) => b.num - a.num); // Sort descending to avoid conflicts
  
  console.log(`\n🔢 Renumbering ${archives.length} archive(s) to make room...`);
  
  archives.forEach(archive => {
    const oldPath = path.join(archivesDir, archive.name);
    const newNum = String(archive.num + 1).padStart(2, '0');
    const newName = archive.name.replace(/^\d{2}/, newNum);
    const newPath = path.join(archivesDir, newName);
    
    fs.renameSync(oldPath, newPath);
    console.log(`  ✓ ${archive.name} → ${newName}`);
    
    // Update delta metadata if exists
    const metaPath = path.join(newPath, '.memorywell-meta.json');
    if (fs.existsSync(metaPath)) {
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      if (meta.baseImage) {
        // Update base image reference if it was renumbered
        const baseNum = parseInt(meta.baseImage.split('-')[0]);
        if (baseNum >= fromNum) {
          const newBaseNum = String(baseNum + 1).padStart(2, '0');
          meta.baseImage = meta.baseImage.replace(/^\d{2}/, newBaseNum);
          fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
        }
      }
    }
  });
  
  console.log('');
}

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
}

function getRootFiles(cwd, gitignorePatterns = null) {
  const protectedDirs = ['00-memorywell', '00-memorywell-folders', '01-last-week', '02-last-month', '03-last-year', '04-favorites', '05-folders'];
  
  return fs.readdirSync(cwd).filter(item => {
    if (protectedDirs.includes(item)) return false;
    if (item.startsWith('.')) return false;
    
    const itemPath = path.join(cwd, item);
    
    // Apply gitignore filtering if patterns provided
    if (gitignorePatterns && matchesGitignore(itemPath, gitignorePatterns, cwd)) {
      return false;
    }
    
    const stat = fs.statSync(itemPath);
    return stat.isFile() || stat.isDirectory();
  });
}

function findFirstImage(archivesDir) {
  if (!fs.existsSync(archivesDir)) {
    return null;
  }
  
  const archives = fs.readdirSync(archivesDir)
    .filter(name => /^\d{2}-\d{8}-\d{6}/.test(name) && name.includes('-IMAGE'))
    .sort();
  
  return archives.length > 0 ? archives[0] : null;
}

function findLastImage(archivesDir) {
  if (!fs.existsSync(archivesDir)) {
    return null;
  }
  
  const archives = fs.readdirSync(archivesDir)
    .filter(name => /^\d{2}-\d{8}-\d{6}/.test(name))
    .sort()
    .reverse();
  
  for (const archive of archives) {
    if (archive.includes('-IMAGE-')) {
      return archive;
    }
  }
  
  return null;
}

function countArchivesSinceLastImage(archivesDir) {
  if (!fs.existsSync(archivesDir)) {
    return 0;
  }
  
  const archives = fs.readdirSync(archivesDir)
    .filter(name => /^\d{2}-\d{8}-\d{6}/.test(name))
    .sort()
    .reverse();
  
  let count = 0;
  for (const archive of archives) {
    if (archive.includes('-IMAGE-')) {
      break;
    }
    count++;
  }
  
  return count;
}

function isArchiveImage(archiveName) {
  return archiveName.includes('-IMAGE');
}

function isArchiveDelta(archiveName) {
  return archiveName.includes('-DELTA');
}

function buildFileIndex(dirPath) {
  const index = {};
  
  function scanDir(currentPath, relativePath = '') {
    const items = fs.readdirSync(currentPath);
    
    items.forEach(item => {
      if (item.startsWith('.')) return;
      
      const itemPath = path.join(currentPath, item);
      const relPath = relativePath ? path.join(relativePath, item) : item;
      const stat = fs.lstatSync(itemPath);
      
      if (stat.isDirectory()) {
        scanDir(itemPath, relPath);
      } else if (stat.isFile()) {
        index[relPath] = {
          size: stat.size,
          mtime: stat.mtimeMs
        };
      }
    });
  }
  
  scanDir(dirPath);
  return index;
}

function filesAreIdentical(file1Stats, file2Stats) {
  if (!file1Stats || !file2Stats) return false;
  return file1Stats.size === file2Stats.size && 
         Math.abs(file1Stats.mtime - file2Stats.mtime) < 1000;
}

function copyItem(srcPath, destPath, fileCounter = { copied: 0 }, rootFolderName = '', moveMode = false) {
  const stat = fs.lstatSync(srcPath);
  
  if (stat.isDirectory()) {
    fs.mkdirSync(destPath, { recursive: true });
    const items = fs.readdirSync(srcPath);
    
    items.forEach(item => {
      copyItem(path.join(srcPath, item), path.join(destPath, item), fileCounter, rootFolderName, moveMode);
    });
  } else if (stat.isFile()) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    
    if (moveMode) {
      fs.renameSync(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
      fs.utimesSync(destPath, stat.atime, stat.mtime);
    }
    
    // Show progress animation
    fileCounter.copied++;
    const fileName = path.basename(srcPath);
    const displayName = fileName.length > 40 ? fileName.substring(0, 37) + '...' : fileName.padEnd(40, ' ');
    const action = moveMode ? 'Moving..' : 'Copying..';
    process.stdout.write(`\r  📋 ${action} Folder: ${rootFolderName} - ${fileCounter.copied} - ${displayName}`);
  }
}

// Symlinks management removed - no longer needed with new structure

function showHelp() {
  console.log(`
MemoryWell Push - Archive files from root directory

Usage: mwpush [options] [description]

Options:
  --usedelta      Save only changed files (incremental backup)
  --setfavorite   Mark as favorite (only in modes with links)
  --gitignore [path]  Use .gitignore to filter files (optional custom path)
  --atdate=YYYYMMDD   Insert archive at specific date (IMAGE only)
  --move          Move files to archive (default: copy)
  --help          Show this help message

Arguments:
  description     Optional description for the archive

Examples:
  mwpush "initial version"              # Full IMAGE archive (copy mode)
  mwpush --usedelta "quick save"        # Incremental DELTA (copy mode)
  mwpush --setfavorite "milestone v1.0" # Mark as favorite
  mwpush --gitignore "clean version"    # Filter with .gitignore
  mwpush --atdate=20260301 "old backup" # Insert at March 1st, 2026
  mwpush --move "final version"         # Move files (clear root)

Gitignore cascade:
  1. Custom path (if specified)
  2. .gitignore at project root
  3. .gitignore in installation directory

Note: --atdate only works with IMAGE archives (not --usedelta).
      Existing archives will be automatically renumbered.
`);
  process.exit(0);
}

function pushMemoryWell() {
  const cwd = process.cwd();
  
  if (!isMemoryWell(cwd)) {
    console.log('❌ Not a MemoryWell directory. Run "init" first.');
    process.exit(1);
  }
  
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    showHelp();
  }
  
  const setFavorite = args.includes('--setfavorite');
  const useDelta = args.includes('--usedelta');
  const useGitignore = args.includes('--gitignore');
  const moveMode = args.includes('--move');
  const atDateArg = args.find(arg => arg.startsWith('--atdate='));
  const atDate = atDateArg ? atDateArg.split('=')[1] : null;
  
  // Validate --atdate format and restrictions
  if (atDate) {
    if (!/^\d{8}$/.test(atDate)) {
      console.log('❌ Invalid --atdate format. Use YYYYMMDD (e.g., 20260314)');
      process.exit(1);
    }
    if (useDelta) {
      console.log('❌ Cannot use --atdate with --usedelta.');
      console.log('💡 --atdate only works with IMAGE archives to avoid delta chain complexity.');
      process.exit(1);
    }
  }
  
  // Parse gitignore if requested
  let gitignorePatterns = null;
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
      gitignorePatterns = parseGitignore(gitignorePath);
      console.log(`📋 Using .gitignore: ${gitignorePath}`);
      console.log(`   ${gitignorePatterns.length} pattern(s) loaded\n`);
    } else {
      console.log(`⚠️  No .gitignore found (checked: parameter, root, installation)`);
      console.log('   Continuing without gitignore filtering...\n');
    }
  }
  
  // Filter out options and gitignore path parameter
  const gitignoreArgIndex = args.indexOf('--gitignore');
  const gitignoreArgPath = (gitignoreArgIndex !== -1 && gitignoreArgIndex + 1 < args.length && !args[gitignoreArgIndex + 1].startsWith('--')) 
    ? args[gitignoreArgIndex + 1] 
    : null;
  
  const description = args.filter(arg => {
    if (arg.startsWith('--')) return false;
    if (gitignoreArgPath && arg === gitignoreArgPath) return false;
    return true;
  }).join(' ') || '';
  
  const rootFiles = getRootFiles(cwd, gitignorePatterns);
  const allRootFiles = getRootFiles(cwd); // For cleanup
  const excludedFiles = allRootFiles.filter(f => !rootFiles.includes(f));
  
  if (rootFiles.length === 0) {
    console.log('⚠️  No files to archive at root level');
    if (excludedFiles.length > 0) {
      console.log(`   (${excludedFiles.length} file(s) excluded by .gitignore)`);
    }
    process.exit(0);
  }
  
  if (excludedFiles.length > 0) {
    console.log(`🚫 Excluded by .gitignore: ${excludedFiles.length} file(s)\n`);
  }
  
  const archivesDir = getArchivesDir(cwd);
  
  let archiveNum;
  let dateStr;
  let now;
  
  if (atDate) {
    // Parse custom date
    const year = parseInt(atDate.substring(0, 4));
    const month = parseInt(atDate.substring(4, 6)) - 1;
    const day = parseInt(atDate.substring(6, 8));
    now = new Date(year, month, day, 12, 0, 0); // Noon on specified date
    dateStr = formatDate(now);
    
    // Find insertion point and renumber archives
    archiveNum = findInsertionPoint(archivesDir, dateStr);
    if (archiveNum > 0) {
      renumberArchives(archivesDir, archiveNum);
    }
  } else {
    // Normal flow - append at end
    archiveNum = getNextArchiveNumber(archivesDir);
    now = new Date();
    dateStr = formatDate(now);
  }
  
  const firstImage = findFirstImage(archivesDir);
  
  // Validation: première archive DOIT être IMAGE
  if (useDelta && !firstImage) {
    console.log('❌ Cannot use --usedelta: no IMAGE archive exists yet.');
    console.log('💡 First archive must be a full IMAGE. Run without --usedelta.');
    process.exit(1);
  }
  
  // Suggestion: créer IMAGE si trop de deltas
  const deltaCount = countArchivesSinceLastImage(archivesDir);
  const DELTA_THRESHOLD = 5;
  
  if (useDelta && deltaCount >= DELTA_THRESHOLD) {
    console.log(`⚠️  Warning: ${deltaCount} DELTA archives since last IMAGE.`);
    console.log('💡 Consider creating a new IMAGE archive (without --usedelta) for better reliability.');
    console.log('');
  }
  
  const archiveType = useDelta ? 'DELTA' : 'IMAGE';
  
  let archiveName;
  if (description) {
    archiveName = `${String(archiveNum).padStart(2, '0')}-${dateStr}-${archiveType}-${description}`;
  } else {
    archiveName = `${String(archiveNum).padStart(2, '0')}-${dateStr}-${archiveType}`;
  }
  
  const archivePath = path.join(archivesDir, archiveName);
  
  try {
    fs.mkdirSync(archivePath, { recursive: true });
    
    if (archiveType === 'IMAGE') {
      const fileCounter = { copied: 0 };
      
      rootFiles.forEach(item => {
        const srcPath = path.join(cwd, item);
        const destPath = path.join(archivePath, item);
        
        copyItem(srcPath, destPath, fileCounter, item, moveMode);
      });
      
      // Clear progress line
      if (fileCounter.copied > 0) {
        process.stdout.write('\r' + ' '.repeat(120) + '\r');
      }
      
      console.log(`\n📦 Created IMAGE archive: ${archiveName}`);
      console.log(`   Files archived: ${fileCounter.copied}`);
      
      // Delete excluded files if gitignore was used
      if (useGitignore && excludedFiles.length > 0) {
        console.log(`\n🗑️  Cleaning up excluded files...`);
        excludedFiles.forEach(item => {
          const itemPath = path.join(cwd, item);
          const stat = fs.statSync(itemPath);
          
          if (stat.isDirectory()) {
            fs.rmSync(itemPath, { recursive: true, force: true });
          } else {
            fs.unlinkSync(itemPath);
          }
          console.log(`  ✓ Deleted: ${item}`);
        });
        console.log(`   Removed ${excludedFiles.length} excluded file(s)`);
      }
    } else {
      const imageArchivePath = path.join(archivesDir, firstImage);
      const imageIndex = buildFileIndex(imageArchivePath);
      const currentIndex = buildFileIndex(cwd);
      
      let movedCount = 0;
      let skippedCount = 0;
      
      rootFiles.forEach(item => {
        const srcPath = path.join(cwd, item);
        const stat = fs.lstatSync(srcPath);
        
        if (stat.isDirectory()) {
          const dirFiles = buildFileIndex(srcPath);
          
          Object.keys(dirFiles).forEach(relPath => {
            const fullRelPath = path.join(item, relPath);
            const fileSrcPath = path.join(cwd, fullRelPath);
            const fileDestPath = path.join(archivePath, fullRelPath);
            
            if (!filesAreIdentical(dirFiles[relPath], imageIndex[fullRelPath])) {
              fs.mkdirSync(path.dirname(fileDestPath), { recursive: true });
              
              if (moveMode) {
                fs.renameSync(fileSrcPath, fileDestPath);
              } else {
                fs.copyFileSync(fileSrcPath, fileDestPath);
                const srcStat = fs.statSync(fileSrcPath);
                fs.utimesSync(fileDestPath, srcStat.atime, srcStat.mtime);
              }
              
              movedCount++;
              const fileName = path.basename(fullRelPath);
              const displayName = fileName.length > 40 ? fileName.substring(0, 37) + '...' : fileName.padEnd(40, ' ');
              const action = moveMode ? 'Moving..' : 'Copying..';
              process.stdout.write(`\r  📋 ${action} Folder: ${item} - ${movedCount} - ${displayName}`);
            } else {
              skippedCount++;
            }
          });
        } else if (stat.isFile()) {
          if (!filesAreIdentical(currentIndex[item], imageIndex[item])) {
            const destPath = path.join(archivePath, item);
            
            if (moveMode) {
              fs.renameSync(srcPath, destPath);
            } else {
              fs.copyFileSync(srcPath, destPath);
              const srcStat = fs.statSync(srcPath);
              fs.utimesSync(destPath, srcStat.atime, srcStat.mtime);
            }
            
            movedCount++;
            const fileName = path.basename(item);
            const displayName = fileName.length > 40 ? fileName.substring(0, 37) + '...' : fileName.padEnd(40, ' ');
            const action = moveMode ? 'Moving..' : 'Copying..';
            process.stdout.write(`\r  📋 ${action} Folder: ${item} - ${movedCount} - ${displayName}`);
          } else {
            skippedCount++;
          }
        }
      });
      
      const metaPath = path.join(archivePath, '.memorywell-meta.json');
      fs.writeFileSync(metaPath, JSON.stringify({
        type: 'DELTA',
        baseImage: firstImage,
        created: now.toISOString()
      }, null, 2));
      
      // Clear progress line
      if (movedCount > 0) {
        process.stdout.write('\r' + ' '.repeat(120) + '\r');
      }
      
      // Clean up root - delete all remaining files/folders (only if --move)
      if (moveMode) {
        console.log(`\n🗑️  Cleaning up root directory...`);
        rootFiles.forEach(item => {
          const itemPath = path.join(cwd, item);
          if (fs.existsSync(itemPath)) {
            const stat = fs.statSync(itemPath);
            if (stat.isDirectory()) {
              fs.rmSync(itemPath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(itemPath);
            }
          }
        });
      }
      
      console.log(`\n📦 Created ${archiveType} archive: ${archiveName}`);
      console.log(`   Base image: ${firstImage}`);
      console.log(`   Files changed: ${movedCount}`);
      console.log(`   Files identical (skipped): ${skippedCount}`);
      
      // Delete excluded files if gitignore was used
      if (useGitignore && excludedFiles.length > 0) {
        console.log(`\n🗑️  Cleaning up excluded files...`);
        excludedFiles.forEach(item => {
          const itemPath = path.join(cwd, item);
          if (fs.existsSync(itemPath)) {
            const stat = fs.statSync(itemPath);
            
            if (stat.isDirectory()) {
              fs.rmSync(itemPath, { recursive: true, force: true });
            } else {
              fs.unlinkSync(itemPath);
            }
            console.log(`  ✓ Deleted: ${item}`);
          }
        });
        console.log(`   Removed ${excludedFiles.length} excluded file(s)`);
      }
    }
    
    // Mark as favorite if requested (create marker file)
    if (setFavorite) {
      const markerPath = path.join(archivePath, '.favorite');
      fs.writeFileSync(markerPath, '');
      console.log('⭐ Marked as favorite');
    }
    
    // Remap symlinks (respects --nolinks flag automatically)
    remapMemoryWell(cwd, { silent: true });
    
    console.log('\n✅ Push completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during push:', error.message);
    process.exit(1);
  }
}

pushMemoryWell();
