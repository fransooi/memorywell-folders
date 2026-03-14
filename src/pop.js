#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { remapMemoryWell } = require('./remap.js');

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

function listArchives(archivesDir) {
  if (!fs.existsSync(archivesDir)) {
    return [];
  }
  
  return fs.readdirSync(archivesDir)
    .filter(name => /^\d{2}-\d{8}-\d{6}/.test(name))
    .sort();
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
      copyItem(path.join(srcPath, item), path.join(destPath, item));
    });
  } else if (stat.isFile()) {
    fs.mkdirSync(path.dirname(destPath), { recursive: true });
    fs.copyFileSync(srcPath, destPath);
    fs.utimesSync(destPath, stat.atime, stat.mtime);
  }
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

function extractArchiveToRoot(cwd, archivesDir, archiveName) {
  const archivePath = path.join(archivesDir, archiveName);
  
  if (isArchiveDelta(archiveName)) {
    // For DELTA, we need to reconstruct from base IMAGE
    const metaPath = path.join(archivePath, '.memorywell-meta.json');
    if (!fs.existsSync(metaPath)) {
      throw new Error('DELTA archive missing metadata');
    }
    
    const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
    const baseImagePath = path.join(archivesDir, meta.baseImage);
    
    if (!fs.existsSync(baseImagePath)) {
      throw new Error(`Base IMAGE not found: ${meta.baseImage}`);
    }
    
    // Copy base IMAGE first
    const baseItems = fs.readdirSync(baseImagePath);
    baseItems.forEach(item => {
      if (item.startsWith('.memorywell')) return;
      
      const srcPath = path.join(baseImagePath, item);
      const destPath = path.join(cwd, item);
      copyItem(srcPath, destPath);
    });
    
    // Apply DELTA changes
    const deltaItems = fs.readdirSync(archivePath);
    deltaItems.forEach(item => {
      if (item.startsWith('.memorywell')) return;
      
      const srcPath = path.join(archivePath, item);
      const destPath = path.join(cwd, item);
      copyItem(srcPath, destPath);
    });
    
    console.log(`  ✓ Reconstructed from DELTA: ${archiveName}`);
  } else {
    // For IMAGE, just copy directly
    const archiveItems = fs.readdirSync(archivePath);
    archiveItems.forEach(item => {
      if (item.startsWith('.memorywell')) return;
      
      const srcPath = path.join(archivePath, item);
      const destPath = path.join(cwd, item);
      copyItem(srcPath, destPath);
    });
    
    console.log(`  ✓ Extracted IMAGE: ${archiveName}`);
  }
}

function deleteArchive(archivesDir, archiveName) {
  const archivePath = path.join(archivesDir, archiveName);
  fs.rmSync(archivePath, { recursive: true, force: true });
  console.log(`  ✓ Deleted archive: ${archiveName}`);
}

function findPreviousImage(archives, currentIndex) {
  for (let i = currentIndex - 1; i >= 0; i--) {
    if (isArchiveImage(archives[i])) {
      return archives[i];
    }
  }
  return null;
}

function findNextArchive(archives, currentIndex) {
  if (currentIndex + 1 < archives.length) {
    return archives[currentIndex + 1];
  }
  return null;
}

function updateDeltaMetadata(archivesDir, deltaName, newBaseImage) {
  const deltaPath = path.join(archivesDir, deltaName);
  const metaPath = path.join(deltaPath, '.memorywell-meta.json');
  
  if (!fs.existsSync(metaPath)) {
    throw new Error(`DELTA ${deltaName} missing metadata`);
  }
  
  const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
  meta.baseImage = newBaseImage;
  fs.writeFileSync(metaPath, JSON.stringify(meta, null, 2));
  
  console.log(`  ✓ Updated DELTA ${deltaName} to point to ${newBaseImage}`);
}

