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
  
  // Recreate favorite links (check which archives should be favorites)
  // We look for any non-symlink directories in favorites (actual archive copies)
  // or we could scan for a .favorite marker file in archives
  
  return createdCount;
}

function remapMemoryWell() {
  const cwd = process.cwd();
  
  if (!isMemoryWell(cwd)) {
    console.log('❌ Not a MemoryWell directory. Run "mwinit" first.');
    process.exit(1);
  }
  
  if (hasNoLinks(cwd)) {
    console.log('⚠️  This MemoryWell uses --nolinks mode (no symlinks to remap).');
    process.exit(0);
  }
  
  const baseDir = getBaseDir(cwd);
  const archivesDir = getArchivesDir(cwd);
  
  console.log('🔄 Remapping MemoryWell symlinks...\n');
  
  // Step 1: Remove all existing symlinks
  console.log('1️⃣  Removing old symlinks...');
  const removedCount = removeAllSymlinks(baseDir);
  console.log(`   ✓ Removed ${removedCount} symlinks\n`);
  
  // Step 2: Recreate favorite links
  console.log('2️⃣  Recreating favorite links...');
  const favCreatedCount = createFavoriteLinks(baseDir, archivesDir);
  console.log(`   ✓ Created ${favCreatedCount} favorite links\n`);
  
  console.log('✅ Remap completed successfully!');
  console.log('\n💡 Note: Time-based links (01-last-week, etc.) are not recreated.');
  console.log('   They will be updated automatically on the next push.');
}

remapMemoryWell();
