# komarc(5) - Shell initialization file

## NAME

komarc - Koma shell initialization file

## SYNOPSIS

`/home/.komarc`

## DESCRIPTION

The `.komarc` file is the Koma shell initialization file. It is executed automatically when a new shell session (tab) is created, before the welcome message is displayed.

The file is a simple shell script containing commands that are executed sequentially, just like a script run with `sh(1)`.

## FILE FORMAT

The `.komarc` file follows standard shell script format:

- **One command per line** - Each line is executed as if typed at the shell prompt
- **Comments** - Lines starting with `#` are ignored
- **Blank lines** - Empty lines are skipped
- **All commands supported** - Any built-in command, pipeline, or redirect works

## EXECUTION

`.komarc` is executed:

- When creating a **new tab** (not when restoring tabs from localStorage)
- **Before** the welcome message is displayed
- **Silently** - Output is not shown unless commands explicitly write to terminal
- **Non-fatal** - Errors in individual commands are logged but don't stop execution
- **Asynchronously** - Each command completes before the next runs

If `.komarc` doesn't exist, it is silently ignored (no error).

## TYPICAL USE CASES

### Environment Setup

Set environment variables (when variable support is added in Phase 6):

```bash
# Set custom environment
export EDITOR=vein
export PAGER=less
```

### Directory Structure

Create standard working directories:

```bash
# Create project directories
mkdir -p /home/projects
mkdir -p /home/scripts
mkdir -p /home/data
```

### Startup Messages

Display custom welcome messages:

```bash
# Show system info
echo "Welcome to Koma Workstation"
echo ""
```

### Background Processes

Start long-running processes (when background jobs are supported):

```bash
# Start monitoring scripts
# run /home/scripts/monitor.js &
```

### Aliases and Functions

(Future: when aliases/functions are added in Phase 7)

```bash
# Define shortcuts
alias ll='ls -la'
alias ..='cd ..'
```

## EXAMPLE

Here's a complete example `.komarc`:

```bash
# Koma Shell Configuration
# ~/.komarc

# Welcome message
echo "Koma Workstation - Olivine Kernel"
echo ""

# Create standard directories
mkdir -p /home/projects
mkdir -p /home/scripts
mkdir -p /home/tmp

# Set up project structure
cd /home/projects

# Download useful scripts (example)
# wget https://example.com/utils.js -O /home/scripts/utils.js

# Display current status
echo "Workspace initialized"
```

## DEBUGGING

To see what commands are executed from `.komarc`, temporarily add `echo` statements:

```bash
echo "Loading .komarc..."

mkdir -p /home/projects
echo "Created /home/projects"

cd /home/projects
echo "Changed to projects directory"
```

Or check the browser console (F12) for any error messages.

## FILES

- `/home/.komarc` - User initialization file (the only location checked)

## NOTES

- `.komarc` is **not** executed when tabs are restored from localStorage (on page reload)
- This prevents duplicate execution and maintains tab state
- Commands that fail continue to next line (like `sh -c` but more forgiving)
- Output from `.komarc` commands is not shown by default

## CREATING .KOMARC

Use the built-in editor:

```bash
vein /home/.komarc
```

Or write from command line:

```bash
echo "# Koma initialization" > /home/.komarc
echo "mkdir -p /home/projects" >> /home/.komarc
```

Then open a new tab to test it.

## RETROSPEC NOTE

The `.rc` (run commands) file convention dates to Unix's early days:

- `.profile` - Bourne shell (1979)
- `.cshrc` - C shell (1978)
- `.bashrc` - Bash (1989)

Koma's `.komarc` follows this time-honored tradition. In 1984-1987, a workstation would absolutely have had an initialization file for customizing the shell environment.

## SEE ALSO

`sh(1)` - Execute shell scripts
`koma(1)` - Koma system commands
`env(1)` - View environment variables

## HISTORY

Added in Koma v0.1 (Phase 5 → Phase 6 transition)

---

**Koma Terminal**
Craton Systems, Inc.
Part of the Koma Workstation suite
