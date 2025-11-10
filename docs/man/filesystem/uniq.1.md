# NAME

uniq - report or omit repeated lines

## SYNOPSIS

```bash
uniq [file]
uniq -c [file]
command | uniq
```

## DESCRIPTION

The `uniq` command filters out repeated consecutive lines from input. It compares adjacent lines and removes duplicates, keeping only one copy of each repeated line.

**Important:** `uniq` only removes **consecutive** duplicates. To remove all duplicates, sort the input first: `sort file.txt | uniq`.

## OPTIONS

### -c, --count

Prefix each line with the number of times it occurred. Output format:
```
      3 line1
      1 line2
      2 line3
```

Count is right-aligned in a 7-character field.

## EXAMPLES

Remove consecutive duplicates:
```bash
uniq file.txt
```

Remove all duplicates (sort first):
```bash
sort file.txt | uniq
```

Count occurrences:
```bash
uniq -c file.txt
```

Find unique values in data:
```bash
cat data.txt | sort | uniq
```

Count unique lines and sort by frequency:
```bash
sort file.txt | uniq -c | sort -nr
```

## USAGE WITH PIPES

`uniq` is most useful in pipelines, especially with `sort`:

```bash
# Get unique lines from file
sort names.txt | uniq

# Count frequency of each line
sort log.txt | uniq -c | sort -nr

# Find duplicate lines
sort file.txt | uniq -c | grep -v "^      1"

# List unique directory contents
ls /home | sort | uniq
```

## BEHAVIOR

Input:
```
apple
apple
banana
banana
banana
apple
```

Output of `uniq`:
```
apple
banana
apple
```

Output of `sort | uniq`:
```
apple
banana
```

Output of `sort | uniq -c`:
```
      3 apple
      3 banana
```

## NOTES

- Only removes **consecutive** duplicates
- For all duplicates, use `sort` first: `sort | uniq`
- Empty lines are treated as unique lines
- Case-sensitive comparison
- Reads from stdin if no file specified
- Output can be piped or redirected

## SEE ALSO

sort(1), grep(1), wc(1)
