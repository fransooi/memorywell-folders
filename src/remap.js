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
  
  if (!silent) {
    console.log('✅ Remap completed successfully!');
    console.log('\n💡 Note: Time-based links (01-last-week, etc.) are not recreated.');
    console.log('   They will be updated automatically on the next push.');
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
  const success = remapMemoryWell(cwd);
  if (!success) process.exit(1);
}
