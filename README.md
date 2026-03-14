# MemoryWell Folders

**Simple, Visual Backup System with Time-Based Organization**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/fransooi/memorywell-folders)
[![License](https://img.shields.io/badge/license-MIT-green.svg)](LICENSE)
[![Platform](https://img.shields.io/badge/platform-macOS%20%7C%20Linux%20%7C%20Windows-lightgrey.svg)]()

MemoryWell transforms any folder into a self-archiving workspace with automatic time-based organization. Unlike complex backup systems, MemoryWell uses simple, visible folders you can browse directly in your file manager.

**✨ What makes MemoryWell unique:**
- 📁 Simple folders, no proprietary formats
- ⏰ Automatic time-based organization (week/month/year)
- 💾 Delta mode for space-efficient incremental backups
- ⭐ Built-in favorites system
- 🖱️ Optional GUI with native dialogs
- 🚀 One-command installation
- 🎯 Two modes: Full (visible structure) or Hidden (single folder)

---

## 📖 Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
- [How It Works](#how-it-works)
- [Usage](#usage)
- [Examples](#examples)
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

# Initialize a folder (full mode with visible time-based folders)
cd my-project
mwinit

# OR initialize in hidden mode (single visible folder)
mwinit --hidden

# Archive your work
echo "Hello World" > file.txt
mwpush "first version"

# Continue working
echo "More content" > file2.txt
mwpush --usedelta "second version"

# Extract an archive
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

## 🎨 How It Works

MemoryWell offers two modes to suit different workflows:

### Full Mode (Default)

Perfect for projects where you want visible time-based organization.

**Structure created:**
```
your-project/
├── 01-last-week/      # Symlinks to archives < 7 days old
├── 02-last-month/     # Symlinks to archives < 30 days old
├── 03-last-year/      # Symlinks to archives < 365 days old
├── 04-favorites/      # Your favorite archives + 00-last link
└── 05-folders/        # ALL archives (actual files)
```

**Features:**
- ✅ Visible time-based navigation
- ✅ Favorites system
- ✅ Automatic link management
- ✅ Easy browsing by date

**Initialize:**
```bash
mwinit
```

### Hidden Mode (--hidden)

Perfect for development where you want minimal visual clutter. The structure is hidden inside a single folder.

**Structure created:**
```
your-project/
└── 00-memorywell/
    ├── 01-last-week/      # (hidden from root)
    ├── 02-last-month/     # (hidden from root)
    ├── 03-last-year/      # (hidden from root)
    ├── 04-favorites/      # (hidden from root)
    └── 05-folders/        # ALL archives (actual files)
```

**Features:**
- ✅ Single visible directory
- ✅ No visual clutter in IDE
- ✅ Same internal structure
- ✅ All features work identically

**Initialize:**
```bash
mwinit --nolinks
```

**Why this design?**
- Same code for both modes (simpler maintenance)
- Favorites still work in simple mode
- Time-based links exist but are hidden
- Easy to switch between modes

---

## 📚 Usage

### CLI Commands

#### `mwinit [--gui] [--hidden]`

Initialize a directory as a MemoryWell.

**Options:**
- `--gui`: Create clickable GUI applications
- `--hidden`: Hidden mode (single visible folder)

**Examples:**
```bash
mwinit                    # Full mode
mwinit --hidden           # Hidden mode
mwinit --gui              # Full mode with GUI apps
mwinit --gui --hidden     # Hidden mode with GUI apps
```

#### `mwpush [--usedelta] [--setfavorite] <description>`

Archive all files from the root directory.

**Options:**
- `--usedelta`: Save only changed files (incremental backup)
- `--setfavorite`: Mark as favorite
- `<description>`: Optional description for the archive

**Delta Rules:**
- ⚠️ First archive MUST be IMAGE (--usedelta will be rejected)
- 💡 After 5+ DELTA archives, you'll get a suggestion to create a new IMAGE
- ✅ This ensures delta chains don't get too long and remain reliable

**Examples:**
```bash
mwpush "initial version"
mwpush --usedelta "quick save"
mwpush --setfavorite "milestone v1.0"
```

**Archive naming:**
- `00-YYYYMMDD-HHMMSS-IMAGE-description` (full archive)
- `00-YYYYMMDD-HHMMSS-DELTA-description` (incremental)

#### `mwextract [--mode=delete|merge|archive] <archive-name>`

Extract an archive to the root directory.

**Safety options** (if root has files):
- `delete`: Remove current files (⚠️ destructive)
- `merge`: Keep current files + restore archive
- `archive`: Create backup first, then restore

**Examples:**
```bash
mwextract 00-20260314-123456-IMAGE-first-version
mwextract --mode=archive 00-20260314-123456-IMAGE-first-version
```

**Interactive mode:**
If files exist at root and no `--mode` is specified, you'll be prompted to choose.

#### `mwfind [options]`

Search through archives.

**Options:**
- `--name <pattern>`: Search by archive name
- `--date <YYYYMMDD>`: Search by date
- `--before <YYYYMMDD>`: Archives before date
- `--after <YYYYMMDD>`: Archives after date
- `--ext <extension>`: Search by file extension
- `--contains <text>`: Search file contents

**Examples:**
```bash
mwfind --name "milestone"
mwfind --date 20260314
mwfind --ext .js
mwfind --contains "TODO"
```

#### `mwsetfavorite <archive-name>`

Toggle favorite status of an archive.

**Examples:**
```bash
mwsetfavorite 00-20260314-123456-IMAGE-first-version
```

### GUI Mode

When initialized with `--gui`, MemoryWell creates clickable applications:

**macOS:**
- `MemoryWell-Push.app`
- `MemoryWell-Extract.app`
- `MemoryWell-Find.app`
- `MemoryWell-SetFavorite.app`

**Linux:**
- `memorywell-push.sh`
- `memorywell-extract.sh`
- `memorywell-find.sh`
- `memorywell-setfavorite.sh`

**Windows:**
- Same as Linux (`.sh` files work with Git Bash)

**Features:**
- Native system dialogs (AppleScript, Zenity, PowerShell)
- No terminal needed
- Same functionality as CLI

### Extract Safety Options

When extracting an archive with `mwextract`, if files exist at root:

**1. DELETE Mode**
```
⚠️  Removes all current files
✅ Clean restore
❌ Destructive
```

**2. MERGE Mode**
```
✅ Keeps current files
✅ Adds archive files
⚠️  Overwrites if same name
```

**3. ARCHIVE Mode** (Recommended)
```
✅ Creates backup first
✅ Safe restore
✅ No data loss
```

**CLI:**
```bash
mwextract --mode=archive 00-20260314-123456-IMAGE-version
```

**GUI:**
Interactive dialogs guide you through the choice.

---

## 💡 Examples

### Development Workflow (Hidden Mode)

```bash
# Initialize hidden mode
cd my-app
mwinit --hidden

# Quick saves during development
mwpush "working on login"
mwpush --usedelta "fixed bug"
mwpush --usedelta "added tests"

# Extract previous version
mwextract 00-20260314-120000-IMAGE-working-on-login
```

### Project Workflow (Full Mode)

```bash
# Initialize with visible time-based organization
cd my-project
mwinit

# Create milestones
mwpush --setfavorite "v1.0 release"
mwpush "daily backup"
mwpush --usedelta "quick save"

# Browse by time
ls 01-last-week/     # Recent work
ls 04-favorites/     # Important versions

# Extract with safety
mwextract --mode=archive 00-20260314-100000-IMAGE-v1.0-release
```

### GUI Workflow

```bash
# Initialize with GUI
cd my-project
mwinit --gui

# Now just double-click:
# - MemoryWell-Push.app to archive
# - MemoryWell-Extract.app to restore
# - MemoryWell-Find.app to search
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

MemoryWell was created to solve the simple problem of "I want to save my work without complex tools." It's designed to be visible, simple, and reliable.

**Philosophy:**
- Simple > Complex
- Visible > Hidden  
- Folders > Databases
- Your files, your control

---

**Made with ❤️ by François Lionet | 2026**
