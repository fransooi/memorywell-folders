#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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

function formatDate(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  const seconds = String(date.getSeconds()).padStart(2, '0');
  
  return `${year}${month}${day}-${hours}${minutes}${seconds}`;
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

function copyItem(srcPath, destPath) {
  const stat = fs.lstatSync(srcPath);
  
  if (stat.isDirectory()) {
    fs.mkdirSync(destPath, { recursive: true });
    const items = fs.readdirSync(srcPath);
    
    items.forEach(item => {
      copyItem(path.join(srcPath, item), path.join(destPath, item));
    });
  } else if (stat.isFile()) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    fs.utimesSync(destPath, stat.atime, stat.mtime);
  }
}

// Symlinks management removed - no longer needed with new structure

function pushMemoryWell() {
  const cwd = process.cwd();
  
  if (!isMemoryWell(cwd)) {
    console.log('❌ Not a MemoryWell directory. Run "init" first.');
    process.exit(1);
  }
  
  const rootFiles = getRootFiles(cwd);
  
  if (rootFiles.length === 0) {
    console.log('⚠️  No files to archive at root level');
    process.exit(0);
  }
  
  const args = process.argv.slice(2);
  const setFavorite = args.includes('--setfavorite');
  const useDelta = args.includes('--usedelta');
  const description = args.filter(arg => !arg.startsWith('--')).join(' ') || '';
  
  const archivesDir = getArchivesDir(cwd);
  const archiveNum = getNextArchiveNumber(archivesDir);
  const now = new Date();
  const dateStr = formatDate(now);
  
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
      rootFiles.forEach(item => {
        const srcPath = path.join(cwd, item);
        const destPath = path.join(archivePath, item);
        
        fs.renameSync(srcPath, destPath);
        console.log(`  ✓ Moved: ${item}`);
      });
      
      console.log(`\n📦 Created IMAGE archive: ${archiveName}`);
      console.log(`   Files archived: ${rootFiles.length}`);
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
              fs.renameSync(fileSrcPath, fileDestPath);
              movedCount++;
            } else {
              skippedCount++;
            }
          });
          
          if (fs.existsSync(srcPath) && fs.readdirSync(srcPath).length === 0) {
            fs.rmdirSync(srcPath);
          }
        } else if (stat.isFile()) {
          if (!filesAreIdentical(currentIndex[item], imageIndex[item])) {
            const destPath = path.join(archivePath, item);
            fs.renameSync(srcPath, destPath);
            console.log(`  ✓ Moved (changed): ${item}`);
            movedCount++;
          } else {
            fs.unlinkSync(srcPath);
            console.log(`  ⊘ Skipped (identical): ${item}`);
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
      
      console.log(`\n📦 Created ${archiveType} archive: ${archiveName}`);
      console.log(`   Base image: ${firstImage}`);
      console.log(`   Files changed: ${movedCount}`);
      console.log(`   Files identical (skipped): ${skippedCount}`);
    }
    
    // Favorites management (only if not in --nolinks mode)
    if (!hasLinks(cwd)) {
      console.log('\n✅ Push completed successfully!');
    } else {
      const favoritesDir = getFavoritesDir(cwd);
      
      if (setFavorite && fs.existsSync(favoritesDir)) {
        const favoriteLinkPath = path.join(favoritesDir, archiveName);
        fs.symlinkSync(path.relative(favoritesDir, archivePath), favoriteLinkPath);
        console.log('⭐ Marked as favorite');
      }
      
      if (fs.existsSync(favoritesDir)) {
        const lastLinkPath = path.join(favoritesDir, '00-last');
        if (fs.existsSync(lastLinkPath)) {
          fs.unlinkSync(lastLinkPath);
        }
        fs.symlinkSync(path.relative(favoritesDir, archivePath), lastLinkPath);
      }
      
      console.log('\n✅ Push completed successfully!');
    }
    
  } catch (error) {
    console.error('❌ Error during push:', error.message);
    process.exit(1);
  }
}

pushMemoryWell();
