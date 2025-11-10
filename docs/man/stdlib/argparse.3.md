# NAME

argparse - command-line argument parsing for Koma scripts

## SYNOPSIS

```javascript
// Available in scripts as 'argparse' module
const parsed = argparse.parse(args, {
  flags: {
    verbose: { short: 'v', description: 'Verbose output' }
  },
  options: {
    output: { short: 'o', description: 'Output file' }
  }
});

console.log('Verbose:', parsed.flags.verbose);
console.log('Output:', parsed.options.output);
```

## DESCRIPTION

The `argparse` module provides robust command-line argument parsing for Koma scripts. It supports boolean flags, options with values, positional arguments, combined short flags, and automatic help text generation.

This is the same module used by built-in Koma commands.

## SCHEMA FORMAT

Argument schemas define what arguments your script accepts:

```javascript
const schema = {
  description: 'Brief description of the script',

  flags: {
    flagName: {
      short: 'f',                  // Short form: -f
      description: 'Flag description'
    }
  },

  options: {
    optionName: {
      short: 'o',                  // Short form: -o
      description: 'Option description',
      default: 'defaultValue',     // Optional default
      choices: ['a', 'b', 'c']     // Optional allowed values
    }
  },

  positional: {
    description: '<input> [output]'  // Positional args format
  },

  examples: [
    { command: 'script.js input.txt', description: 'Process input.txt' }
  ],

  notes: [
    'Additional note 1',
    'Additional note 2'
  ],

  seeAlso: ['other-command', 'man page']
};
```

## FUNCTIONS

### argparse.parse(argv, schema)

Parse command-line arguments according to a schema.

**Parameters:**
- `argv` (Array\<string\>) - Arguments array (usually from `args` global)
- `schema` (object, optional) - Argument schema defining flags and options

**Returns:** object - Parsed arguments with properties:
- `flags` (object) - Boolean flags (true/false)
- `options` (object) - Options with values
- `positional` (array) - Positional arguments
- `_` (array) - Alias for positional
- `errors` (array) - Parsing errors (if any)

**Example:**
```javascript
const schema = {
  flags: {
    verbose: { short: 'v' },
    quiet: { short: 'q' }
  },
  options: {
    output: { short: 'o' },
    format: { short: 'f', choices: ['json', 'text'] }
  }
};

const parsed = argparse.parse(args, schema);

if (parsed.errors.length > 0) {
  parsed.errors.forEach(err => console.error('Error:', err));
  return;
}

if (parsed.flags.verbose) {
  console.log('Verbose mode enabled');
}

if (parsed.options.output) {
  console.log('Output to:', parsed.options.output);
}

console.log('Files:', parsed.positional);
```

### argparse.usage(commandName, schema)

Generate formatted usage text from a schema.

**Parameters:**
- `commandName` (string) - Name of the command/script
- `schema` (object) - Argument schema

**Returns:** Array\<string\> - Array of formatted lines

**Example:**
```javascript
const usage = argparse.usage('myscript', schema);
usage.forEach(line => console.log(line));
```

### argparse.hasHelp(argv)

Check if help flag is present (--help or -h).

**Parameters:**
- `argv` (Array\<string\>) - Arguments array

**Returns:** boolean - True if help flag present

**Example:**
```javascript
if (argparse.hasHelp(args)) {
  console.log('Help requested');
}
```

### argparse.showHelp(commandName, argv, schema, term)

Display help text if help flag is present. This is a convenience function used by built-in commands.

**Parameters:**
- `commandName` (string) - Command name
- `argv` (Array\<string\>) - Arguments array
- `schema` (object) - Argument schema
- `term` (object) - Terminal with writeln method (for internal use)

**Returns:** boolean - True if help was shown

**Note:** In scripts, use `hasHelp()` and `usage()` instead since you don't have access to the terminal object.

### argparse.hasFlag(argv, flag)

Quick check if a specific flag is present.

**Parameters:**
- `argv` (Array\<string\>) - Arguments array
- `flag` (string) - Flag name (with or without --)

**Returns:** boolean - True if flag present

**Example:**
```javascript
if (argparse.hasFlag(args, '--verbose')) {
  console.log('Verbose mode');
}
if (argparse.hasFlag(args, 'v')) {
  console.log('Short form -v present');
}
```

### argparse.getOption(argv, option, defaultValue)

Get value of a specific option.

**Parameters:**
- `argv` (Array\<string\>) - Arguments array
- `option` (string) - Option name (with or without --)
- `defaultValue` (any, optional) - Default if not present

**Returns:** any - Option value or default

