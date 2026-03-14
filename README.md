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

---

## 📖 Table of Contents

- [Quick Start](#quick-start)
- [Installation](#installation)
  - [Windows](#windows)
  - [macOS](#macos)
  - [Linux](#linux)
- [How It Works](#how-it-works)
- [Usage](#usage)
  - [CLI Commands](#cli-commands)
  - [GUI Mode](#gui-mode)
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

# Initialize a folder
cd my-project
mwinit

# Add some files and archive them
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

**Requirements:** Node.js 12+ and PowerShell 5.1+

```powershell
# Download MemoryWell
git clone https://github.com/FrancoisLionet/memorywell-folders.git
cd memorywell-folders

# Run installation script
.\install.ps1

# Restart your terminal
# Commands are now available: mwinit, mwpush, mwpop, mwfind, mwsetfavorite
```

The installer:
- Installs MemoryWell to `%USERPROFILE%\.memorywell`
- Creates commands in `%USERPROFILE%\.local\bin`
- Automatically adds to PATH

**Uninstall:**
```powershell
.\uninstall.ps1
```

### macOS

**Requirements:** Node.js 12+

```bash
# Download MemoryWell
git clone https://github.com/FrancoisLionet/memorywell-folders.git
cd memorywell-folders

# Run installation script
./install.sh

# Add to PATH if needed (installer will tell you)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc

# Commands are now available: mwinit, mwpush, mwpop, mwfind, mwsetfavorite
```

**Uninstall:**
```bash
./uninstall.sh
```

### Linux

**Requirements:** Node.js 12+ (and optionally `zenity` for GUI)

```bash
# Download MemoryWell
git clone https://github.com/FrancoisLionet/memorywell-folders.git
cd memorywell-folders

# Run installation script
./install.sh

# Add to PATH if needed (installer will tell you)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
source ~/.bashrc

# Optional: Install zenity for GUI support
sudo apt-get install zenity  # Ubuntu/Debian
sudo dnf install zenity       # Fedora/RHEL

# Commands are now available: mwinit, mwpush, mwpop, mwfind, mwsetfavorite
```

**Uninstall:**
```bash
./uninstall.sh
```

---

## 🔧 How It Works

### Folder Structure

When you initialize a folder with `mwinit`, MemoryWell creates this structure:

```
my-project/
├── 00-folders/          # All archives stored here
│   ├── 00-20260314-120000-IMAGE-initial/
│   ├── 01-20260314-130000-DELTA-update/
│   └── 02-20260314-140000-IMAGE-final/
├── 01-last-week/        # Symlinks to archives from last week
├── 02-last-month/       # Symlinks to archives from last month
├── 03-last-year/        # Symlinks to archives from last year
├── 04-before/           # Symlinks to older archives
└── 05-favorite/         # Favorite archives + 00-last link
    ├── 00-last -> ../00-folders/02-...  # Always points to latest
    └── 00-20260314-120000-IMAGE-initial -> ...
```

### Archive Types

**IMAGE Archives** (default):
- Complete snapshot of all files
- Created automatically if no IMAGE exists
- Format: `XX-YYYYMMDD-HHMMSS-IMAGE-description`

**DELTA Archives** (`--usedelta`):
- Only stores changed files (compared to first IMAGE)
- Saves disk space
- Automatically reconstructed when restored
- Format: `XX-YYYYMMDD-HHMMSS-DELTA-description`

### Time-Based Organization

MemoryWell automatically creates symlinks based on archive age:
- **01-last-week/**: Archives ≤ 7 days old
- **02-last-month/**: Archives ≤ 30 days old
- **03-last-year/**: Archives ≤ 365 days old
- **04-before/**: Archives > 365 days old

Browse these folders to quickly find archives by time period!

---

## 📚 Usage

### CLI Commands

#### `mwinit [--gui]`
Initialize a folder as a MemoryWell.

```bash
cd my-folder
mwinit           # CLI only
mwinit --gui     # Create clickable GUI apps
```

#### `mwpush [--usedelta] [--setfavorite] [description]`
Archive current files.

```bash
mwpush "my archive"                    # Full IMAGE backup
mwpush --usedelta "incremental"        # DELTA backup (saves space)
mwpush --setfavorite "important"       # Mark as favorite
mwpush --usedelta --setfavorite "v2"   # Combine options
```

**What happens:**
1. All files at root are moved to a new archive in `00-folders/`
2. Root becomes empty
3. Time-based symlinks are updated
4. `05-favorite/00-last` points to this archive

#### `mwpop [archive-name]`
Restore an archive to root.

```bash
mwpop                                    # List available archives
mwpop 00-20260314-120000-IMAGE-initial   # Restore specific archive
```

**DELTA reconstruction:**
If you restore a DELTA archive, MemoryWell automatically:
1. Copies the base IMAGE
2. Applies all intermediate DELTAs
3. Shows the reconstruction chain

**Note:** Root must be empty before restoring.

#### `mwfind [options]`
Search through archives.

```bash
mwfind --date 20260314                  # Archives from specific date
mwfind --from 20260301 --to 20260314    # Date range
mwfind --name "important"               # Name contains text
mwfind --ext .js                        # Files with extension
mwfind --contains "TODO"                # Files containing text
```

#### `mwsetfavorite [archive-name]`
Toggle favorite status.

```bash
mwsetfavorite                                  # List archives with ⭐
mwsetfavorite 00-20260314-120000-IMAGE-initial # Toggle favorite
```

### GUI Mode

Enable GUI with `mwinit --gui` to create clickable applications:

**Windows:** Creates `.bat` scripts (double-click to run)
**macOS:** Creates `.app` bundles (native applications)
**Linux:** Creates `.sh` scripts (requires zenity)

**GUI Applications:**
- 📦 **MemoryWell-Push** - Archive with dialogs
- 📂 **MemoryWell-Pop** - Restore with selection
- 🔍 **MemoryWell-Find** - Search with dialogs
- ⭐ **MemoryWell-SetFavorite** - Manage favorites

Simply double-click and follow the native dialogs!

---

## 💡 Examples

### Basic Workflow

```bash
# 1. Initialize
cd my-project
mwinit

# 2. Work normally
echo "Version 1" > app.js
mkdir data
echo "Config" > data/config.json

# 3. Archive when done (first IMAGE)
mwpush "initial version"

# 4. Continue working
echo "Version 2" > app.js
echo "New feature" > feature.js

# 5. Archive with delta (saves space)
mwpush --usedelta "added feature"

# 6. Mark important version as favorite
mwpush --usedelta --setfavorite "release v1.0"

# 7. Search archives
mwfind --name "release"

# 8. Restore a version
mwpop 02-20260314-140000-DELTA-release-v1.0
```

### GUI Workflow

```bash
# Initialize with GUI
cd my-project
mwinit --gui

# Now you have clickable apps in the folder:
# - Double-click MemoryWell-Push.app
# - Fill in the dialogs
# - Done!
```

### Favorites and Quick Access

```bash
# The 05-favorite/ folder is special:
ls -l 05-favorite/00-last    # Always points to latest archive
cd 05-favorite               # Browse your favorite archives
```

---

## 🔮 Future Versions

Planned features for upcoming releases:

### v1.1 - Compression
- Automatic compression of old archives
- `mwpush --compress` option
- Configurable age threshold

### v1.2 - FADE System
- Automatic expiration of old archives
- Configurable retention policies
- Actions: compress, move to external, delete

### v1.3 - External Backup
- Mirror to external drives
- `mwpush --mirror /Volumes/Backup`
- Automatic sync on push

### v1.4 - Integrity
- Archive verification
- `mwverify` command
- Checksum validation

### v2.0 - Advanced Features
- Cloud storage backends
- Encryption support
- Multi-user collaboration
- Web interface

**Have suggestions?** Open an issue on GitHub!

---

## 👤 Author

**François Lionet**

- Website: [francoislio.net](https://francoislio.net)
- Email: francoas@pm.me
- GitHub: [@FrancoisLionet](https://github.com/FrancoisLionet)

---

## 📄 License

MIT License - see [LICENSE](LICENSE) file for details.

---

## 🙏 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

---

## ⭐ Star History

If you find MemoryWell useful, please consider giving it a star on GitHub!

---

**MemoryWell** - Simple backups, visible folders, automatic organization.
