# NAME

cronrm - remove scheduled cron job

## SYNOPSIS

`cronrm <job_id>`

## DESCRIPTION

Remove a scheduled cron job by its job ID. The job will no longer execute.

Use `cronlist` to display all jobs and their IDs.

## EXAMPLES

Remove job with ID 1:
```
cronrm 1
```

List jobs and remove one:
```
cronlist
cronrm 3
```

## SEE ALSO

cron(1), cronlist(1), kill(1)
