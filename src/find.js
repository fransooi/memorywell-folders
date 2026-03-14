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

function parseDate(dateStr) {
  if (dateStr.length !== 8) return null;
  
  const year = parseInt(dateStr.substring(0, 4));
  const month = parseInt(dateStr.substring(4, 6)) - 1;
  const day = parseInt(dateStr.substring(6, 8));
  
  return new Date(year, month, day);
}

function matchesDateFilter(archiveName, dateFilter) {
  const match = archiveName.match(/^\d{2}-(\d{8})-\d{6}/);
  if (!match) return false;
  
  const archiveDate = parseDate(match[1]);
  if (!archiveDate) return false;
  
  if (dateFilter.exact) {
    const filterDate = parseDate(dateFilter.exact);
    return archiveDate.toDateString() === filterDate.toDateString();
  }
  
  if (dateFilter.from || dateFilter.to) {
    const fromDate = dateFilter.from ? parseDate(dateFilter.from) : new Date(0);
    const toDate = dateFilter.to ? parseDate(dateFilter.to) : new Date();
    
    return archiveDate >= fromDate && archiveDate <= toDate;
  }
  
  return true;
}

function matchesNameFilter(archiveName, nameFilter) {
  if (!nameFilter) return true;
  
  const lowerName = archiveName.toLowerCase();
  const lowerFilter = nameFilter.toLowerCase();
  
  return lowerName.includes(lowerFilter);
}

function searchInArchive(archivePath, searchText) {
  const results = [];
  
  function searchDir(dir) {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
      const itemPath = path.join(dir, item);
      const stat = fs.lstatSync(itemPath);
      
      if (stat.isDirectory()) {
        searchDir(itemPath);
      } else if (stat.isFile()) {
        try {
          const content = fs.readFileSync(itemPath, 'utf8');
          if (content.includes(searchText)) {
            results.push(path.relative(archivePath, itemPath));
          }
        } catch (err) {
        }
      }
    });
  }
  
  searchDir(archivePath);
  return results;
}

function showHelp() {
  console.log(`
MemoryWell Find - Search through archives with interactive opening

Usage: mwfind [options]

Options:
  --name <pattern>         Search by archive name
  --date <YYYYMMDD>        Search by exact date
  --from <YYYYMMDD>        Archives from date onwards
  --to <YYYYMMDD>          Archives up to date
  --ext <extension>        Search by file extension
  --contains <text>        Search file contents
  --help                   Show this help message

Examples:
  mwfind --name "milestone"        # Find archives with "milestone" in name
  mwfind --date 20260314           # Find archives from specific date
  mwfind --from 20260301 --to 20260315  # Date range
  mwfind --ext .js                 # Find archives containing .js files
  mwfind --contains "TODO"         # Search file contents

Interactive mode:
  After results are displayed, enter a number to open that archive's
  folder in Finder/Explorer, or press Enter to quit.
`);
  process.exit(0);
}

