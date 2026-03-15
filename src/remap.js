#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

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

function getBaseDir(dir) {
  if (fs.existsSync(path.join(dir, '00-memorywell-folders'))) {
    return dir;
  }
  if (fs.existsSync(path.join(dir, '00-memorywell'))) {
    return path.join(dir, '00-memorywell');
  }
  return dir;
}

function getArchivesDir(dir) {
  if (fs.existsSync(path.join(dir, '00-memorywell-folders'))) {
    return path.join(dir, '00-memorywell-folders');
  }
  return path.join(getBaseDir(dir), '05-folders');
}

function hasNoLinks(dir) {
  return fs.existsSync(path.join(dir, '00-memorywell-folders'));
}

function removeAllSymlinks(baseDir) {
  const dirs = ['01-last-week', '02-last-month', '03-last-year', '04-favorites'];
  let removedCount = 0;
  
  dirs.forEach(dirName => {
    const dirPath = path.join(baseDir, dirName);
    if (!fs.existsSync(dirPath)) return;
    
    const items = fs.readdirSync(dirPath);
    items.forEach(item => {
      const itemPath = path.join(dirPath, item);
      try {
        const stats = fs.lstatSync(itemPath);
        if (stats.isSymbolicLink()) {
          fs.unlinkSync(itemPath);
          removedCount++;
        }
      } catch (err) {
        // Ignore errors
      }
    });
  });
  
  return removedCount;
}

function createFavoriteLinks(baseDir, archivesDir) {
  const favoritesDir = path.join(baseDir, '04-favorites');
  if (!fs.existsSync(favoritesDir)) return 0;
  
  let createdCount = 0;
  
  // Get all archives
  const archives = fs.readdirSync(archivesDir)
    .filter(name => /^\d{2}-\d{8}-\d{6}/.test(name))
    .sort();
  
  if (archives.length === 0) return 0;
  
  // Create 00-last link to latest archive
  const latestArchive = archives[archives.length - 1];
  const latestArchivePath = path.join(archivesDir, latestArchive);
  const lastLinkPath = path.join(favoritesDir, '00-last');
  
  try {
    if (fs.existsSync(lastLinkPath)) {
      fs.unlinkSync(lastLinkPath);
    }
    fs.symlinkSync(path.relative(favoritesDir, latestArchivePath), lastLinkPath);
    createdCount++;
  } catch (err) {
    console.error(`  ⚠️  Could not create 00-last link: ${err.message}`);
  }
  
  // Recreate favorite links for archives marked with .favorite file
  archives.forEach(archive => {
    const archivePath = path.join(archivesDir, archive);
    const markerPath = path.join(archivePath, '.favorite');
    
    if (fs.existsSync(markerPath)) {
      const favLinkPath = path.join(favoritesDir, archive);
      try {
        if (fs.existsSync(favLinkPath)) {
          fs.unlinkSync(favLinkPath);
        }
        fs.symlinkSync(path.relative(favoritesDir, archivePath), favLinkPath);
        createdCount++;
      } catch (err) {
        // Ignore errors
      }
    }
  });
  
  return createdCount;
}

