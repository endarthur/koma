# NAME

stat - display file status

## SYNOPSIS

`stat <file>`

## DESCRIPTION

Display detailed information about a file or directory, including:
- File type (file or directory)
- Size in bytes
- Inode number
- Timestamps (created, modified, accessed)
- Permissions

## EXAMPLES

Show file information:
```
stat file.txt
```

Show directory information:
```
stat /home
```

Check script details:
```
stat /usr/bin/script.js
```

## SEE ALSO

ls(1), wc(1), cat(1)
