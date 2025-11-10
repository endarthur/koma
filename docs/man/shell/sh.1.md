# NAME

sh - execute shell script file

## SYNOPSIS

```bash
sh <script>
sh -v <script>
```

## DESCRIPTION

The `sh` command executes shell scripts - text files containing shell commands (one per line). Each line is executed as if you typed it directly into the terminal.

Shell scripts enable automation, batch operations, and complex workflows using the commands and pipes you already know.

## OPTIONS

### -v, --verbose

Show each command before executing it. Useful for debugging scripts or understanding what they do.

## SCRIPT FORMAT

Shell scripts are plain text files with:
- **One command per line** - Each line is executed sequentially
- **Comments** - Lines starting with `#` are ignored
- **Empty lines** - Blank lines are skipped
- **All shell features** - Pipes, redirects, and all built-in commands work

**Example script** (`setup.sh`):
```bash
# Project setup script
mkdir myproject
cd myproject
echo "console.log('Hello')" > app.js
echo "# My Project" > README.md
ls -l
```

## EXAMPLES

### Basic script execution

Create and run a simple script:
```bash
echo "# Hello script" > hello.sh
echo "echo 'Hello, World!'" >> hello.sh
echo "ls" >> hello.sh
sh hello.sh
```

### Verbose mode

See what the script is doing:
```bash
sh -v setup.sh
```

Output:
```
+ mkdir myproject
+ cd myproject
+ echo "console.log('Hello')" > app.js
...
```

### Automation script

Create a backup script (`backup.sh`):
```bash
# Backup important files
echo "Creating backup..."
mkdir -p /home/backup
cp /home/config.json /home/backup/
cp /home/data.txt /home/backup/
ls /home/backup
echo "Backup complete"
```

Run it:
```bash
sh backup.sh
```

### Data processing pipeline

Create a log analyzer (`analyze.sh`):
```bash
# Analyze log file
echo "Analyzing logs..."
grep error log.txt | sort | uniq -c > error-summary.txt
grep warning log.txt | wc -l > warning-count.txt
cat error-summary.txt
echo "Total warnings:"
cat warning-count.txt
```

### Build script

Create a build process (`build.sh`):
```bash
# Build project
echo "Building project..."
find /home/project -name "*.js" > source-files.txt
cat source-files.txt | wc -l
echo "Build complete"
```

### Installation script

Setup a new environment (`install.sh`):
```bash
# Setup development environment
mkdir -p /home/dev/src
mkdir -p /home/dev/dist
mkdir -p /home/dev/tests
echo "console.log('test')" > /home/dev/tests/test.js
tree /home/dev
```

## SCRIPT BEST PRACTICES

### Use comments

Document what your script does:
```bash
# Setup project structure
mkdir project

# Initialize files
echo "# Project" > project/README.md

# Show results
ls project
```

### Error handling

Scripts continue even if a command fails. Use `echo` to show progress:
```bash
echo "Step 1: Creating directories..."
mkdir project
echo "Step 2: Creating files..."
echo "content" > project/file.txt
echo "Done!"
```

### Test incrementally

Build scripts one command at a time:
1. Test each command manually
2. Add it to the script
3. Test the script
4. Add the next command

### Use pipes and redirects

Take advantage of shell features:
```bash
# Find and count
find /home -name "*.txt" | wc -l > txt-count.txt

# Filter and save
ls | grep ".js" | sort > js-files.txt

# Process and display
cat data.txt | sort | uniq | tee results.txt
```

## CREATING SCRIPTS

### Method 1: Using echo

```bash
echo "# My script" > script.sh
echo "echo 'Hello'" >> script.sh
echo "ls" >> script.sh
sh script.sh
```

### Method 2: Using vein editor

```bash
vein script.sh
# Write your script, press Ctrl+S to save
sh script.sh
```

### Method 3: Using write command

```bash
write script.sh <<EOF
# My script
echo "Starting..."
mkdir test
echo "Done"
EOF
sh script.sh
```

## LIMITATIONS

Current limitations (will be improved in future phases):

- **No variables** - Cannot store values like `NAME=foo`
- **No control flow** - No if/then/else or loops
- **No functions** - Cannot define reusable functions
- **No exit codes** - Cannot check if commands succeeded
- **Line-by-line** - Each line executes independently

Despite these limitations, shell scripts are still very useful for:
- Automation
- Batch operations
- File organization
- Data processing
- Setup procedures

## COMPARISON WITH RUN

- **`sh`** - Executes shell commands (what you type in the terminal)
- **`run`** - Executes JavaScript code (programming language)

**Use `sh` when:**
- Automating terminal tasks
- Batch file operations
- Using pipes and commands

**Use `run` when:**
- Need variables and logic
- Complex calculations
- Data manipulation
- API interactions

## NOTES

- Scripts are just text files with commands
- Each line executes in sequence
- Comments (`#`) and blank lines are ignored
- All shell features work (pipes, redirects, etc.)
- Errors don't stop execution (remaining lines still run)
- Use `-v` to debug and see what's happening
- No file extension required, but `.sh` is conventional

## SEE ALSO

run(1), echo(1), cat(1), vein(1), write(1)
