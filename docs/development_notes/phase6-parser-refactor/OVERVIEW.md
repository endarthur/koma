# Phase 6: Parser Refactoring & Exit Codes - Overview

**Status:** 🚧 In Planning
**Duration:** 5-6 weeks
**Start Date:** 2025-11-10
**Target Completion:** 2025-12-20

---

## Executive Summary

Phase 6 lays the architectural foundation for shell programming features (variables, conditionals, loops, functions). Before we can add these features in Phase 8, we must refactor the parser architecture and implement exit code infrastructure.

**Why this phase exists:** Our current string-based parser (excellent for Phase 5's pipes and redirects) won't scale to multi-line constructs like `if/then/fi` or `while/do/done`. We need to extract parsing logic into separate classes and add state management for variables and exit codes.

**Key Deliverables:**
1. Clean architecture: Lexer → Parser → Executor separation
2. All 44 commands return exit codes
3. `test`/`[` command for conditionals
4. Basic variable assignment and expansion
5. Testing infrastructure (60%+ coverage)

---

## Goals & Success Criteria

### Primary Goals

1. **Parser Refactoring**
   - Extract Lexer class (tokenization with types)
   - Extract Parser class (AST generation)
   - Extract Executor class (AST interpretation)
   - Multi-line input buffering

2. **Exit Code Infrastructure**
   - Track `lastExitCode` in Shell
   - All commands return 0 (success) or non-zero (error)
   - `$?` special variable

3. **Test Command**
   - File tests (`-f`, `-d`, `-e`)
   - String tests (`=`, `!=`, `-z`, `-n`)
   - Numeric tests (`-eq`, `-ne`, `-lt`, `-le`, `-gt`, `-ge`)
   - Returns 0 (true) or 1 (false)

4. **Variable Foundation**
   - VariableScope class
   - Variable assignment (`NAME=value`)
   - Variable expansion (`$VAR`, `${VAR}`)
   - Quote handling

5. **Testing Infrastructure**
   - Web Test Runner for integration tests
   - uvu for unit tests
   - 45+ test cases
   - GitHub Actions CI/CD
   - 60%+ coverage

### Success Criteria

At the end of Phase 6, these commands must work:

```bash
# Exit codes
ls ; echo $?                    # → 0
ls /nonexistent ; echo $?       # → non-zero

# Test command
[ -f /home/test.txt ] ; echo $? # → 0 if exists
[ 5 -lt 10 ] ; echo $?          # → 0 (true)
[ "foo" = "bar" ] ; echo $?     # → 1 (false)

# Variables
NAME=Koma
echo "Hello $NAME"              # → Hello Koma
COUNT=5
echo "Count is $COUNT"          # → Count is 5
echo $?                         # → 0
```

---

## Timeline (6 Weeks)

### Week 1: Parser Architecture Planning & Design
**Goal:** Design the new architecture without breaking existing functionality

- Review agent reports (parser-architecture.md, code-review.md)
- Design Lexer, Parser, Executor classes
- Plan AST node structure
- Document migration strategy
- Set up development branch

**Deliverables:**
- Architecture design document
- Class diagrams
- Migration plan
- Git branch created

### Week 2: Lexer & Parser Extraction
**Goal:** Extract parsing logic from Shell class

- Create `src/parser/lexer.js` (tokenization with types)
- Create `src/parser/parser.js` (AST generation)
- Create `src/parser/ast-nodes.js` (node definitions)
- Refactor existing `tokenize()` and `parsePipeline()`
- All existing tests still pass

**Deliverables:**
- Lexer class with token types
- Parser class generating simple AST
- Backward compatibility maintained
- Unit tests for lexer/parser

### Week 3: Executor & Exit Codes
**Goal:** Separate execution logic and add exit code tracking

- Create `src/executor/executor.js` (AST interpretation)
- Add `lastExitCode` to Shell class
- Update all 44 commands to return exit codes
- Add `$?` special variable
- Test exit code propagation through pipelines

**Deliverables:**
- Executor class executing AST
- All commands return exit codes
- `$?` variable working
- Exit code tests passing

### Week 4: Test Command & VariableScope
**Goal:** Implement test command and variable infrastructure

- Create `src/state/variable-scope.js` (variable management)
- Implement `test`/`[` command with all operators
- Add variable assignment detection
- Add variable expansion in lexer
- Handle quotes in expansion

**Deliverables:**
- VariableScope class with set/get/export
- Test command with all operators
- Basic variable assignment working
- Variable expansion working

### Week 5: Testing Infrastructure
**Goal:** Set up comprehensive testing

- Install Web Test Runner for integration tests
- Install uvu for unit tests
- Write 45+ test cases (parser, commands, VFS)
- Set up GitHub Actions CI/CD
- Configure coverage reporting

**Deliverables:**
- Testing infrastructure complete
- 45+ tests written and passing
- CI/CD pipeline running
- Coverage > 60%

### Week 6: Integration, Documentation & Polish
**Goal:** Finalize Phase 6 and prepare for Phase 8

- Test complex command combinations
- Fix edge cases and bugs
- Update man pages for new commands
- Update DEVELOPMENT.md with patterns
- Document lessons learned
- Phase 6 retrospective

**Deliverables:**
- All success criteria met
- Documentation updated
- Phase 6 complete and stable
- Ready for Phase 8 (conditionals/loops)

---

## Architecture Changes

### Current Architecture (Phase 5)

```
Shell.execute(line)
    ↓
tokenize(line) → ['cat', 'file.txt', '|', 'grep', 'foo']
    ↓
parsePipeline(tokens) → {stages: [...], redirects: {...}}
    ↓
executePipeline(pipeline) → run commands
```

**Problems:**
- No separation of concerns (parsing + execution mixed)
- Can't handle multi-line constructs
- No exit code tracking
- No variable storage
- No AST representation

### New Architecture (Phase 6)

```
Shell.execute(line)
    ↓
Lexer.tokenize(line) → [{type: 'WORD', value: 'cat'}, ...]
    ↓
Parser.parse(tokens) → AST (CommandNode, PipelineNode, etc.)
    ↓
VariableExpander.expand(ast, scope) → Expanded AST
    ↓
Executor.execute(ast, shell) → exit code
    ↓
Shell.lastExitCode = exitCode
```

**Benefits:**
- Clean separation: Lexer → Parser → Executor
- AST enables multi-line constructs (Phase 8)
- Exit codes tracked at every step
- Variables stored in VariableScope
- Testable components

### New Classes

1. **`src/parser/lexer.js`** (~150 lines)
   - `tokenize(input)` → Token[]
   - Token types: WORD, PIPE, REDIRECT, SEMICOLON, VARIABLE, etc.
   - Quote-aware, operator-aware

2. **`src/parser/parser.js`** (~400 lines)
   - `parse(tokens)` → AST
   - Generates CommandNode, PipelineNode, RedirectNode
   - Validates syntax

3. **`src/parser/ast-nodes.js`** (~200 lines)
   - Node classes: CommandNode, PipelineNode, etc.
   - Each node has `execute()` method

4. **`src/executor/executor.js`** (~300 lines)
   - `execute(ast, context)` → exit code
   - Walks AST and executes nodes
   - Handles pipes, redirects, exit codes

5. **`src/state/variable-scope.js`** (~150 lines)
   - `set(name, value)`, `get(name)`, `export(name)`
   - Special variables (`$?`, `$#`, `$@`)
   - Scope inheritance (for functions)

### Modified Classes

1. **`src/shell.js`** (shrinks from ~500 to ~250 lines)
   - Becomes orchestration layer only
   - Delegates to Lexer, Parser, Executor
   - Manages VariableScope
   - Tracks lastExitCode

2. **`src/commands/*.js`** (all commands)
   - Add `return 0` on success
   - Return error codes on failure
   - Use consistent error codes (1 = generic error, 127 = not found, etc.)

---

## Testing Strategy

### Unit Tests (uvu - fast, no browser)

**Target files:**
- Lexer (`tests/unit/parser/lexer.test.js`)
- Parser (`tests/unit/parser/parser.test.js`)
- VariableScope (`tests/unit/state/variable-scope.test.js`)
- Path utilities (`tests/unit/utils/path.test.js`)
- Argument parsing (`tests/unit/utils/args.test.js`)

**Coverage goal:** 80%+ for pure JavaScript

### Integration Tests (Web Test Runner - real browser)

**Target functionality:**
- Command execution with exit codes
- Pipelines with exit code propagation
- Variable assignment and expansion
- Test command with all operators
- VFS operations
- CommandContext in pipelines

**Coverage goal:** 60%+ overall

### Test Infrastructure

```bash
# Install dependencies
npm install

# Run all tests
npm test

# Run unit tests (fast)
npm run test:unit

# Run integration tests (browser)
npm run test:integration

# Watch mode for TDD
npm run test:watch

# Coverage report
npm run test:coverage
```

### CI/CD (GitHub Actions)

**On push to main/develop:**
1. Run unit tests
2. Run integration tests
3. Generate coverage report
4. Upload to Codecov
5. Fail if coverage < 60%

---

## Implementation Details

### Exit Code Standards

Follow POSIX exit code conventions:

- **0** - Success
- **1** - General error
- **2** - Misuse of shell command (syntax error)
- **126** - Command cannot execute (permission denied)
- **127** - Command not found
- **128+N** - Fatal error signal N (e.g., 130 = Ctrl+C)
- **255** - Exit code out of range

### Variable Expansion Rules

1. **Double quotes:** `"$VAR"` - expand variables
2. **Single quotes:** `'$VAR'` - no expansion
3. **Escaping:** `\$VAR` - no expansion
4. **Braces:** `${VAR}` - explicit variable name
5. **Undefined:** `$UNDEFINED` → empty string (POSIX behavior)

### Test Command Operators

**File tests:**
- `-f FILE` - Regular file exists
- `-d FILE` - Directory exists
- `-e FILE` - File exists (any type)
- `-r FILE` - Readable (future)
- `-w FILE` - Writable (future)
- `-x FILE` - Executable (future)

**String tests:**
- `STRING1 = STRING2` - Strings equal
- `STRING1 != STRING2` - Strings not equal
- `-z STRING` - String is empty
- `-n STRING` - String is not empty

**Numeric tests:**
- `N1 -eq N2` - Numbers equal
- `N1 -ne N2` - Numbers not equal
- `N1 -lt N2` - N1 less than N2
- `N1 -le N2` - N1 less than or equal to N2
- `N1 -gt N2` - N1 greater than N2
- `N1 -ge N2` - N1 greater than or equal to N2

---

## Risks & Mitigation

### Risk 1: Breaking Existing Functionality
**Probability:** High
**Impact:** High
**Mitigation:**
- Extract classes incrementally
- Keep existing code path working during refactor
- Comprehensive test coverage before changes
- Feature flags for new parser

### Risk 2: Parser Complexity Explosion
**Probability:** Medium
**Impact:** Medium
**Mitigation:**
- Start with simple AST (just pipelines)
- Add complexity incrementally
- Don't try to support all POSIX features now
- Focus on Phase 6 scope only

### Risk 3: Performance Degradation
**Probability:** Low
**Impact:** Medium
**Mitigation:**
- Benchmark current parser performance
- Profile new parser
- Keep fast path for simple commands
- No AST overhead for single commands

### Risk 4: Test Infrastructure Delays
**Probability:** Medium
**Impact:** Medium
**Mitigation:**
- Set up testing in Week 1 (not Week 5)
- Use TDD from start
- Start with manual tests if infrastructure delayed
- Prioritize integration tests over unit tests

---

## Dependencies & Prerequisites

### Must Complete Before Starting

1. ✅ Phase 5.6 complete (pipes and redirection)
2. ✅ Agent reports reviewed (all 4 agents)
3. ✅ Architecture design approved
4. ✅ Development branch created

### External Dependencies

- **Web Test Runner** - Integration testing (npm)
- **uvu** - Unit testing (npm)
- **Chai** - Assertions (npm)
- **Playwright** - Browser automation (npm)

**Note:** Only test dependencies, no production dependencies

---

## Detailed Technical Documentation

For deep technical details, see:

- **[Parser Architecture](./parser-architecture.md)** - Lexer/Parser/Executor design, algorithms, examples (~15K words)
- **[Code Review](./code-review.md)** - Refactoring plan, file structure, state management (~12K words)
- **[Testing Strategy](./testing-strategy.md)** - Test infrastructure, examples, CI/CD (~8K words)
- **[UNIX Review](./unix-review.md)** - POSIX compliance, best practices, Unix patterns (~10K words)

---

## Success Metrics

At Phase 6 completion:

**Quantitative:**
- [ ] 0 regressions in existing commands
- [ ] 44 commands return exit codes
- [ ] 45+ test cases passing
- [ ] 60%+ code coverage
- [ ] CI/CD pipeline green
- [ ] Parser code < 1000 lines total

**Qualitative:**
- [ ] Architecture is clean and maintainable
- [ ] Code is well-documented
- [ ] Tests are comprehensive
- [ ] No technical debt introduced
- [ ] Ready for Phase 8 (conditionals/loops)

**Functional:**
- [ ] Exit codes work in all contexts
- [ ] Test command passes all operator tests
- [ ] Variable assignment works
- [ ] Variable expansion works with quotes
- [ ] Pipelines work with exit codes
- [ ] All existing features still work

---

## Next Steps (After Phase 6)

Phase 6 prepares us for:

**Phase 7:** Spinifex Package Manager
- npm packages from CDN
- Import map manipulation
- Package caching

**Phase 8:** Shell Programming Features
- Conditionals (`if/then/else/fi`)
- Loops (`for/while/do/done`)
- Functions (`name() { ... }`)
- `break`, `continue`, `return`

Phase 6 provides the foundation: with exit codes and variables, we can implement conditionals. With the new parser architecture, we can handle multi-line constructs.

---

## Questions & Answers

**Q: Why not implement variables AND conditionals in one phase?**
A: Too risky. Variables require parser changes, exit code infrastructure, and testing. Adding conditionals on top would be 8-10 weeks of work with high regression risk. Better to do variables first, stabilize, then add conditionals.

**Q: Why spend time on testing infrastructure?**
A: Without tests, refactoring is dangerous. We're making major architectural changes. Tests give us confidence that nothing breaks. Plus, Phase 8 will need extensive testing for conditionals/loops.

**Q: Can we skip the parser refactoring?**
A: No. The current string-based parser can't handle multi-line constructs. `if/then/fi` requires reading multiple lines and deferring execution. We need an AST.

**Q: What if Week 1-2 takes longer?**
A: Parser refactoring is the critical path. If it takes 3-4 weeks, that's okay. Better to get the architecture right than rush. We can compress testing (Week 5) if needed.

**Q: Do we need ALL test operators in `test` command?**
A: No. File tests (`-f`, `-d`, `-e`) are critical. String/numeric tests can be added incrementally. But we should implement at least `-f` and `=` for Phase 6 success criteria.

---

## References

- [POSIX Shell Specification](https://pubs.opengroup.org/onlinepubs/9699919799/utilities/V3_chap02.html) - Official standard
- [dash Source Code](https://git.kernel.org/pub/scm/utils/dash/dash.git) - Minimal POSIX shell
- [mvdan/sh](https://github.com/mvdan/sh) - Go implementation with readable parser
- [Oil Shell Blog](https://www.oilshell.org/blog/) - Shell parsing deep dives

---

**Phase 6 Status:** 🚧 Ready to Begin
**Last Updated:** 2025-11-10