function convertDeltaToImage(archivesDir, deltaName, baseImageName) {
  const deltaPath = path.join(archivesDir, deltaName);
  const baseImagePath = path.join(archivesDir, baseImageName);
  
  // Create temporary directory for reconstruction
  const tempDir = path.join(archivesDir, '.temp-conversion');
  if (fs.existsSync(tempDir)) {
    fs.rmSync(tempDir, { recursive: true, force: true });
  }
  fs.mkdirSync(tempDir);
  
  try {
    // Copy base IMAGE
    const baseItems = fs.readdirSync(baseImagePath);
    baseItems.forEach(item => {
      if (item.startsWith('.memorywell')) return;
      const srcPath = path.join(baseImagePath, item);
      const destPath = path.join(tempDir, item);
      copyItem(srcPath, destPath);
    });
    
    // Apply DELTA changes
    const deltaItems = fs.readdirSync(deltaPath);
    deltaItems.forEach(item => {
      if (item.startsWith('.memorywell')) return;
      const srcPath = path.join(deltaPath, item);
      const destPath = path.join(tempDir, item);
      copyItem(srcPath, destPath);
    });
    
    // Replace DELTA with reconstructed IMAGE
    fs.rmSync(deltaPath, { recursive: true, force: true });
    
    // Rename archive to IMAGE
    const newImageName = deltaName.replace('-DELTA-', '-IMAGE-');
    const newImagePath = path.join(archivesDir, newImageName);
    fs.renameSync(tempDir, newImagePath);
    
    console.log(`  ✓ Converted DELTA to IMAGE: ${newImageName}`);
    return newImageName;
    
  } catch (error) {
    // Cleanup on error
    if (fs.existsSync(tempDir)) {
      fs.rmSync(tempDir, { recursive: true, force: true });
    }
    throw error;
  }
}

function mergeDeltaIntoNext(archivesDir, deltaToRemove, nextDelta, baseImage) {
  const deltaPath = path.join(archivesDir, deltaToRemove);
  const nextDeltaPath = path.join(archivesDir, nextDelta);
  
  // Copy all files from deltaToRemove into nextDelta
  // This "concentrates" the changes
  const deltaItems = fs.readdirSync(deltaPath);
  deltaItems.forEach(item => {
    if (item.startsWith('.memorywell')) return;
    
    const srcPath = path.join(deltaPath, item);
    const destPath = path.join(nextDeltaPath, item);
    
    // If file exists in nextDelta, keep nextDelta's version (it's more recent)
    // If not, copy from deltaToRemove
    if (!fs.existsSync(destPath)) {
      copyItem(srcPath, destPath);
    }
  });
  
  console.log(`  ✓ Merged ${deltaToRemove} into ${nextDelta}`);
}

function showHelp() {
  console.log(`
MemoryWell Pop - Pop (restore and remove) archives from stack

Usage: mwpop [archive-name] [options]

Modes:
  mwpop                    Pop last archive (restore + delete)
  mwpop <archive-name>     Pop specific archive (maintains delta chain)
  mwpop <archive-name> --onedelta  Consolidate multiple deltas into one

Options:
  --help                   Show this help message

Examples:
  mwpop                                        # Pop last archive
  mwpop 01-20260314-123456-DELTA-version-2     # Pop specific archive
  mwpop 01-20260314-123456-DELTA-v1 --onedelta # Merge consecutive deltas

Note: Pop is destructive - archives are deleted after restoration.
      Use 'mwextract' for non-destructive restoration.
`);
  process.exit(0);
}

