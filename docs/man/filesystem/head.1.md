# NAME

head - display first lines of file

## SYNOPSIS

`head <file> [-n lines]`

## DESCRIPTION

Display the first 10 lines of a file. Use the -n option to specify a different number of lines.

## OPTIONS

**-n NUM**
  Display NUM lines instead of the default 10.

## EXAMPLES

Show first 10 lines:
```
head log.txt
```

Show first 5 lines:
```
head -n 5 log.txt
```

Show first 20 lines:
```
head -n 20 /home/script.js
```

## SEE ALSO

tail(1), cat(1), grep(1), wc(1)