function createTimeBasedLinks(baseDir, archivesDir) {
  const timeDirs = [
    { path: path.join(baseDir, '01-last-week'), days: 7 },
    { path: path.join(baseDir, '02-last-month'), days: 30 },
    { path: path.join(baseDir, '03-last-year'), days: 365 }
  ];
  
  let createdCount = 0;
  const now = Date.now();
  
  // Get all archives
  const archives = fs.readdirSync(archivesDir)
    .filter(name => /^\d{2}-\d{8}-\d{6}/.test(name))
    .sort();
  
  if (archives.length === 0) return 0;
  
  timeDirs.forEach(timeDir => {
    if (!fs.existsSync(timeDir.path)) return;
    
    const cutoffTime = now - (timeDir.days * 24 * 60 * 60 * 1000);
    
    archives.forEach(archive => {
      // Parse archive date: NN-YYYYMMDD-HHMMSS-...
      const parts = archive.split('-');
      const dateStr = parts[1]; // YYYYMMDD
      const timeStr = parts[2]; // HHMMSS
      
      const year = parseInt(dateStr.substring(0, 4));
      const month = parseInt(dateStr.substring(4, 6)) - 1;
      const day = parseInt(dateStr.substring(6, 8));
      const hours = parseInt(timeStr.substring(0, 2));
      const minutes = parseInt(timeStr.substring(2, 4));
      const seconds = parseInt(timeStr.substring(4, 6));
      
      const archiveDate = new Date(year, month, day, hours, minutes, seconds);
      const archiveTime = archiveDate.getTime();
      
      if (archiveTime >= cutoffTime) {
        const archivePath = path.join(archivesDir, archive);
        const linkPath = path.join(timeDir.path, archive);
        
        try {
          if (fs.existsSync(linkPath)) {
            fs.unlinkSync(linkPath);
          }
          fs.symlinkSync(path.relative(timeDir.path, archivePath), linkPath);
          createdCount++;
        } catch (err) {
          // Ignore errors
        }
      }
    });
  });
  
  return createdCount;
}

function remapMemoryWell(cwd, options = {}) {
  const silent = options.silent || false;
  
  if (!isMemoryWell(cwd)) {
    if (!silent) console.log('❌ Not a MemoryWell directory. Run "mwinit" first.');
    return false;
  }
  
  if (hasNoLinks(cwd)) {
    if (!silent) console.log('⚠️  This MemoryWell uses --nolinks mode (no symlinks to remap).');
    return false;
  }
  
  const baseDir = getBaseDir(cwd);
  const archivesDir = getArchivesDir(cwd);
  
  if (!silent) console.log('🔄 Remapping MemoryWell symlinks...\n');
  
  // Step 1: Remove all existing symlinks
  if (!silent) console.log('1️⃣  Removing old symlinks...');
  const removedCount = removeAllSymlinks(baseDir);
  if (!silent) console.log(`   ✓ Removed ${removedCount} symlinks\n`);
  
  // Step 2: Recreate favorite links
  if (!silent) console.log('2️⃣  Recreating favorite links...');
  const favCreatedCount = createFavoriteLinks(baseDir, archivesDir);
  if (!silent) console.log(`   ✓ Created ${favCreatedCount} favorite links\n`);
  
  // Step 3: Recreate time-based links
  if (!silent) console.log('3️⃣  Recreating time-based links...');
  const timeCreatedCount = createTimeBasedLinks(baseDir, archivesDir);
  if (!silent) console.log(`   ✓ Created ${timeCreatedCount} time-based links\n`);
  
  if (!silent) {
    console.log('✅ Remap completed successfully!');
  }
  
  return true;
}

// Export functions for use by other scripts
module.exports = {
  isMemoryWell,
  getBaseDir,
  getArchivesDir,
  hasNoLinks,
  removeAllSymlinks,
  createFavoriteLinks,
  createTimeBasedLinks,
  remapMemoryWell
};

// CLI execution
function showHelp() {
  console.log(`
MemoryWell Remap - Regenerate all symlinks

Usage: mwremap

Options:
  --help                  Show this help message

When to use:
  - After moving/renaming your MemoryWell directory
  - If symlinks appear broken
  - To regenerate the 00-last link in favorites

What it does:
  - Removes all existing symlinks
  - Recreates favorite links (including 00-last)
  - Recreates time-based links (last-week, last-month, last-year)

Note: Only works in modes 1 & 4 (modes with links).
      Not needed in --nolinks mode.

Example:
  cd /new/path/my-project
  mwremap
`);
  process.exit(0);
}

if (require.main === module) {
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    showHelp();
  }
  
  const cwd = process.cwd();
  
  if (!isMemoryWell(cwd)) {
    console.log('❌ Not a MemoryWell directory. Run "mwinit" first.');
    process.exit(1);
  }
  
  const success = remapMemoryWell(cwd);
  if (!success) process.exit(1);
}