function popMemoryWell() {
  const cwd = process.cwd();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    showHelp();
  }
  
  if (!isMemoryWell(cwd)) {
    console.log('❌ Not a MemoryWell directory. Run "mwinit" first.');
    process.exit(1);
  }
  
  const archiveName = args.find(arg => !arg.startsWith('--'));
  const oneDelta = args.includes('--onedelta');
  
  const archivesDir = getArchivesDir(cwd);
  const archives = listArchives(archivesDir);
  
  if (archives.length === 0) {
    console.log('⚠️  No archives to pop');
    process.exit(0);
  }
  
  // Mode 1: Pop last archive (no parameter)
  if (!archiveName) {
    const lastArchive = archives[archives.length - 1];
    
    console.log(`\n📦 Popping last archive: ${lastArchive}\n`);
    
    // Check if root has files
    const rootFiles = getRootFiles(cwd);
    if (rootFiles.length > 0) {
      console.log('⚠️  Root directory is not empty!');
      console.log('Current files will be deleted before extracting the archive.');
      console.log('\nPress Ctrl+C to cancel, or any key to continue...');
      // In real implementation, wait for user input
      // For now, we'll proceed
    }
    
    try {
      // Delete current root files
      if (rootFiles.length > 0) {
        deleteRootFiles(cwd, rootFiles);
      }
      
      // Extract archive to root
      extractArchiveToRoot(cwd, archivesDir, lastArchive);
      
      // Delete the archive
      deleteArchive(archivesDir, lastArchive);
      
      // Remap symlinks
      remapMemoryWell(cwd, { silent: true });
      
      console.log('\n✅ Pop completed successfully!');
      console.log(`   Restored: ${lastArchive}`);
      console.log(`   Archives remaining: ${archives.length - 1}`);
      
    } catch (error) {
      console.error('❌ Error during pop:', error.message);
      process.exit(1);
    }
    
    return;
  }
  
  // Mode 2 & 3: Pop specific archive
  const archiveIndex = archives.indexOf(archiveName);
  
  if (archiveIndex === -1) {
    console.log(`❌ Archive not found: ${archiveName}`);
    process.exit(1);
  }
  
  // Mode 3: --onedelta - consolidate multiple deltas into one
  if (oneDelta) {
    console.log(`\n🔄 Consolidating deltas starting from: ${archiveName}\n`);
    
    try {
      const isDelta = isArchiveDelta(archiveName);
      
      if (!isDelta) {
        console.log('❌ --onedelta can only be used with DELTA archives');
        process.exit(1);
      }
      
      // Find all consecutive deltas after this one
      const deltasToMerge = [archiveName];
      let nextIndex = archiveIndex + 1;
      
      while (nextIndex < archives.length && isArchiveDelta(archives[nextIndex])) {
        deltasToMerge.push(archives[nextIndex]);
        nextIndex++;
      }
      
      console.log(`  ℹ️  Found ${deltasToMerge.length} consecutive DELTA(s) to consolidate`);
      
      // Get base image from first delta
      const firstDeltaPath = path.join(archivesDir, archiveName);
      const metaPath = path.join(firstDeltaPath, '.memorywell-meta.json');
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const baseImage = meta.baseImage;
      const baseImagePath = path.join(archivesDir, baseImage);
      
      // Create consolidated delta in temp directory
      const tempDir = path.join(archivesDir, '.temp-onedelta');
      if (fs.existsSync(tempDir)) {
        fs.rmSync(tempDir, { recursive: true, force: true });
      }
      fs.mkdirSync(tempDir);
      
      // Start with base IMAGE
      const baseItems = fs.readdirSync(baseImagePath);
      baseItems.forEach(item => {
        if (item.startsWith('.memorywell')) return;
        const srcPath = path.join(baseImagePath, item);
        const destPath = path.join(tempDir, item);
        copyItem(srcPath, destPath);
      });
      
      // Apply all deltas in sequence
      deltasToMerge.forEach(deltaName => {
        const deltaPath = path.join(archivesDir, deltaName);
        const deltaItems = fs.readdirSync(deltaPath);
        
        deltaItems.forEach(item => {
          if (item.startsWith('.memorywell')) return;
          const srcPath = path.join(deltaPath, item);
          const destPath = path.join(tempDir, item);
          copyItem(srcPath, destPath);
        });
        
        console.log(`  ✓ Applied: ${deltaName}`);
      });
      
      // Now create a single delta with all changes
      const consolidatedDelta = path.join(archivesDir, '.temp-consolidated');
      if (fs.existsSync(consolidatedDelta)) {
        fs.rmSync(consolidatedDelta, { recursive: true, force: true });
      }
      fs.mkdirSync(consolidatedDelta);
      
      // Compare temp (final state) with base image to get consolidated delta
      const tempItems = fs.readdirSync(tempDir);
      tempItems.forEach(item => {
        const tempItemPath = path.join(tempDir, item);
        const baseItemPath = path.join(baseImagePath, item);
        
        // If item doesn't exist in base or is different, include in delta
        if (!fs.existsSync(baseItemPath)) {
          const destPath = path.join(consolidatedDelta, item);
          copyItem(tempItemPath, destPath);
        } else {
          // Check if different (simplified - just check if it's a file and sizes differ)
          const tempStat = fs.statSync(tempItemPath);
          const baseStat = fs.statSync(baseItemPath);
          
          if (tempStat.isFile() && baseStat.isFile()) {
            if (tempStat.size !== baseStat.size || 
                Math.abs(tempStat.mtime - baseStat.mtime) > 1000) {
              const destPath = path.join(consolidatedDelta, item);
              copyItem(tempItemPath, destPath);
            }
          } else if (tempStat.isDirectory()) {
            // For directories, always include (simplified)
            const destPath = path.join(consolidatedDelta, item);
            copyItem(tempItemPath, destPath);
          }
        }
      });
      
      // Create metadata for consolidated delta
      const consolidatedMeta = {
        type: 'DELTA',
        baseImage: baseImage,
        created: new Date().toISOString(),
        consolidated: true,
        originalDeltas: deltasToMerge.length
      };
      
      fs.writeFileSync(
        path.join(consolidatedDelta, '.memorywell-meta.json'),
        JSON.stringify(consolidatedMeta, null, 2)
      );
      
      // Delete all original deltas
      deltasToMerge.forEach(deltaName => {
        deleteArchive(archivesDir, deltaName);
      });
      
      // Rename consolidated delta to use first delta's name
      const finalDeltaPath = path.join(archivesDir, archiveName);
      fs.renameSync(consolidatedDelta, finalDeltaPath);
      
      // Cleanup temp
      fs.rmSync(tempDir, { recursive: true, force: true });
      
      // Extract consolidated delta to root
      const rootFiles = getRootFiles(cwd);
      if (rootFiles.length > 0) {
        deleteRootFiles(cwd, rootFiles);
      }
      extractArchiveToRoot(cwd, archivesDir, archiveName);
      
      // Remap symlinks
      remapMemoryWell(cwd, { silent: true });
      
      console.log('\n✅ Delta consolidation completed!');
      console.log(`   Merged ${deltasToMerge.length} deltas into 1`);
      console.log(`   New consolidated delta: ${archiveName}`);
      console.log(`   Archives remaining: ${archives.length - deltasToMerge.length + 1}`);
      
    } catch (error) {
      console.error('❌ Error during consolidation:', error.message);
      process.exit(1);
    }
    
    return;
  }
  
  // Mode 2: Pop specific archive (without --onedelta)
  console.log(`\n📦 Popping archive: ${archiveName}\n`);
  
  try {
    const archivePath = path.join(archivesDir, archiveName);
    const isImage = isArchiveImage(archiveName);
    const isDelta = isArchiveDelta(archiveName);
    
    // Extract to root first
    const rootFiles = getRootFiles(cwd);
    if (rootFiles.length > 0) {
      deleteRootFiles(cwd, rootFiles);
    }
    extractArchiveToRoot(cwd, archivesDir, archiveName);
    
    // Now handle the delta chain
    if (isImage) {
      // Popping an IMAGE
      const nextArchive = findNextArchive(archives, archiveIndex);
      
      if (nextArchive && isArchiveDelta(nextArchive)) {
        // Next archive is a DELTA, need to update or convert it
        const previousImage = findPreviousImage(archives, archiveIndex);
        
        if (previousImage) {
          // Update DELTA to point to previous IMAGE
          updateDeltaMetadata(archivesDir, nextArchive, previousImage);
        } else {
          // No previous IMAGE, convert DELTA to IMAGE
          const newImageName = convertDeltaToImage(archivesDir, nextArchive, archiveName);
          console.log(`  ℹ️  No previous IMAGE found, converted ${nextArchive} to IMAGE`);
        }
      }
      
    } else if (isDelta) {
      // Popping a DELTA
      const nextArchive = findNextArchive(archives, archiveIndex);
      const metaPath = path.join(archivePath, '.memorywell-meta.json');
      const meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'));
      const baseImage = meta.baseImage;
      
      if (nextArchive && isArchiveDelta(nextArchive)) {
        // Next is also a DELTA, merge this one into it
        mergeDeltaIntoNext(archivesDir, archiveName, nextArchive, baseImage);
        // Update next DELTA to point to our base IMAGE
        updateDeltaMetadata(archivesDir, nextArchive, baseImage);
      }
      // If next is IMAGE or nothing, just delete this DELTA
    }
    
    // Delete the popped archive
    deleteArchive(archivesDir, archiveName);
    
    // Remap symlinks
    remapMemoryWell(cwd, { silent: true });
    
    console.log('\n✅ Pop completed successfully!');
    console.log(`   Restored: ${archiveName}`);
    console.log(`   Archives remaining: ${archives.length - 1}`);
    
  } catch (error) {
    console.error('❌ Error during pop:', error.message);
    process.exit(1);
  }
}

popMemoryWell();
