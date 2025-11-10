# NAME

find - search for files in directory hierarchy

## SYNOPSIS

```bash
find [path]
find [path] -name <pattern>
find [path] -type <f|d>
find [path] -name <pattern> -type <f|d>
```

## DESCRIPTION

The `find` command recursively searches directories for files matching specified criteria. It can filter by filename pattern and file type.

If no path is specified, `find` searches the current directory and all subdirectories.

## OPTIONS

### -name, -n PATTERN

Match files by name pattern. Supports wildcards:
- `*` - Matches any sequence of characters
- `?` - Matches any single character

Patterns are case-sensitive and match against the filename only, not the full path.

### -type, -t TYPE

Filter by file type:
- `f` - Regular files only
- `d` - Directories only

## EXAMPLES

List all files under `/home`:
```bash
find /home
```

Find all text files in current directory:
```bash
find -name "*.txt"
```

Find all JavaScript files:
```bash
find -name "*.js" -type f
```

Find all directories:
```bash
find -type d
```

Find config files:
```bash
find /home -name "*config*"
```

## USAGE WITH PIPES

`find` works well with pipes for further filtering:

```bash
# Find and count JavaScript files
find -name "*.js" | wc -l

# Find and display sorted
find /home -name "*.txt" | sort

# Find and grep through results
find -name "*.js" | grep test
```

## NOTES

- Searches recursively through all subdirectories
- Silently skips directories that cannot be read
- Results are output as full paths
- Patterns match filename only, not the full path
- Case-sensitive pattern matching

## SEE ALSO

ls(1), grep(1), stat(1)
