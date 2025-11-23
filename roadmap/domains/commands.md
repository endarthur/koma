# Commands

**Domain**: `#commands`
**Related Domains**: `#shell`, `#vfs`, `#processes`, `#network`

## Overview

Built-in shell commands providing filesystem operations, process management, and system utilities. All 48 commands support `--help` flag with schema-based help generation.

## Features by Maturity

### ✅ Production

### Filesystem Commands (17)
**Tags**: `#commands` `#production` `#critical` `#filesystem`
**Status**: Complete with argparse schemas
**Phase**: 2, 5.6 (pipes support)
**Dependencies**: VFS, CommandContext
**Blocks**: None

**Commands**:
- `ls [path] [-l]` - List directory contents
- `cat <files...>` - Concatenate and display files
- `cd <path>` - Change directory
- `mkdir <dir>` - Create directory
- `touch <file>` - Create empty file
- `rm <path> [-r]` - Remove files/directories
- `cp <src> <dest>` - Copy files
- `mv <src> <dest>` - Move/rename files
- `pwd` - Print working directory
- `find <path> [-name pattern]` - Search filesystem
- `grep <pattern> [files...]` - Search file contents
- `head <file> [-n count]` - Show first lines
- `tail <file> [-n count]` - Show last lines
- `wc [file] [-l] [-w] [-c]` - Count lines/words/bytes
- `stat <path>` - Show file/directory stats
- `tree [path] [-L depth]` - Show directory tree
- `write <file> <content>` - Write text to file

**Features**:
- Full argparse support with auto-generated help
- Supports pipes and redirection
- Context-aware output (colors adapt to pipes)
- Comprehensive error handling

**Files**: `src/commands/filesystem.js` (~1200 lines)

### Shell Commands (15)
**Tags**: `#commands` `#production` `#critical` `#shell`
**Status**: Complete with argparse schemas
**Phase**: 2, 5 (processes), 5.5 (system management)
**Dependencies**: Shell, Process Manager, Kernel
**Blocks**: None

**Commands**:
- `help [command]` - List commands or show command help
- `man <command>` - Show manual page
- `clear` - Clear screen (Ctrl+L)
- `echo <text...>` - Echo arguments
- `env` - Show environment variables
- `history` - Show command history
- `version` - Show Koma version
- `exit` - Close current tab
- `run <script> [args...]` - Execute JavaScript file
- `sh <script> [-v]` - Execute shell script
- `ps` - List running processes
- `kill <pid>` - Terminate process
- `cron "<schedule>" <script>` - Schedule job
- `cronlist` - List cron jobs
- `cronrm <id>` - Remove cron job

**Files**: `src/commands/shell.js` (~800 lines)

### System Commands (5)
**Tags**: `#commands` `#production` `#high` `#system`
**Status**: Complete system management suite
**Phase**: 5.5
**Dependencies**: VFS versioning
**Blocks**: None

**Commands** (koma subcommands):
- `koma version` - Show system version and info
- `koma update` - Check for system updates
- `koma upgrade` - Apply system updates
- `koma reset` - Reset system files

**Features**:
- Safe system updates without data loss
- Preserves `/home/` user files
- Updates man pages and system binaries
- Version tracking in `/etc/koma-version`

**Files**: `src/commands/shell.js` (koma command)

### Data Processing Commands (4)
**Tags**: `#commands` `#production` `#high` `#data`
**Status**: Complete Unix-style text processing
**Phase**: 5.6
**Dependencies**: CommandContext (stdin support)
**Blocks**: None

**Commands**:
- `sort [file] [-r] [-n]` - Sort lines
- `uniq [file] [-c]` - Remove duplicate lines
- `tee <file> [-a]` - Write to file and stdout
- `grep <pattern> [files...] [-i] [-n] [-v] [-c]` - Pattern matching

**Features**:
- Full stdin support for pipelines
- Proper exit codes
- Context-aware output

**Files**: `src/commands/filesystem.js`, `src/commands/shell.js`

### Network Commands (1)
**Tags**: `#commands` `#production` `#medium` `#network`
**Status**: Basic HTTP download support
**Phase**: 5.6
**Dependencies**: Fetch API, VFS
**Blocks**: None

**Commands**:
- `wget <url> [-O output] [-q]` - Download files

**Features**:
- HTTP/HTTPS downloads
- Saves to VFS
- Automatic filename detection from URL
- Works with public APIs and CORS-enabled resources

**Files**: `src/commands/shell.js`

### Editor Command (1)
**Tags**: `#commands` `#production` `#high` `#editor`
**Status**: Complete editor integration
**Phase**: 4
**Dependencies**: Editor module, VFS
**Blocks**: None

**Commands**:
- `vein <file>` - Open file in editor

**Features**:
- Opens existing files or creates new ones
- F2/Ctrl+` to toggle back to terminal
- Handles ENOENT gracefully for new files

**Files**: `src/commands/filesystem.js`

### Backup/Restore Commands (2)
**Tags**: `#commands` `#production` `#high` `#backup`
**Status**: Complete backup system
**Phase**: 5.7
**Dependencies**: VFS, pako.js (compression)
**Blocks**: None

**Commands**:
- `backup <file>` - Create .magma archive of VFS
- `restore <file>` - Restore VFS from .magma archive

