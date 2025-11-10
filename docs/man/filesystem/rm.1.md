# NAME

rm - remove files and directories

## SYNOPSIS

`rm <path> [paths...]`

## DESCRIPTION

Delete one or more files or directories from the virtual filesystem. Directories are removed recursively.

**Warning:** This operation is permanent and cannot be undone.

## EXAMPLES

Remove a file:
```
rm old-file.txt
```

Remove multiple files:
```
rm file1.txt file2.txt temp.log
```

Remove a directory:
```
rm /tmp/cache
```

## SEE ALSO

mkdir(1), touch(1), cp(1), mv(1)
