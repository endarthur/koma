# NAME

wc - word, line, and byte count

## SYNOPSIS

`wc <file> [-l] [-w] [-c]`

## DESCRIPTION

Count lines, words, and bytes in a file. Without options, displays all three counts.

## OPTIONS

**-l**
  Show only line count.

**-w**
  Show only word count.

**-c**
  Show only byte count (character count).

## EXAMPLES

Show all counts:
```
wc file.txt
```

Count lines only:
```
wc -l script.js
```

Count words only:
```
wc -w document.txt
```

## SEE ALSO

cat(1), head(1), tail(1), stat(1)
