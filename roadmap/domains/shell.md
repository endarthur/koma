# Shell

**Domain**: `#shell`
**Related Domains**: `#commands`, `#processes`, `#ui`

## Overview

The shell parser and execution environment. Evolving from Thompson Shell (1971) → Bourne Shell (1977) → POSIX sh (dash) compatibility through iterative development.

## Features by Maturity

### ✅ Production

#### AST-Based Parser
**Tags**: `#shell` `#production` `#critical` `#parser`
**Status**: Complete refactoring from string-based to AST
**Phase**: 6
**Dependencies**: None
**Blocks**: Advanced shell features (conditionals, loops, functions)

**Architecture**:
- **Lexer**: Tokenizes input into tokens (words, operators, keywords)
- **Parser**: Builds Abstract Syntax Tree from tokens
- **Executor**: Executes AST nodes (commands, pipelines, sequences)

**Node Types**:
- Command (simple command with args)
- Pipeline (chained with |)
- Sequence (separated with ;)
- Redirect (>, >>, <)
- Assignment (VAR=value)
- LogicalAnd (&&)
- LogicalOr (||)

**Files**: `src/parser/lexer.js`, `src/parser/parser.js`, `src/parser/executor.js`, `src/parser/ast-nodes.js`

#### Pipes and Redirection
**Tags**: `#shell` `#production` `#critical` `#composition`
**Status**: Full Unix-style pipe and redirect support
**Phase**: 5.6
**Dependencies**: CommandContext abstraction
**Blocks**: None

**Features**:
- **Pipeline**: `cmd1 | cmd2 | cmd3` - Chain commands
- **Output redirect**: `cmd > file` - Overwrite file
- **Append redirect**: `cmd >> file` - Append to file
- **Input redirect**: `cmd < file` - Read from file
- **Command separator**: `cmd1 ; cmd2` - Sequential execution

**Examples**:
```bash
cat file.txt | grep error | sort > errors.txt
ls | tee files.txt | wc -l
find /usr -name "*.md" | grep man
```

**Files**: `src/parser/executor.js`, `src/utils/command-context.js`

#### Exit Codes
**Tags**: `#shell` `#production` `#critical` `#error-handling`
**Status**: Complete infrastructure with $? support
**Phase**: 6
**Dependencies**: Parser refactoring
**Blocks**: Conditional execution (&&, ||)

**Features**:
- Commands return exit codes (0 = success, non-zero = failure)
- `$?` variable captures last exit code
- `exit N` command to set exit code
- Logical operators use exit codes (&&, ||)

**Files**: `src/shell.js`, `src/parser/executor.js`, all command implementations

#### Variables
**Tags**: `#shell` `#production` `#high` `#scripting`
**Status**: Assignment and expansion complete
**Phase**: 6
**Dependencies**: Parser refactoring
**Blocks**: Shell scripting, conditionals

**Features**:
- **Assignment**: `NAME=value` (no export yet)
- **Expansion**: `$NAME` and `${NAME}`
- **Special variables**: `$?` (exit code)
- Environment variables passed to processes

**Deferred**:
- `$0-$9`, `$@`, `$#` (positional parameters) - Phase 8
- `export` builtin - Phase 8

**Files**: `src/parser/executor.js`, `src/shell.js`

#### Logical Operators
**Tags**: `#shell` `#production` `#high` `#control-flow`
**Status**: && and || implemented
**Phase**: 6
**Dependencies**: Exit codes
**Blocks**: None

**Features**:
- **AND**: `cmd1 && cmd2` - Run cmd2 only if cmd1 succeeds
- **OR**: `cmd1 || cmd2` - Run cmd2 only if cmd1 fails
- Short-circuit evaluation

**Examples**:
```bash
test -f file.txt && cat file.txt
mkdir dir || echo "Failed to create directory"
```

**Files**: `src/parser/executor.js`

#### Quote-Aware Parsing
**Tags**: `#shell` `#production` `#high` `#parsing`
**Status**: Complete string handling
**Phase**: 5
**Dependencies**: None
**Blocks**: None

**Features**:
- Double quotes: `"quoted string"` - Preserves spaces
- Single quotes: `'literal string'` - No variable expansion (future)
- Escaped quotes within strings
- Semicolons in strings don't split commands

**Files**: `src/parser/lexer.js`

#### Interactive Input API
**Tags**: `#shell` `#production` `#high` `#interactive`
**Status**: Complete promise-based readLine API
**Phase**: 6.5
**Dependencies**: None
**Blocks**: Schist REPL, interactive commands

**Features**:
- `shell.readLine(prompt)` returns Promise
- Ctrl+C cancels and returns null
- Input mode routing (normal vs command-read)
- Available via `context.readLine()`
- Blocked in piped contexts

**Use Cases**:
- Schist REPL (future)
- Interactive scripts
- Configuration wizards

**Files**: `src/shell.js`, `src/ui/tab-manager.js`, `src/utils/command-context.js`

### 🔧 Working

#### POSIX sh Scripting Features
**Tags**: `#shell` `#working` `#critical` `#scripting`
**Status**: In progress (Phase 8)
**Phase**: 8 (current focus)
**Dependencies**: Parser, variables, exit codes (✅ complete)
**Blocks**: Full shell scripting capability

**Planned**:
- **Conditionals**:
  - `if [ condition ]; then ... fi`
  - `if ... then ... else ... fi`
  - `if ... then ... elif ... else ... fi`
- **Loops**:
  - `for var in list; do ... done`
  - `while [ condition ]; do ... done`
  - `break` and `continue`