**Features**:
- Tar-like archive format
- Gzip compression
- Metadata (version, timestamp, file count)
- Full VFS backup and restore

**Files**: `src/commands/filesystem.js`

### Argparse Migration
**Tags**: `#commands` `#production` `#high` `#developer-experience`
**Status**: All 48 commands migrated to argparse schemas
**Phase**: 5 Maintenance
**Dependencies**: argparse stdlib module
**Blocks**: None

**Features**:
- Schema-based argument parsing
- Auto-generated help text with examples
- Consistent error messages
- Combined flag support (`-la` works without special code)
- Help sections: description, options, examples, notes, see also

**Impact**:
- ~200 lines of duplicated argument parsing code removed
- Consistent UX across all commands
- Easy to add new commands

**Files**: All command files use argparse schemas

### 🔧 Working

None - all planned commands are implemented and stable!

### 🧪 Prototype

### Advanced Shell Builtins
**Tags**: `#commands` `#prototype` `#medium` `#scripting`
**Status**: Planned for Phase 8
**Phase**: 8
**Dependencies**: POSIX shell features
**Blocks**: Shell scripting

**Planned Commands**:
- `test` / `[` - Conditional test command
- `export` - Export environment variables
- `unset` - Remove variables
- `.` / `source` - Source shell scripts
- `eval` - Evaluate string as command
- `shift` - Shift positional parameters
- `readonly` - Make variables read-only
- `trap` - Signal handling

### Editor Commands
**Tags**: `#commands` `#prototype` `#low` `#editor`
**Status**: Deferred to Phase 12+
**Phase**: 12+
**Dependencies**: None
**Blocks**: Traditional Unix editor experience

**Planned**:
- `ed` - Line editor (because ed is the standard text editor)
- `sed` - Stream editor for text transformation

## Command Architecture

### Command Structure

All commands follow this pattern:

```javascript
export async function commandName(args, context) {
  const schema = {
    description: 'Command description',
    options: [
      { flag: '-f', name: '--flag', description: 'Flag description' },
      { flag: '-o', name: '--option', arg: 'VALUE', description: 'Option description' }
    ],
    examples: [
      { command: 'commandName -f file.txt', description: 'Example usage' }
    ],
    notes: ['Additional notes'],
    seeAlso: ['related-command']
  };

  const parsed = argparse.parse(args, schema);

  if (argparse.hasHelp(parsed)) {
    argparse.showHelp('commandName', schema, context);
    return 0;
  }

  // Command implementation
  // Use context.write(), context.writeln(), context.getStdin()

  return 0;  // Exit code
}
```

### CommandContext API

Commands receive a `context` object for I/O:

```javascript
context.write(text)          // Write to stdout
context.writeln(text)        // Write line to stdout
context.getStdin()           // Read stdin (for pipes)
context.hasStdin()           // Check if stdin available
context.readLine(prompt)     // Interactive input (Phase 6.5)
context.isPiped             // Boolean: in pipeline?
context.isRedirected        // Boolean: output redirected?
```

**Benefits**:
- Commands work in pipes, redirection, and terminal
- Output adapts to context (colors, formatting)
- Stdin transparently handles files or pipeline input

### Help System

Schema-based help with consistent formatting:

```bash
$ grep --help
NAME
    grep - search file contents for patterns

SYNOPSIS
    grep <pattern> [files...] [options]

DESCRIPTION
    Search for text patterns in files using regular expressions.

OPTIONS
    -i, --ignore-case     Case-insensitive search
    -n, --line-number     Show line numbers
    -v, --invert-match    Show non-matching lines
    -c, --count           Count matches only

EXAMPLES
    grep error log.txt
        Search for 'error' in log.txt

    cat file.txt | grep -i warning
        Case-insensitive search for 'warning'

SEE ALSO
    find, cat, wc
```

## Related Files

**Source**:
- `src/commands/index.js` - Command registry (~100 lines)
- `src/commands/filesystem.js` - Filesystem commands (~1200 lines)
- `src/commands/shell.js` - Shell commands (~800 lines)
- `src/utils/command-utils.js` - Shared helpers (~200 lines)
- `src/stdlib/args.js` - Argparse library (~300 lines)

**Documentation**:
- `docs/man/filesystem/*.1.md` - 17 filesystem command man pages
- `docs/man/shell/*.1.md` - 15 shell command man pages
- `docs/man/README.md` - Man pages build system

**Tests**:
- `tests/integration/commands/*.test.js` - Command integration tests

## Next Steps

**Short-term** (Phase 8):
- Implement `test`/`[` command for conditionals
- Add shell builtins: `export`, `unset`, `source`

**Long-term** (Phase 12+):
- Add `ed` line editor
- Consider `sed` stream editor

## Notes

**Man Pages System**:
- 48 man pages (42 commands + 6 stdlib APIs)
- Markdown sources in `docs/man/` subdirectories
- `build-man-pages.py` generates bundled JavaScript
- Ready for GitHub Pages deployment

**Command Registry**:
- Dynamic command registration in `src/commands/index.js`
- Easy to add new commands
- Auto-discovery via registry lookup

**Naming Convention**:
- Filesystem operations in `filesystem.js`
- Shell/process operations in `shell.js`
- Clear separation of concerns

---

**Last Updated**: 2025-11-16
**Maturity**: Production
**Priority**: Critical
