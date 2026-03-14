# MemoryWell Folders

**Simple, Visual Backup System with Time-Based Organization**

[![Version](https://img.shields.io/badge/version-1.0.0-blue.svg)](https://github.com/FrancoisLionet/memorywell-folders)
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
- 🎯 Two modes: Full (with time links) or Simple (single folder)

---

## 📖 Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
  - [Windows](#windows)
  - [macOS](#macos)
  - [Linux](#linux)
- [How It Works](#how-it-works)
  - [Full Mode (Default)](#full-mode-default)
  - [Simple Mode (--nolinks)](#simple-mode---nolinks)
- [Usage](#usage)
  - [CLI Commands](#cli-commands)
  - [GUI Mode](#gui-mode)
  - [Pop Safety Options](#pop-safety-options)
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

# Initialize a folder (full mode with time-based links)
cd my-project
mwinit

# OR initialize in simple mode (single folder, perfect for development)
mwinit --nolinks

# Archive your work
echo "Hello World" > file.txt
mwpush "first version"

# Continue working
echo "More content" > file2.txt
mwpush --usedelta "second version"

# Restore an archive
mwpop 00-20260314-123456-IMAGE-first-version
```

---

## 💻 Installation

### Windows

1. **Prerequisites:** Node.js installed
2. **Install:**
   ```powershell
   git clone https://github.com/FrancoisLionet/memorywell-folders.git
   cd memorywell-folders
   .\install.ps1
   ```
3. **Verify:** Open a new PowerShell window and run `mwinit --help`

### macOS

1. **Prerequisites:** Node.js installed
2. **Install:**
   ```bash
   git clone https://github.com/FrancoisLionet/memorywell-folders.git
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

Perfect for projects where you want automatic time-based organization.

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
- ✅ Time-based navigation
- ✅ Favorites system
- ✅ Automatic link management
- ✅ Easy browsing by date

**Initialize:**
```bash
mwinit
```

### Simple Mode (--nolinks)

Perfect for development where you want minimal visual clutter.

**Structure created:**
```
your-project/
└── 00-memorywell/
    └── folders/       # ALL archives (actual files)
```

**Features:**
- ✅ Single directory
- ✅ No visual clutter
- ✅ Faster operations
- ✅ All core features work
- ❌ No time-based links
- ❌ No favorites

**Initialize:**
```bash
mwinit --nolinks
```

---

## 📚 Usage

### CLI Commands

#### `mwinit [--gui] [--nolinks]`

Initialize a directory as a MemoryWell.

**Options:**
- `--gui`: Create clickable GUI applications
- `--nolinks`: Simple mode (single folder, no time-based links)

**Examples:**
```bash
mwinit                    # Full mode
mwinit --nolinks          # Simple mode
mwinit --gui              # Full mode with GUI apps
mwinit --gui --nolinks    # Simple mode with GUI apps
```

#### `mwpush [--usedelta] [--setfavorite] <description>`

Archive all files from the root directory.

**Options:**
- `--usedelta`: Save only changed files (incremental backup)
- `--setfavorite`: Mark as favorite (full mode only)
- `<description>`: Optional description for the archive

**Examples:**
```bash
mwpush "initial version"
mwpush --usedelta "quick save"
mwpush --setfavorite "milestone v1.0"
```

**Archive naming:**
- `00-YYYYMMDD-HHMMSS-IMAGE-description` (full archive)
- `00-YYYYMMDD-HHMMSS-DELTA-description` (incremental)

#### `mwpop [--mode=delete|merge|archive] <archive-name>`

Restore an archive to the root directory.

**Safety options** (if root has files):
- `delete`: Remove current files (⚠️ destructive)
- `merge`: Keep current files + restore archive
- `archive`: Create backup first, then restore

**Examples:**
```bash
mwpop 00-20260314-123456-IMAGE-first-version
mwpop --mode=archive 00-20260314-123456-IMAGE-first-version
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

Toggle favorite status of an archive (full mode only).

**Examples:**
```bash
mwsetfavorite 00-20260314-123456-IMAGE-first-version
```

### GUI Mode

When initialized with `--gui`, MemoryWell creates clickable applications:

**macOS:**
- `MemoryWell-Push.app`
- `MemoryWell-Pop.app`
- `MemoryWell-Find.app`
- `MemoryWell-SetFavorite.app`

**Linux:**
- `memorywell-push.sh`
- `memorywell-pop.sh`
- `memorywell-find.sh`
- `memorywell-setfavorite.sh`

**Windows:**
- Same as Linux (`.sh` files work with Git Bash)

**Features:**
- Native system dialogs (AppleScript, Zenity, PowerShell)
- No terminal needed
- Same functionality as CLI

### Pop Safety Options

When restoring an archive with `mwpop`, if files exist at root:

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
mwpop --mode=archive 00-20260314-123456-IMAGE-version
```

**GUI:**
Interactive dialogs guide you through the choice.

---

## 💡 Examples

### Development Workflow (Simple Mode)

```bash
# Initialize simple mode
cd my-app
mwinit --nolinks

# Quick saves during development
mwpush "working on login"
mwpush --usedelta "fixed bug"
mwpush --usedelta "added tests"

# Restore previous version
mwpop 00-20260314-120000-IMAGE-working-on-login
```

### Project Workflow (Full Mode)

```bash
# Initialize with time-based organization
cd my-project
mwinit

# Create milestones
mwpush --setfavorite "v1.0 release"
mwpush "daily backup"
mwpush --usedelta "quick save"

# Browse by time
ls 01-last-week/     # Recent work
ls 04-favorites/     # Important versions

# Restore with safety
mwpop --mode=archive 00-20260314-100000-IMAGE-v1.0-release
```

### GUI Workflow

```bash
# Initialize with GUI
cd my-project
mwinit --gui

# Now just double-click:
# - MemoryWell-Push.app to archive
# - MemoryWell-Pop.app to restore
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
- 💻 GitHub: [@FrancoisLionet](https://github.com/FrancoisLionet)

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
