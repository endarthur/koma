# NAME

run - execute JavaScript file as a process

## SYNOPSIS

`run <script> [args...]`

## DESCRIPTION

Execute a JavaScript file in the Olivine kernel. The script runs with access to the Koma standard library and can receive command-line arguments.

Scripts have access to:
- **args** - Command-line arguments array
- **env** - Environment variables object
- **console** - Console for stdout/stderr (log, error)
- **fs** - Filesystem module (readFile, writeFile, mkdir, etc.)
- **http** - HTTP module (get, post, json, text)
- **notify** - Notifications module
- **path** - Path utilities (join, resolve, dirname, etc.)
- **argparse** - Argument parsing (parse, usage, hasFlag, etc.)

## EXAMPLES

Run a script:
```
run /home/hello.js
```

Run with arguments:
```
run script.js arg1 arg2
```

Example script (/home/hello.js):
```
console.log('Hello from Koma!');
console.log('Arguments:', args);
console.log('Home directory:', env.HOME);

const files = await fs.readdir(env.HOME);
console.log('Files in home:', files);
```

## SEE ALSO

ps(1), kill(1), cron(1)
