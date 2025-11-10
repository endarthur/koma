# NAME

sort - sort lines of text files

## SYNOPSIS

```bash
sort [file]
sort -r [file]
sort -n [file]
command | sort
```

## DESCRIPTION

The `sort` command sorts lines of text alphabetically or numerically. It can read from a file or from standard input (piped data).

By default, `sort` performs case-sensitive lexicographic sorting.

## OPTIONS

### -r, --reverse

Reverse the sort order (descending instead of ascending).

### -n, --numeric

Sort numerically instead of alphabetically. This treats lines as numbers and sorts them by numeric value.

## EXAMPLES

Sort lines in a file:
```bash
sort names.txt
```

Sort directory listing:
```bash
ls | sort
```

Reverse sort:
```bash
sort -r file.txt
```

Sort numbers correctly:
```bash
sort -n numbers.txt
```

Sort and save to file:
```bash
sort names.txt > sorted.txt
```

## USAGE WITH PIPES

`sort` is commonly used in pipelines:

```bash
# Sort and remove duplicates
sort file.txt | uniq

# Find unique extensions
ls | sort | uniq

# Sort and show first 10
cat file.txt | sort | head

# Reverse sort with grep
grep error log.txt | sort -r
```

## NOTES

- Case-sensitive by default
- Empty lines are sorted to the beginning
- Without `-n`, numbers are sorted lexicographically: "10" < "2"
- With `-n`, numbers are sorted numerically: 2 < 10
- Reads from stdin if no file specified
- Output can be piped or redirected

## SEE ALSO

uniq(1), grep(1), cat(1)
