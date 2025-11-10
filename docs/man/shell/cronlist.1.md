# NAME

cronlist - list scheduled cron jobs

## SYNOPSIS

`cronlist`

## DESCRIPTION

Display all scheduled cron jobs with their:
- Job ID (for use with cronrm)
- Cron schedule expression
- Script path
- Next scheduled execution time

Cron jobs persist across page reloads and continue executing in the background.

## EXAMPLES

List all cron jobs:
```
cronlist
```

## SEE ALSO

cron(1), cronrm(1), ps(1)
