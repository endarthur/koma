# NAME

env - display environment variables

## SYNOPSIS

`env`

## DESCRIPTION

Display all environment variables and their values. Environment variables are available to all scripts executed with the `run` command.

Default environment variables:
- **HOME** - User home directory (/home)
- **USER** - Username (koma)
- **PATH** - Binary search path (/usr/bin)
- **PWD** - Current working directory
- **SHELL** - Shell name (koma)

## EXAMPLES

Show all environment variables:
```
env
```

## SEE ALSO

run(1), pwd(1)
