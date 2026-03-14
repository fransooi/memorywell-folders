#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

function isMemoryWell(dir) {
  // Check for --nolinks mode (single directory)
  if (fs.existsSync(path.join(dir, '00-memorywell'))) {
    return fs.existsSync(path.join(dir, '00-memorywell', 'folders'));
  }
  // Check for full mode (with time-based links)
  const requiredDirs = ['01-last-week', '02-last-month', '03-last-year', '04-favorites', '05-folders'];
  return requiredDirs.every(d => fs.existsSync(path.join(dir, d)));
}

function getArchivesDir(cwd) {
  if (fs.existsSync(path.join(cwd, '00-memorywell'))) {
    return path.join(cwd, '00-memorywell', 'folders');
  }
  return path.join(cwd, '05-folders');
}

function getFavoritesDir(cwd) {
  if (fs.existsSync(path.join(cwd, '00-memorywell'))) {
    return null; // No favorites in simple mode
  }
  return path.join(cwd, '04-favorites');
}

function getTimeDirs(cwd) {
  if (fs.existsSync(path.join(cwd, '00-memorywell'))) {
    return []; // No time-based links in simple mode
  }
  return [
    { path: path.join(cwd, '01-last-week'), days: 7 },
    { path: path.join(cwd, '02-last-month'), days: 30 },
    { path: path.join(cwd, '03-last-year'), days: 365 }
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
  const protectedDirs = ['00-memorywell', '01-last-week', '02-last-month', '03-last-year', '04-favorites', '05-folders'];
  
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

function removeSymlinks(cwd) {
  const timeDirs = getTimeDirs(cwd);
  
  timeDirs.forEach(timeDir => {
    if (!fs.existsSync(timeDir.path)) return;
    
    const items = fs.readdirSync(timeDir.path);
    
    items.forEach(item => {
      const itemPath = path.join(timeDir.path, item);
      const stat = fs.lstatSync(itemPath);
      
      if (stat.isSymbolicLink()) {
        fs.unlinkSync(itemPath);
      }
    });
  });
}

function createTimeBasedLinks(cwd, archiveName, archiveDate) {
  const timeDirs = getTimeDirs(cwd);
  if (timeDirs.length === 0) return; // No time-based links in simple mode
  
  const now = new Date();
  const archiveTime = archiveDate.getTime();
  const nowTime = now.getTime();
  const diff = nowTime - archiveTime;
  
  const archivesDir = getArchivesDir(cwd);
  const archivePath = path.join(archivesDir, archiveName);
  
  const oneDayMs = 24 * 60 * 60 * 1000;
  
  timeDirs.forEach(timeDir => {
    const maxDiff = timeDir.days * oneDayMs;
    if (diff <= maxDiff) {
      const linkPath = path.join(timeDir.path, archiveName);
      fs.symlinkSync(archivePath, linkPath);
    }
  });
}

function updateAllLinks(cwd) {
  const timeDirs = getTimeDirs(cwd);
  if (timeDirs.length === 0) return; // No time-based links in simple mode
  
  const archivesDir = getArchivesDir(cwd);
  
  if (!fs.existsSync(archivesDir)) return;
  
  const archives = fs.readdirSync(archivesDir);
  
  archives.forEach(archiveName => {
    const match = archiveName.match(/^\d{2}-(\d{8})-(\d{6})/);
    if (!match) return;
    
    const dateStr = match[1];
    const year = parseInt(dateStr.substring(0, 4));
    const month = parseInt(dateStr.substring(4, 6)) - 1;
    const day = parseInt(dateStr.substring(6, 8));
    
    const archiveDate = new Date(year, month, day);
    createTimeBasedLinks(cwd, archiveName, archiveDate);
  });
}

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
  const archiveType = (useDelta && firstImage) ? 'DELTA' : 'IMAGE';
  
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
      
      console.log(`\n📦 Created DELTA archive: ${archiveName}`);
      console.log(`   Base image: ${firstImage}`);
      console.log(`   Files changed: ${movedCount}`);
      console.log(`   Files identical (skipped): ${skippedCount}`);
    }
    
    removeSymlinks(cwd);
    updateAllLinks(cwd);
    
    console.log('🔗 Updated time-based links');
    
    const favoritesDir = getFavoritesDir(cwd);
    
    if (favoritesDir) {
      if (setFavorite) {
        const favoriteLinkPath = path.join(favoritesDir, archiveName);
        fs.symlinkSync(archivePath, favoriteLinkPath);
        console.log('⭐ Marked as favorite');
      }
      
      const lastLinkPath = path.join(favoritesDir, '00-last');
      if (fs.existsSync(lastLinkPath)) {
        fs.unlinkSync(lastLinkPath);
      }
      fs.symlinkSync(archivePath, lastLinkPath);
    }
    
    console.log('\n✅ Push completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during push:', error.message);
    process.exit(1);
  }
}

pushMemoryWell();
