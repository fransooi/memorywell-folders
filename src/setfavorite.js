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

function getFavoritesDir(dir) {
  return path.join(getBaseDir(dir), '04-favorites');
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

function isFavorite(cwd, archiveName) {
  const favoriteDir = path.join(cwd, '05-favorite');
  const favoriteLinkPath = path.join(favoriteDir, archiveName);
  
  return fs.existsSync(favoriteLinkPath);
}

function setFavoriteArchive() {
  const cwd = process.cwd();
  
  if (!isMemoryWell(cwd)) {
    console.log('❌ Not a MemoryWell directory. Run "init" first.');
    process.exit(1);
  }
  
  if (hasNoLinks(cwd)) {
    console.log('⚠️  Favorites are not available in --nolinks mode.');
    process.exit(0);
  }
  
  const favoritesDir = getFavoritesDir(cwd);
  
  const archiveName = process.argv[2];
  
  if (!archiveName) {
    const archivesDir = getArchivesDir(cwd);
    const archives = listArchives(archivesDir);
    
    if (archives.length === 0) {
      console.log('⚠️  No archives found');
      process.exit(0);
    }
    
    console.log('📦 Available archives (most recent first):');
    archives.forEach((archive, idx) => {
      const fav = isFavorite(cwd, archive) ? ' ⭐' : '';
      console.log(`   ${idx + 1}. ${archive}${fav}`);
    });
    console.log('\nUsage: setfavorite <archive-name>');
    console.log('Example: setfavorite 00-20260314-164523-first-try');
    process.exit(0);
  }
  
  const archivePath = path.join(cwd, '00-folders', archiveName);
  
  if (!fs.existsSync(archivePath)) {
    console.log(`❌ Archive not found: ${archiveName}`);
    process.exit(1);
  }
  
  const favoriteDir = path.join(cwd, '05-favorite');
  const favoriteLinkPath = path.join(favoriteDir, archiveName);
  
  try {
    if (fs.existsSync(favoriteLinkPath)) {
      fs.unlinkSync(favoriteLinkPath);
      console.log(`⭐ Removed from favorites: ${archiveName}`);
    } else {
      fs.symlinkSync(archivePath, favoriteLinkPath);
      console.log(`⭐ Added to favorites: ${archiveName}`);
    }
    
    console.log('\n✅ Favorite status updated!');
    
  } catch (error) {
    console.error('❌ Error updating favorite:', error.message);
    process.exit(1);
  }
}

setFavoriteArchive();
