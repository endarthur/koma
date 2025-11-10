# Koma Test Coverage Plan

**Status:** In Progress
**Current Coverage:** 12/37 passing, ~50% code coverage
**Target Coverage:** 80-90% with comprehensive feature tests

## Testing Infrastructure ✅

**Working:**
- ✅ Bun + uvu for unit tests
- ✅ Web Test Runner + Playwright for integration tests
- ✅ Full Chromium browser environment (IndexedDB, Workers, localStorage)
- ✅ VFS test helpers (isolated databases)
- ✅ Shell test helpers (mock terminals)

## Current Test Status

### ✅ Already Tested
- **Shell Parser** - 33/33 unit tests passing
- **ls command** - 9/9 integration tests passing (1 minor fix needed)

### ❌ Premature Tests (Phase 6 - Not Implemented)
- **Variables** - 24 tests for unimplemented features
  - Variable assignment (VAR=value)
  - Variable expansion ($VAR, ${VAR})
  - Export command
  - Special variables ($?)
  - **Action:** Mark as `.skip()` until Phase 6

## Priority Test Plan

### 🔴 **Tier 1: Critical (Must Test First)**

**Priority: 10/10 - Core functionality that everything depends on**

#### VFS Operations (tests/integration/vfs/)
**File:** `vfs-operations.test.js` (~150 tests)
- mkdir: Create directories, nested paths, EEXIST errors
- touch: Create files, update timestamps
- rm: Delete files/dirs, recursive (-r), force (-f)
- cp: Copy files/dirs, recursive, overwrite
- mv: Move/rename files/dirs, overwrite
- write: Write content to files
- readFile: Read file contents
- stat: File metadata and types
- readdir: List directory contents

**Why Critical:** All commands depend on VFS working correctly.

#### Pipes & Redirection (tests/integration/shell/)
**File:** `pipes-redirection.test.js` (~40 tests)
- Simple pipes: `cat file.txt | grep pattern`
- Multi-stage pipes: `cat | grep | sort | uniq`
- Output redirect: `echo hello > file.txt`
- Append redirect: `echo world >> file.txt`
- Input redirect: `grep pattern < file.txt`
- Stderr redirect: `command 2> errors.txt`
- Combined: `cmd 2>&1 | grep error`
- Error propagation through pipes

**Why Critical:** Phase 5.6 feature, completely untested, affects many commands.

#### File Reading Commands (tests/integration/commands/)
**File:** `file-reading.test.js` (~30 tests)
- cat: Single file, multiple files, concatenation, errors
- head: First N lines (-n flag), default 10
- tail: Last N lines (-n flag), default 10
- wc: Line/word/char counts (-l, -w, -c), multiple files
- stat: File/dir metadata, formatting

**Why Critical:** Used constantly, depend on VFS.

### 🟡 **Tier 2: High Value (Test Next)**

**Priority: 8/10 - Complex features that users rely on**

#### Text Processing (tests/integration/commands/)
**File:** `text-processing.test.js` (~50 tests)
- grep: Pattern matching, -i (case insensitive), -v (invert), -n (line numbers)
- find: Name patterns, directory traversal, -type f/d
- sort: Alphabetic, numeric (-n), reverse (-r)
- uniq: Dedupe, count (-c), duplicates only (-d)
- tee: Write to file and stdout, append (-a)

**Why High Value:** Complex algorithms, many edge cases, used in pipelines.

#### Navigation & Display (tests/integration/commands/)
**File:** `navigation.test.js` (~25 tests)
- cd: Absolute paths, relative paths, .., ~, -, error handling
- pwd: Simple output, piped output
- tree: Directory visualization, depth, hidden files
- ls: Already tested, ensure coverage is complete

**Why High Value:** Used constantly, path logic is complex.

#### Shell Commands (tests/integration/commands/)
**File:** `shell-commands.test.js` (~20 tests)
- echo: Simple text, with pipes, with redirects
- env: Environment display, piped output
- help: Command listing, categories
- clear: Terminal clearing (hard to test)
- history: Command list, persistence

**Why High Value:** Core shell functionality.

### 🟢 **Tier 3: Moderate (Test When Stable)**

**Priority: 6/10 - Advanced features**

#### Process Management (tests/integration/shell/)
**File:** `processes.test.js` (~30 tests)
- sh: Script execution, exit codes, output
- run: Background execution, process IDs
- ps: Process listing, status
- kill: Terminate processes, error handling

**Why Moderate:** Complex async behavior, harder to test reliably.

#### Cron Scheduling (tests/integration/shell/)
**File:** `cron.test.js` (~20 tests)
- cron: Schedule jobs, syntax validation
- cronlist: List active jobs
- cronrm: Remove jobs
- Time-based execution (with sinon.useFakeTimers)

**Why Moderate:** Time-based testing is complex but doable.

#### Man Pages (tests/integration/commands/)
**File:** `man.test.js` (~15 tests)
- man: Page lookup, rendering, sections
- Error handling for missing pages
- Paging behavior

