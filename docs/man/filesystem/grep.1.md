# NAME

grep - search file contents

## SYNOPSIS

`grep <pattern> <file>`

## DESCRIPTION

Search for lines in a file matching a pattern (regular expression). Displays all matching lines.

## EXAMPLES

Search for a word:
```
grep error log.txt
```

Search for a pattern:
```
grep "^import" script.js
```

Search in home directory:
```
grep TODO /home/notes.txt
```

## SEE ALSO

cat(1), head(1), tail(1), wc(1)