function findInMemoryWell() {
  const cwd = process.cwd();
  
  const args = process.argv.slice(2);
  
  if (args.includes('--help')) {
    showHelp();
  }
  
  if (!isMemoryWell(cwd)) {
    console.log('❌ Not a MemoryWell directory. Run "init" first.');
    process.exit(1);
  }
  
  const args = process.argv.slice(2);
  
  if (args.length === 0) {
    console.log('Usage: find [options]');
    console.log('\nOptions:');
    console.log('  --date YYYYMMDD          Find archives from exact date');
    console.log('  --from YYYYMMDD          Find archives from date onwards');
    console.log('  --to YYYYMMDD            Find archives up to date');
    console.log('  --name <text>            Find archives with name containing text');
    console.log('  --ext <extension>        Find files with extension (e.g., .txt, .js)');
    console.log('  --contains <text>        Find archives containing text in files');
    console.log('\nExamples:');
    console.log('  find --date 20260314');
    console.log('  find --from 20260301 --to 20260314');
    console.log('  find --name "first try"');
    console.log('  find --ext .js');
    console.log('  find --contains "important data"');
    console.log('  find --date 20260314 --contains "test"');
    process.exit(0);
  }
  
  const filters = {
    date: {},
    name: null,
    ext: null,
    contains: null
  };
  
  for (let i = 0; i < args.length; i++) {
    const arg = args[i];
    
    if (arg === '--date' && i + 1 < args.length) {
      filters.date.exact = args[++i];
    } else if (arg === '--from' && i + 1 < args.length) {
      filters.date.from = args[++i];
    } else if (arg === '--to' && i + 1 < args.length) {
      filters.date.to = args[++i];
    } else if (arg === '--name' && i + 1 < args.length) {
      filters.name = args[++i];
    } else if (arg === '--ext' && i + 1 < args.length) {
      filters.ext = args[++i];
      if (!filters.ext.startsWith('.')) {
        filters.ext = '.' + filters.ext;
      }
    } else if (arg === '--contains' && i + 1 < args.length) {
      filters.contains = args[++i];
    }
  }
  
  const archivesDir = getArchivesDir(cwd);
  
  if (!fs.existsSync(archivesDir)) {
    console.log('⚠️  No archives directory found');
    process.exit(0);
  }
  
  const archives = fs.readdirSync(archivesDir)
    .filter(name => /^\d{2}-\d{8}-\d{6}/.test(name));
  
  if (archives.length === 0) {
    console.log('⚠️  No archives found');
    process.exit(0);
  }
  
  const results = [];
  
  archives.forEach(archiveName => {
    if (!matchesDateFilter(archiveName, filters.date)) return;
    if (!matchesNameFilter(archiveName, filters.name)) return;
    
    const archivePath = path.join(archivesDir, archiveName);
    
    if (filters.ext) {
      const files = [];
      
      function findFiles(dir) {
        const items = fs.readdirSync(dir);
        items.forEach(item => {
          const itemPath = path.join(dir, item);
          const stat = fs.lstatSync(itemPath);
          
          if (stat.isDirectory()) {
            findFiles(itemPath);
          } else if (stat.isFile() && item.endsWith(filters.ext)) {
            files.push(path.relative(archivePath, itemPath));
          }
        });
      }
      
      findFiles(archivePath);
      
      if (files.length > 0) {
        results.push({ archive: archiveName, files });
      }
    } else if (filters.contains) {
      const matchingFiles = searchInArchive(archivePath, filters.contains);
      
      if (matchingFiles.length > 0) {
        results.push({ archive: archiveName, files: matchingFiles });
      }
    } else {
      results.push({ archive: archiveName, files: null });
    }
  });
  
  if (results.length === 0) {
    console.log('⚠️  No matching archives found');
    process.exit(0);
  }
  
  console.log(`\n🔍 Found ${results.length} matching archive(s):\n`);
  
  results.forEach((result, idx) => {
    const fileCount = result.files ? ` (${result.files.length} file${result.files.length > 1 ? 's' : ''})` : '';
    console.log(`${idx + 1}. ${result.archive}${fileCount}`);
  });
  
  // Interactive prompt to open folder
  console.log('\nOpen Finder on folder? Enter number (or press Enter to quit): ');
  
  const readline = require('readline');
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });
  
  rl.question('', (answer) => {
    rl.close();
    
    if (!answer || answer.trim() === '') {
      process.exit(0);
    }
    
    const num = parseInt(answer.trim());
    
    if (isNaN(num) || num < 1 || num > results.length) {
      console.log('❌ Invalid number');
      process.exit(1);
    }
    
    const selectedArchive = results[num - 1].archive;
    const archivePath = path.join(archivesDir, selectedArchive);
    
    console.log(`\n📂 Opening: ${selectedArchive}\n`);
    
    // Open folder in file explorer (cross-platform)
    const { execSync } = require('child_process');
    
    try {
      if (process.platform === 'darwin') {
        // macOS - open Finder
        execSync(`open "${archivePath}"`);
      } else if (process.platform === 'win32') {
        // Windows - open Explorer
        execSync(`explorer "${archivePath}"`);
      } else {
        // Linux - try xdg-open
        execSync(`xdg-open "${archivePath}"`);
      }
      console.log('✅ Folder opened in file explorer');
    } catch (error) {
      console.error('❌ Could not open folder:', error.message);
      console.log(`   Path: ${archivePath}`);
      process.exit(1);
    }
  });
}

findInMemoryWell();
