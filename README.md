# MemoryWell Folders

**Simple, Visual Backup System with Time-Based Organization**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/fransooi/memorywell-folders)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg)]()

MemoryWell transforms any folder into a self-archiving workspace. Choose your preferred mode: full structure with time-based links, hidden structure, or ultra-simple with just archives.

**✨ What makes MemoryWell unique:**
- 📁 Simple folders, no proprietary formats
- 🎯 4 flexible modes to match your workflow
- 💾 Delta mode for space-efficient incremental backups
- ⭐ Built-in favorites system (when using links)
- � Smart import with file-by-file comparison
- 🔄 Time-based organization (last-week, last-month, last-year)
- 🚀 One-command installation

---

## 📖 Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [The 4 Modes](#the-4-modes)
- [Commands](#commands)
- [Usage Examples](#usage-examples)
- [Delta Rules](#delta-rules)
- [GUI Applications](#gui-applications)
- [Future Versions](#future-versions)
- [Author](#author)
- [License](#license)

---

## 🚀 Quick Start

```bash
# Install MemoryWell
./install.sh  # macOS/Linux
# or
.\install.ps1  # Windows

# Initialize (choose your mode)
cd my-project
mwinit                    # Mode 1: Full structure (default)
mwinit --nolinks          # Mode 2: Archives only
mwinit --nolinks --hidden # Mode 3: Same as mode 2
mwinit --hidden           # Mode 4: Hidden structure

# Archive your work
echo "Hello World" > file.txt
mwpush "first version"

# Continue working
echo "More content" > file2.txt
mwpush --usedelta "second version"

# Find and browse archives
mwfind --contains "Hello"
# Enter a number to open the archive folder in Finder

# Pop (restore and remove from stack)
mwpop  # Pops last archive

# Extract (restore without removing)
mwextract 00-20260314-123456-IMAGE-first-version
```

---

## 💻 Installation

### Windows

1. **Prerequisites:** Node.js installed
2. **Install:**
   ```powershell
   git clone https://github.com/fransooi/memorywell-folders.git
   cd memorywell-folders
   .\install.ps1
   ```
3. **Verify:** Open a new PowerShell window and run `mwinit --help`

### macOS

1. **Prerequisites:** Node.js installed
2. **Install:**
   ```bash
   git clone https://github.com/fransooi/memorywell-folders.git
   cd memorywell-folders
   chmod +x install.sh
   ./install.sh
   ```
3. **Verify:** Open a new terminal and run `mwinit --help`

### Linux

Same as macOS. The installer will:
- Copy scripts to `~/.memorywell`
- Create command wrappers in `~/.local/bin`
- Add to PATH if needed

---

## 🎨 The 4 Modes

MemoryWell offers 4 modes using two independent flags: `--nolinks` and `--hidden`

### Mode 1: Full Structure (Default)
**Flags:** None  
**Best for:** Projects where you want visible time-based organization

```
your-project/
├── 01-last-week/      # Symlinks to archives < 7 days old
├── 02-last-month/     # Symlinks to archives < 30 days old
├── 03-last-year/      # Symlinks to archives < 365 days old
├── 04-favorites/      # Your favorite archives + 00-last link
├── 05-folders/        # ALL archives (actual files)
└── ...user files
```

**Initialize:** `mwinit`

**Features:**
- ✅ Visible time-based navigation
- ✅ Favorites system with symlinks
- ✅ Easy browsing by date
- ✅ 00-last link always points to latest

---

### Mode 2: Archives Only
**Flags:** `--nolinks`  
**Best for:** Ultra-simple setup, just archives

```
your-project/
├── 00-memorywell-folders/  # Archives stored directly here
│   ├── 00-20260314-120000-IMAGE-initial/
│   ├── 01-20260314-130000-DELTA-update/
│   └── 02-20260314-140000-IMAGE-final/
└── ...user files
```

**Initialize:** `mwinit --nolinks`

**Features:**
- ✅ Single folder for all archives
- ✅ No symlinks, no time-based organization
- ✅ Minimal visual clutter
- ❌ No favorites system

---

### Mode 3: Archives Only + Hidden
**Flags:** `--nolinks --hidden`  
**Best for:** Same as Mode 2 (both flags result in same structure)

```
your-project/
├── 00-memorywell-folders/  # Archives stored directly here
└── ...user files
```

**Initialize:** `mwinit --nolinks --hidden`

**Note:** This mode is identical to Mode 2. Both flags together create the same simple structure.

---

### Mode 4: Hidden Structure
**Flags:** `--hidden`  
**Best for:** Development with minimal IDE clutter but full features

```
your-project/
├── 00-memorywell/
│   ├── 01-last-week/      # Time-based links (hidden from root)
│   ├── 02-last-month/
│   ├── 03-last-year/
│   ├── 04-favorites/      # Favorites + 00-last link
│   └── 05-folders/        # ALL archives
└── ...user files
```

**Initialize:** `mwinit --hidden`

**Features:**
- ✅ Single visible directory at root
- ✅ Full structure inside (time-based + favorites)
- ✅ All features work identically to Mode 1
- ✅ Clean IDE workspace

---

## 📚 Commands

### 1. `mwinit [--nolinks] [--hidden]`

Initialize a directory as a MemoryWell.

**Options:**
- `--nolinks`: Archives only mode (no time-based organization)
- `--hidden`: Hide structure in single folder
- `--help`: Show help message

**Examples:**
```bash
mwinit                    # Mode 1: Full structure
mwinit --nolinks          # Mode 2: Archives only
mwinit --hidden           # Mode 4: Hidden structure
```

---

### 2. `mwpush [options] [description]`

Archive all files from the root directory.

**Options:**
- `--usedelta`: Save only changed files (incremental backup)
- `--setfavorite`: Mark as favorite (only in modes with links)
- `--gitignore [path]`: Use .gitignore to filter files (optional custom path)
- `--atdate=YYYYMMDD`: Insert archive at specific date (IMAGE only)
- `--keep`: Keep files at root (copy instead of move)
- `--help`: Show help message

**Examples:**
```bash
mwpush "initial version"              # Full IMAGE archive
mwpush --usedelta "quick save"        # Incremental DELTA
mwpush --setfavorite "milestone v1.0" # Mark as favorite
mwpush --gitignore "clean version"    # Filter with .gitignore
mwpush --atdate=20260301 "old backup" # Insert at March 1st, 2026
mwpush --keep "backup copy"           # Keep files at root (copy mode)
```

**Archive naming:**
- `00-YYYYMMDD-HHMMSS-IMAGE-description` (full archive)
- `00-YYYYMMDD-HHMMSS-DELTA-description` (incremental)

---

### 3. `mwpop [archive-name] [--onedelta]`

**NEW!** Pop (restore and remove) archives from the stack.

**Three modes:**

#### Mode 1: Pop last archive (no parameters)
```bash
mwpop
```
- Restores the last archive to root
- Deletes the archive from the stack
- Updates symlinks automatically

#### Mode 2: Pop specific archive
```bash
mwpop 01-20260314-123456-DELTA-version-2
```
- Restores the specified archive
- If IMAGE: updates next DELTA or converts it to IMAGE
- If DELTA: merges into next DELTA and updates chain
- Maintains delta chain integrity

#### Mode 3: Consolidate multiple deltas
```bash
mwpop 01-20260314-123456-DELTA-version-2 --onedelta
```
- Finds all consecutive DELTAs after the specified one
- Merges them into a single optimized DELTA
- Deletes original DELTAs
- Restores consolidated result

**Example workflow:**
```
Before: IMAGE → DELTA-1 → DELTA-2 → DELTA-3
mwpop DELTA-1 --onedelta
After:  IMAGE → DELTA-1 (consolidated)
```

---

### 4. `mwextract [--mode=delete|merge|archive] [--dest=path] <archive-name>`

Extract an archive **without removing it** from the stack.

**Options:**
- `--mode=delete|merge|archive`: Safety mode when target has files
- `--dest=/path/to/directory`: Extract to a different location

**Safety modes:**
- `delete`: Remove current files first
- `merge`: Keep current files + restore archive
- `archive`: Create backup first, then restore (MemoryWell only)

**Examples:**
```bash
# Extract to current directory
mwextract 00-20260314-123456-IMAGE-first-version
mwextract --mode=archive 00-20260314-123456-IMAGE-first-version

# Extract to different location
mwextract --dest=/tmp/restore 00-20260314-123456-IMAGE-first-version
```

---

### 5. `mwimport <path> [options]`

**NEW!** Import external directories into MemoryWell with smart file-by-file merging.

**Modes:**
- `--merge`: Merge with existing files, skip identical (default)
- `--replace`: Delete existing files first
- `--autopush`: Push before import, import, then push again

**Options:**
- `--norecursive`: Copy only files, skip subdirectories
- `--gitignore [path]`: Use .gitignore to filter files (optional custom path)
- `--help`: Show help message

**Examples:**
```bash
# Import and merge (smart file comparison)
mwimport /path/to/project

# Import and replace
mwimport /path/to/project --replace

# Import and auto-push
mwimport /path/to/project --autopush

# Import only files (no subdirectories)
mwimport /path/to/project --norecursive

# Import with gitignore filtering
mwimport /path/to/project --gitignore
```

**Smart Merge:**
- Compares files individually (size + modification time)
- Copies new/different files even in existing directories
- Skips identical files to save time
- Shows live progress: `Copying.. Folder: coco - 1234 - file.js`

**Note:** Imports the **CONTENT** of the directory, not the directory itself.

---

### 6. `mwfind [options]`

**IMPROVED!** Search through archives with interactive folder opening.

**Options:**
- `--name <pattern>`: Search by archive name
- `--date <YYYYMMDD>`: Search by exact date
- `--from <YYYYMMDD>`: Archives from date onwards
- `--to <YYYYMMDD>`: Archives up to date
- `--ext <extension>`: Search by file extension
- `--contains <text>`: Search file contents

**Examples:**
```bash
mwfind --name "milestone"
mwfind --date 20260314
mwfind --ext .js
mwfind --contains "TODO"
```

**Interactive output:**
```
🔍 Found 3 matching archive(s):

1. 00-20260314-123456-IMAGE-first-version (2 files)
2. 01-20260314-134567-DELTA-second-version (1 file)
3. 02-20260314-145678-IMAGE-third-version (3 files)

Open Finder on folder? Enter number (or press Enter to quit):
```

Enter a number to open that archive's folder in Finder/Explorer, or press Enter to quit.

---

### 7. `mwremap`

Remap all symlinks in the MemoryWell structure.

**Usage:**
```bash
mwremap
```

**What it does:**
- Removes all existing symlinks
- Recreates favorite links (00-last + favorites)
- Recreates time-based links (01-last-week, 02-last-month, 03-last-year)
- Updates all references

**When to use:**
- After manually editing archives
- After importing archives from another MemoryWell
- To fix broken symlinks

---

### 8. `mwsetfavorite <archive-name>`

Mark an archive as favorite (only in modes with links).

**Usage:**
```bash
mwsetfavorite 00-20260314-123456-IMAGE-milestone-v1.0
```

**What it does:**
- Adds archive to 04-favorites/ folder
- Creates symlink with archive name
- Preserves all archive metadata

**Note:** Only works in Mode 1 and Mode 4 (modes with symlinks).

---

## 💡 Usage Examples

### Mode 1: Full Structure Workflow

```bash
# Initialize with full visible structure
cd my-project
mwinit

# Import existing project
mwimport /path/to/old-project --autopush

# Create milestones
mwpush --setfavorite "v1.0 release"
mwpush "daily backup"
mwpush --usedelta "quick save"

# Use --keep to backup without clearing root
mwpush --keep "safety backup"

# Browse by time
ls 01-last-week/     # Recent work
ls 04-favorites/     # Important versions

# Find and open in Finder
mwfind --contains "TODO"
# Enter number to open archive folder

# Pop last archive (undo last push)
mwpop

# Extract without removing
mwextract --mode=archive 00-20260314-100000-IMAGE-v1.0-release

# Remap symlinks if needed
mwremap
```

---

### Mode 2: Archives Only Workflow

```bash
# Initialize ultra-simple mode
cd my-app
mwinit --nolinks

# Quick saves
mwpush "working on login"
mwpush --usedelta "fixed bug"
mwpush --usedelta "added tests"
mwpush --usedelta "more tests"
mwpush --usedelta "final tests"

# Consolidate deltas
mwfind --contains "test"
mwpop 01-20260314-120000-DELTA-fixed-bug --onedelta
# Merges all deltas into one

# All archives in one place
ls 00-memorywell-folders/

# Extract previous version
mwextract 00-20260314-120000-IMAGE-working-on-login
```

---

### Mode 4: Hidden Structure Workflow

```bash
# Initialize with hidden structure
cd my-project
mwinit --hidden

# Import and organize
mwimport /path/to/legacy-code --replace
mwpush --setfavorite "migrated legacy code"

# Same features as Mode 1, cleaner root
mwpush --setfavorite "v1.0"
mwpush --usedelta "quick fix"

# Insert an old archive at specific date
mwpush --atdate=20260101 "old backup from January"

# Structure hidden in 00-memorywell/
ls 00-memorywell/04-favorites/

# Use CLI commands
mwfind --name "v1.0"
mwextract 00-20260314-100000-IMAGE-v1.0
mwsetfavorite 00-20260314-100000-IMAGE-v1.0
```

---

## 🔮 Future Versions

### v1.1 - Compression & Cleanup
- Automatic ZIP compression for old archives
- Configurable retention policies
- Archive fade (auto-delete after X days)

### v1.2 - Remote Backup
- Sync to external drives
- Cloud storage integration
- Automatic backup scheduling

### v2.0 - Advanced Features
- Multi-project management
- Archive comparison tools
- Visual timeline browser
- Conflict resolution UI

---

## 👤 Author

**François Lionet**  
Software Creator

- 🌐 Website: [francoislio.net](https://francoislio.net)
- 📧 Email: francoas@pm.me
- 💻 GitHub: [@fransooi](https://github.com/fransooi)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## 🙏 Acknowledgments

MemoryWell was created to solve the simple problem of "I want to save my work without complex tools." It's designed to be flexible, simple, and reliable.

**Philosophy:**
- Simple > Complex
- Flexible > Rigid
- Folders > Databases
- Your files, your control

---

**Made with ❤️ by François Lionet | 2026**
