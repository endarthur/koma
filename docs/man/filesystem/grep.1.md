# NAME

grep - search for patterns in files or input

## SYNOPSIS

```bash
grep [options] <pattern> [file]
grep -n <pattern> <file>
grep -i <pattern> <file>
grep -v <pattern> <file>
grep -c <pattern> <file>
command | grep <pattern>
```

## DESCRIPTION

The `grep` command searches for lines matching a pattern (regular expression) in files or standard input. It outputs matching lines to standard output.

When reading from a file, grep searches the specified file. When used in a pipeline, grep reads from standard input.

By default, grep performs case-sensitive matching and outputs only the matching lines without modification.

## OPTIONS

### -n, --number

Prefix each output line with its line number in the input.

**Example:**
```bash
grep -n error log.txt
```

Output:
```
5:error: file not found
12:error: connection timeout
```

### -i, --ignore-case

Perform case-insensitive pattern matching. By default, grep is case-sensitive.

**Example:**
```bash
grep -i error log.txt
```

Matches "error", "Error", "ERROR", "ErRoR", etc.

### -v, --invert

Invert the match - output lines that do NOT match the pattern.

**Example:**
```bash
grep -v comment config.txt
```

Shows all lines that don't contain "comment".

### -c, --count

Suppress normal output and only print the count of matching lines.

**Example:**
```bash
grep -c error log.txt
```

Output:
```
42
```

## PATTERN SYNTAX

Grep uses JavaScript regular expressions. Common patterns:

- `.` - Match any single character
- `*` - Match zero or more of the preceding character
- `+` - Match one or more of the preceding character
- `^` - Match start of line
- `$` - Match end of line
- `[abc]` - Match any character in brackets
- `[^abc]` - Match any character NOT in brackets
- `\d` - Match any digit
- `\w` - Match any word character
- `\s` - Match any whitespace

**Examples:**
```bash
grep "^import"           # Lines starting with "import"
grep "error$"            # Lines ending with "error"
grep "test.*file"        # "test" followed by "file"
grep "[0-9]+"            # Lines containing numbers
```

## EXAMPLES

### Basic search

Search for "error" in log file:
```bash
grep error log.txt
```

### With line numbers

Show line numbers for matches:
```bash
grep -n TODO script.js
```

### Case-insensitive search

Find "error" regardless of case:
```bash
grep -i error log.txt
```

### Count matches

Count how many lines contain "error":
```bash
grep -c error log.txt
```

### Invert match

Show lines that don't contain comments:
```bash
grep -v "^#" config.sh
```

### Pipeline usage

Search through piped input:
```bash
cat log.txt | grep error
ls | grep ".txt"
find /home -name "*.js" | grep test
```

### Combined flags

Show line numbers with case-insensitive search:
```bash
grep -ni error log.txt
```

Count non-matching lines:
```bash
grep -vc "^#" config.sh
```

### Regular expressions

Find lines starting with "import":
```bash
grep "^import" script.js
```

Find lines with numbers:
```bash
grep "[0-9]" data.txt
```

Find email-like patterns:
```bash
grep "\w+@\w+\.\w+" contacts.txt
```

## OUTPUT FORMAT

### Default output

Just the matching lines:
```
error in file.txt
another error occurred
```

### With -n (line numbers)

Line numbers prefixed with colon:
```
5:error in file.txt
12:another error occurred
```

### With -c (count)

Just the number:
```
2
```

### Terminal output

When outputting directly to terminal (not piped), matching text is highlighted in red for easier visibility.

When piped to another command, no color formatting is applied.

## USAGE WITH PIPES

Grep is commonly used in pipelines:

```bash
# Find and filter
find /home -name "*.txt" | grep config

# Multiple filters
cat log.txt | grep error | grep -v warning

# Count matches in pipeline
ls | grep ".js" | grep -c test

# Process output
grep error log.txt | sort | uniq
```

## EXIT STATUS

Grep returns:
- **0** - One or more lines matched
- **Error** - If an error occurred (file not found, etc.)

## NOTES

- Patterns are JavaScript regular expressions
- Case-sensitive by default (use `-i` for case-insensitive)
- Empty pattern matches all lines
- Reads from stdin when no file specified (useful in pipes)
- Color highlighting only appears in terminal, not in pipes
- Multiple flags can be combined: `-ni`, `-cv`, etc.

## SEE ALSO

cat(1), find(1), sort(1), uniq(1), head(1), tail(1), wc(1)