**Why Moderate:** Simple lookup, mainly testing data.

### 🔵 **Tier 4: Complex/Low Priority**

**Priority: 4/10 - Complex or less critical**

#### Editor (tests/integration/commands/)
**File:** `vein.test.js` (~20 tests)
- vein: Open files, create new files
- Basic editing operations
- Save and close
- Error handling

**Why Low:** Complex CodeMirror integration, UI-heavy.

#### wget (tests/integration/commands/)
**File:** `wget.test.js` (~15 tests)
- URL fetching with mocked fetch
- File saving
- Error handling

**Why Low:** Requires network mocking, less critical.

#### Tab Management (tests/integration/ui/)
**File:** `tab-manager.test.js` (~25 tests)
- Tab creation/deletion
- Tab switching
- Tab persistence to localStorage
- Tab restoration
- .komarc execution

**Why Low:** UI-heavy, complex DOM testing, works in practice.

## Test Count Estimate

| Tier | Category | Est. Tests | Priority |
|------|----------|------------|----------|
| 1 | VFS Operations | 150 | 🔴 Critical |
| 1 | Pipes & Redirection | 40 | 🔴 Critical |
| 1 | File Reading | 30 | 🔴 Critical |
| 2 | Text Processing | 50 | 🟡 High |
| 2 | Navigation | 25 | 🟡 High |
| 2 | Shell Commands | 20 | 🟡 High |
| 3 | Process Management | 30 | 🟢 Moderate |
| 3 | Cron | 20 | 🟢 Moderate |
| 3 | Man Pages | 15 | 🟢 Moderate |
| 4 | Editor | 20 | 🔵 Low |
| 4 | wget | 15 | 🔵 Low |
| 4 | Tab Manager | 25 | 🔵 Low |
| **TOTAL** | | **~440 tests** | |

**Current:** 37 tests (33 unit + 4 integration working)
**After Tier 1:** ~260 tests
**After Tier 2:** ~355 tests
**After All:** ~477 tests

## Expected Coverage After Each Tier

| After Tier | Coverage | Commands Tested |
|------------|----------|-----------------|
| Current | ~50% | 1/38 (ls) |
| Tier 1 | ~65% | 8/38 |
| Tier 2 | ~80% | 18/38 |
| Tier 3 | ~85% | 28/38 |
| Tier 4 | ~90% | 35/38 |

## Untestable/Not Worth Testing

- Service worker registration lifecycle (integration test in practice)
- Initial page hydration
- xterm.js internals
- CodeMirror internals

## Testing Strategy

### Unit Tests (uvu)
- Shell parser (✅ complete)
- Argument parsing
- Path utilities
- Pure functions

### Integration Tests (Web Test Runner)
- Command execution end-to-end
- VFS operations
- Pipes and redirection
- Process management
- Real browser environment

### Test Helpers
- ✅ `createTestVFS()` - Isolated VFS instances
- ✅ `createMockShell()` - Shell with mock terminal
- ✅ `populateTestFixtures()` - Create test files
- ❌ Need: `createMockNetwork()` - For wget
- ❌ Need: `withFakeTimers()` - For cron

## Implementation Approach

### Option 1: Manual (Slow but thorough)
Write tests file-by-file following priority order.

### Option 2: Agent-Assisted (Recommended)
Use Task tool to spawn testing agents for each tier:
- Agent 1: VFS Operations (Tier 1)
- Agent 2: Pipes & Redirection (Tier 1)
- Agent 3: File Reading (Tier 1)
- Agent 4: Text Processing (Tier 2)
- etc.

Agents work in parallel, dramatically faster completion.

### Option 3: Hybrid
Critical tests (Tier 1) manually, rest agent-assisted.

## Success Criteria

✅ **Tier 1 Complete:**
- All VFS operations tested
- Pipes & redirection fully covered
- File reading commands tested
- 0 regressions in core functionality
- ~65% code coverage

✅ **Tier 2 Complete:**
- All text processing tested
- Navigation fully covered
- Shell commands tested
- ~80% code coverage

✅ **All Tiers Complete:**
- ~440 tests passing
- ~90% code coverage
- Regression protection for all features
- CI/CD confidence

## Next Steps

1. ✅ Analyze testability → **DONE**
2. ✅ Create test plan → **DONE**
3. ⏳ Get user approval on approach
4. 🔄 Implement Tier 1 tests (VFS, pipes, file reading)
5. 🔄 Implement Tier 2 tests (text processing, navigation, shell)
6. 🔄 Implement Tier 3 tests (processes, cron, man)
7. 🔄 (Optional) Implement Tier 4 tests (editor, wget, tabs)

## Questions for User

1. Should we proceed with comprehensive testing now?
2. Prefer manual or agent-assisted approach?
3. Should we skip/postpone Tier 4 (complex UI tests)?
4. Should we mark Phase 6 variable tests as `.skip()` for now?
