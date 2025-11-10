# NAME

cp - copy files

## SYNOPSIS

`cp <source> <destination>`

## DESCRIPTION

Copy a file to a new location. If the destination is a directory, the file is copied into it. Otherwise, creates a new file with the destination name.

Currently only supports copying files, not directories.

## EXAMPLES

Copy a file:
```
cp file.txt backup.txt
```

Copy into a directory:
```
cp script.js /usr/bin/
```

Copy with absolute paths:
```
cp /home/config.json /tmp/config.json
```

## SEE ALSO

mv(1), rm(1), cat(1)
