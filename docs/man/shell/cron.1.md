# NAME

cron - schedule periodic script execution

## SYNOPSIS

`cron <schedule> <script>`

## DESCRIPTION

Schedule a JavaScript file to run periodically based on a cron expression. Jobs continue running across sessions.

## SCHEDULE FORMAT

Five fields: **minute hour day month weekday**

- ***** - Any value (matches all)
- ****/N** - Every N (e.g., */5 = every 5 minutes)
- **N-M** - Range from N to M
- **N,M,P** - List of specific values

Field ranges:
- minute: 0-59
- hour: 0-23
- day: 1-31
- month: 1-12
- weekday: 0-6 (0 = Sunday)

## EXAMPLES

Every 5 minutes:
```
cron "*/5 * * * *" /home/backup.js
```

Every 2 hours:
```
cron "0 */2 * * *" /home/check.js
```

9:30 AM on weekdays:
```
cron "30 9 * * 1-5" /home/work.js
```

First day of each month:
```
cron "0 0 1 * *" /home/monthly.js
```

## SEE ALSO

cronlist(1), cronrm(1), run(1)
