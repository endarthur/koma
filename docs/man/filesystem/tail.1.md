# NAME

tail - display last lines of file

## SYNOPSIS

`tail <file> [-n lines]`

## DESCRIPTION

Display the last 10 lines of a file. Use the -n option to specify a different number of lines.

## OPTIONS

**-n NUM**
  Display NUM lines instead of the default 10.

## EXAMPLES

Show last 10 lines:
```
tail log.txt
```

Show last 5 lines:
```
tail -n 5 log.txt
```

Show last 20 lines:
```
tail -n 20 /home/output.log
```

## SEE ALSO

head(1), cat(1), grep(1), wc(1)
