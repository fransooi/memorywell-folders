#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

function isMemoryWell(dir) {
  const requiredDirs = ['00-folders', '01-last-week', '02-last-month', '03-last-year', '04-before', '05-favorite'];
  return requiredDirs.every(d => fs.existsSync(path.join(dir, d)));
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

function findInMemoryWell() {
  const cwd = process.cwd();
  
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
  
  const archivesDir = path.join(cwd, '00-folders');
  
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
    console.log(`${idx + 1}. ${result.archive}`);
    
    if (result.files) {
      console.log(`   Matching files (${result.files.length}):`);
      result.files.slice(0, 5).forEach(file => {
        console.log(`     - ${file}`);
      });
      if (result.files.length > 5) {
        console.log(`     ... and ${result.files.length - 5} more`);
      }
    }
    
    console.log(`   To restore: pop ${result.archive}\n`);
  });
}

findInMemoryWell();