**Example:**
```javascript
const output = argparse.getOption(args, 'output', 'default.txt');
console.log('Output file:', output);
```

## ARGUMENT FORMATS

### Boolean flags

```bash
script.js --verbose           # Long form
script.js -v                  # Short form
script.js -v --quiet          # Multiple flags
script.js -vq                 # Combined short flags
```

### Options with values

```bash
script.js --output=file.txt   # Long form with =
script.js --output file.txt   # Long form with space
script.js -o file.txt         # Short form with space
script.js -vo output.txt      # Combined flags + option
```

### Positional arguments

```bash
script.js file1.txt file2.txt    # Positional args
script.js -v file1.txt file2.txt # Flags + positional
```

### Stop parsing with --

```bash
script.js -- --not-a-flag     # Everything after -- is positional
```

## COMPLETE EXAMPLES

### Simple script with flags

```javascript
// myscript.js - Count lines in files
const schema = {
  description: 'Count lines in files',
  flags: {
    verbose: { short: 'v', description: 'Show detailed output' },
    total: { short: 't', description: 'Show total only' }
  },
  positional: { description: '<file> [files...]' },
  examples: [
    { command: 'myscript.js file.txt', description: 'Count lines in file' },
    { command: 'myscript.js -v *.txt', description: 'Verbose output' }
  ]
};

// Show help if requested
if (argparse.hasHelp(args)) {
  const usage = argparse.usage('myscript.js', schema);
  usage.forEach(line => console.log(line));
  return;
}

// Parse arguments
const parsed = argparse.parse(args, schema);

if (parsed.errors.length > 0) {
  parsed.errors.forEach(err => console.error('Error:', err));
  return;
}

if (parsed.positional.length === 0) {
  console.error('Error: No files specified');
  return;
}

// Process files
let totalLines = 0;
for (const file of parsed.positional) {
  const content = await fs.readFile(file);
  const lines = content.split('\n').length;
  totalLines += lines;

  if (!parsed.flags.total) {
    console.log(`${lines} ${file}`);
  }
}

if (parsed.flags.verbose || parsed.flags.total) {
  console.log(`Total: ${totalLines} lines`);
}
```

### Script with options and validation

```javascript
// converter.js - Convert file formats
const schema = {
  description: 'Convert file between formats',
  flags: {
    force: { short: 'f', description: 'Overwrite existing files' }
  },
  options: {
    format: {
      short: 'F',
      description: 'Output format',
      choices: ['json', 'yaml', 'toml'],
      default: 'json'
    },
    output: {
      short: 'o',
      description: 'Output file'
    }
  },
  positional: { description: '<input>' },
  examples: [
    { command: 'converter.js data.yaml', description: 'Convert to JSON' },
    { command: 'converter.js -F yaml data.json', description: 'Convert to YAML' },
    { command: 'converter.js -o out.json data.yaml', description: 'Specify output' }
  ]
};

if (argparse.hasHelp(args)) {
  argparse.usage('converter.js', schema).forEach(line => console.log(line));
  return;
}

const parsed = argparse.parse(args, schema);

// Check for errors (includes validation of choices)
if (parsed.errors.length > 0) {
  parsed.errors.forEach(err => console.error(err));
  return;
}

// Validate required arguments
if (parsed.positional.length === 0) {
  console.error('Error: Input file required');
  return;
}

const input = parsed.positional[0];
const format = parsed.options.format;
const output = parsed.options.output || input.replace(/\.\w+$/, `.${format}`);

console.log(`Converting ${input} to ${format} format...`);
console.log(`Output: ${output}`);

// Check if output exists
if (await fs.exists(output) && !parsed.flags.force) {
  console.error(`Error: ${output} exists. Use --force to overwrite.`);
  return;
}

// Conversion logic would go here...
```

### Using quick parse functions

```javascript
// Simple flag checking without full parsing
if (argparse.hasFlag(args, 'help')) {
  console.log('Usage: script.js [options] <files...>');
  return;
}

const verbose = argparse.hasFlag(args, 'verbose');
const output = argparse.getOption(args, 'output', 'default.txt');

if (verbose) {
  console.log(`Output file: ${output}`);
}
```

## NOTES

- All flags are optional and default to false
- Options can have default values and validation via choices
- Combined short flags like `-abc` expand to `-a -b -c`
- Last character in combined flags can be an option: `-vo file.txt` = `-v -o file.txt`
- Use `--` to stop parsing flags (everything after is positional)
- Schema is optional - parse() works without one for simple cases
- Error checking is important - always check `parsed.errors.length`

## SEE ALSO

run(1), env(1), echo(1)
