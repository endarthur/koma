# NAME

tee - read from stdin and write to file and stdout

## SYNOPSIS

```bash
command | tee <file>
command | tee -a <file>
command | tee <file1> <file2> <file3>
```

## DESCRIPTION

The `tee` command reads from standard input and writes to both standard output and one or more files simultaneously. This allows you to save command output to a file while still viewing it in the terminal or passing it to the next command in a pipeline.

Think of it like a "T-junction" in plumbing - the data flows in one direction and splits into two.

## OPTIONS

### -a, --append

Append to the file(s) instead of overwriting them. If the file doesn't exist, it will be created.

## EXAMPLES

### Basic usage

Save ls output to a file and view it:
```bash
ls | tee output.txt
```

### Pipeline with tee

Save intermediate results in a pipeline:
```bash
cat log.txt | grep error | tee errors.txt | wc -l
```

This:
1. Searches for "error" in log.txt
2. Saves results to errors.txt
3. Counts the lines
4. Shows both the saved lines AND the count

### Append mode

Add to an existing log file:
```bash
echo "New log entry" | tee -a log.txt
```

### Multiple files

Write to multiple files at once:
```bash
ls | tee file1.txt file2.txt file3.txt
```

All three files get the same content.

### Complex pipeline

Monitor and log a process:
```bash
find /home -name "*.txt" | tee found-files.txt | wc -l
```

This shows how many .txt files were found AND saves the list.

### Building logs

Append timestamped entries:
```bash
echo "$(date): System check complete" | tee -a system.log
```

## COMMON USE CASES

### Save pipeline output for later inspection

```bash
ps | grep running | tee snapshot.txt | sort
```

You get sorted output in terminal, but also a saved snapshot.

### Debugging pipelines

Insert tee to see intermediate results:
```bash
cat data.txt | grep pattern | tee debug.txt | sort | uniq
```

Check debug.txt to see what grep found before sort/uniq modified it.

### Logging command output

```bash
ls -la | tee directory-listing.txt
```

View the listing now, but also have it saved for records.

### Split data to multiple destinations

```bash
cat data.txt | tee backup1.txt backup2.txt > /dev/null
```

(Note: We don't have /dev/null yet, so just use `| cat > /dev/null` to suppress terminal output)

## HOW IT WORKS

```
Input (stdin) → tee → Output (stdout)
                  ↓
               File(s)
```

Data flows through tee and gets copied to both destinations.

## NOTES

- Requires input from a pipe (cannot read from terminal directly)
- Can write to multiple files in one command
- Without `-a`, overwrites existing files
- With `-a`, appends to existing files (creates if missing)
- Output to stdout continues to flow for further piping
- Very useful for debugging complex pipelines

## SEE ALSO

cat(1), grep(1), sort(1), wc(1)
