# NAME

mv - move or rename files and directories

## SYNOPSIS

`mv <source> <destination>`

## DESCRIPTION

Move or rename files and directories. If the destination is a directory, the source is moved into it. Otherwise, the source is renamed to the destination name.

Works with both files and directories.

## EXAMPLES

Rename a file:
```
mv old-name.txt new-name.txt
```

Move into directory:
```
mv file.txt /home/documents/
```

Rename a directory:
```
mv old-dir new-dir
```

Move directory:
```
mv /tmp/cache /home/backup/
```

## SEE ALSO

cp(1), rm(1), cd(1)
