# NAME

touch - create empty files

## SYNOPSIS

`touch <file> [files...]`

## DESCRIPTION

Create one or more empty files in the virtual filesystem. If the file already exists, updates its modification timestamp.

## EXAMPLES

Create a file:
```
touch README.md
```

Create multiple files:
```
touch file1.txt file2.txt file3.txt
```

Update timestamp:
```
touch existing-file.txt
```

## SEE ALSO

mkdir(1), rm(1), vein(1), write(1)
