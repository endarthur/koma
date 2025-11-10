# NAME

kill - terminate a process

## SYNOPSIS

`kill <pid>`

## DESCRIPTION

Terminate a running process by its process ID (PID). The process is immediately stopped and marked as killed.

Use the `ps` command to list running processes and their PIDs.

## EXAMPLES

Kill process 123:
```
kill 123
```

List processes to find PID:
```
ps
kill 456
```

## SEE ALSO

ps(1), run(1), cron(1)
