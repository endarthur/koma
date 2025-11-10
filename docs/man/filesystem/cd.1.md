# NAME

cd - change directory

## SYNOPSIS

`cd [directory]`

## DESCRIPTION

Change the current working directory. If no directory is specified, changes to the home directory (/home).

Special paths:
- **~** - Home directory (/home)
- **..** - Parent directory
- **/** - Root directory

## EXAMPLES

Change to home:
```
cd
cd ~
```

Change to parent:
```
cd ..
```

Change to absolute path:
```
cd /usr/bin
```

Change to relative path:
```
cd projects
```

## SEE ALSO

pwd(1), ls(1)