- **Functions**:
  - `name() { commands; }`
  - Local variables
  - Return values
- **Test Command** (`[` builtin):
  - File tests: `[ -f file ]`, `[ -d dir ]`, `[ -e path ]`
  - String tests: `[ "$a" = "$b" ]`, `[ -z "$str" ]`, `[ -n "$str" ]`
  - Numeric tests: `[ "$a" -eq "$b" ]`, `[ "$a" -gt "$b" ]`

**Impact**: 80% of real-world shell scripts would work

**Files**: `src/parser/parser.js`, `src/parser/executor.js`, new test command

#### Positional Parameters
**Tags**: `#shell` `#working` `#high` `#scripting`
**Status**: Deferred from Phase 6 to Phase 8
**Phase**: 8
**Dependencies**: Shell scripting foundation
**Blocks**: Script argument handling

**Planned**:
- `$0` - Script name
- `$1`, `$2`, ... `$9` - Arguments
- `$@` - All arguments
- `$#` - Argument count
- `shift` command

### 🧪 Prototype

#### Advanced Parser Features
**Tags**: `#shell` `#prototype` `#medium` `#parser`
**Status**: Planned for Phase 10
**Phase**: 10
**Dependencies**: POSIX scripting features
**Blocks**: Advanced shell capabilities

**Planned**:
- **Heredocs**: `<< EOF` - Multi-line input
- **Command substitution**: `$(cmd)` and `` `cmd` `` - Embed command output
- **Arithmetic expansion**: `$((expr))` - Integer math
- **Glob expansion**: `*.txt` - Wildcard matching
- **Parameter expansion**: `${var:-default}`, `${var#pattern}`
- **Tilde expansion**: `~/file` (partial support via cd ~)

#### Export and Environment
**Tags**: `#shell` `#prototype` `#medium` `#environment`
**Status**: Planned for Phase 8
**Phase**: 8
**Dependencies**: Variables (✅ complete)
**Blocks**: Environment variable management

**Planned**:
- `export VAR` - Export to environment
- `unset VAR` - Remove variable
- `.` / `source` command - Source files
- `CDPATH` - cd search path (low priority)
- `IFS` - Field separator (low priority)

#### Subshells and Grouping
**Tags**: `#shell` `#prototype` `#low` `#advanced`
**Status**: Planned for Phase 10+
**Phase**: 10+
**Dependencies**: Command substitution
**Blocks**: Advanced scripting

**Planned**:
- Subshells: `(cmd)` - Isolated environment
- Command grouping: `{ cmd1; cmd2; }` - Group in current shell

## Current Shell Level

**Thompson Shell (1971)**: ✅ Complete
- Basic commands
- Pipes and redirection
- Simple execution

**Bourne Shell (1977)**: 🔧 In Progress
- Variables ✅
- Exit codes ✅
- Logical operators ✅
- Conditionals 🔧 (working on it)
- Loops 🔧
- Functions 🔧

**POSIX sh (dash)**: 🧪 Target
- All Bourne features
- Test command
- Full parameter expansion
- Glob expansion
- ~90% script compatibility

## Architecture

### Parser Pipeline

```
Input String
    ↓
┌──────────┐
│  Lexer   │ → Tokens (WORD, PIPE, SEMI, GT, LT, etc.)
└────┬─────┘
     ↓
┌──────────┐
│  Parser  │ → AST (Command, Pipeline, Sequence nodes)
└────┬─────┘
     ↓
┌──────────┐
│ Executor │ → Execute nodes, return exit code
└──────────┘
```

### Execution Context

```
Shell
  ↓
CommandContext (stdin/stdout abstraction)
  ↓
Command Implementation
  ↓
Kernel API
```

## Related Files

**Source**:
- `src/shell.js` - Shell class, main execution loop (~400 lines)
- `src/parser/lexer.js` - Tokenization (~200 lines)
- `src/parser/parser.js` - AST construction (~300 lines)
- `src/parser/executor.js` - AST execution (~400 lines)
- `src/parser/ast-nodes.js` - AST node definitions (~100 lines)
- `src/utils/command-context.js` - Context abstraction (~150 lines)

**Documentation**:
- `docs/development_notes/phase6-parser-refactor/OVERVIEW.md` - Parser refactoring details
- `docs/development_notes/phase6-parser-refactor/SUMMARY.md` - Quick reference

**Tests**:
- `tests/integration/shell/pipes-redirection.test.js` - Pipeline tests
- `tests/integration/commands/schist-interactive.test.js` - Interactive input tests

## Next Steps

**Immediate** (Phase 8):
1. Implement `test` / `[` command for conditionals
2. Add `if/then/else/fi` parsing and execution
3. Add `for` and `while` loops
4. Implement functions

**Short-term** (Phase 8 Extended):
- Positional parameters (`$0-$9`, `$@`, `$#`)
- `export` and environment management
- `. / source` command
- `case` statements

**Medium-term** (Phase 10):
- Heredocs (`<< EOF`)
- Command substitution (`$(cmd)`)
- Arithmetic expansion (`$((expr))`)
- Glob expansion (`*.txt`)

## Notes

**Schist Lisp**: A Lisp interpreter is implemented in Phase 6 (`src/parser/schist.js`) as a proof-of-concept for the AST parser. Can execute Lisp s-expressions. Demonstrates parser extensibility.

**Design Philosophy**: Incremental evolution through well-defined shell levels (Thompson → Bourne → POSIX), not trying to implement bash/zsh. Focus on compatibility with simple automation scripts.

---

**Last Updated**: 2025-11-16
**Maturity**: Working (60% to POSIX sh)
**Priority**: Critical
