# NAME

restart - restart the Olivine kernel

## SYNOPSIS

`restart`

## DESCRIPTION

Restart the Olivine kernel (Web Worker). This reinitializes the virtual filesystem from IndexedDB and reloads all system state.

Useful for troubleshooting or applying system changes. All tabs and terminal sessions remain active.

**Warning:** Running processes and cron jobs will be terminated.

## EXAMPLES

Restart kernel:
```
restart
```

## SEE ALSO

version(1), ps(1), cronlist(1)
