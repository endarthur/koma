# Editor

**Domain**: `#editor`
**Related Domains**: `#ui`, `#vfs`, `#commands`

## Overview

CodeMirror 6 integration providing in-browser file editing via the `vein` command. Plain text editor with Koma theming, designed for scripting and configuration files.

## Features by Maturity

### ✅ Production

### CodeMirror 6 Integration
**Tags**: `#editor` `#production` `#high` `#core-feature`
**Status**: Stable, production-ready
**Phase**: 4
**Dependencies**: CodeMirror 6 (Skypack CDN), VFS
**Blocks**: File editing workflows

**Features**:
- CodeMirror 6 via import maps (Skypack CDN)
- Full-screen overlay (toggles with terminal)
- Koma-themed dark mode with orange accents
- IBM Plex Mono font (matches terminal)
- Smooth transition animations

**CDN Choice**: Skypack chosen over esm.sh for better dependency deduplication

**Files**: `src/ui/editor.js` (~400 lines)

### File Operations
**Tags**: `#editor` `#production` `#high` `#file-io`
**Status**: Complete save/load with VFS integration
**Phase**: 4
**Dependencies**: VFS
**Blocks**: None

**Features**:
- Open existing files from VFS
- Create new files seamlessly (handles ENOENT gracefully)
- Save files to VFS (Ctrl+S)
- Dirty state tracking (shows `[+]` for unsaved changes)
- Custom confirm modal for unsaved changes
- Koma-styled modals with keyboard navigation

**Files**: `src/ui/editor.js`

### Keyboard Shortcuts
**Tags**: `#editor` `#production` `#high` `#ux`
**Status**: Complete keyboard control
**Phase**: 4
**Dependencies**: None
**Blocks**: None

**Shortcuts**:
- **F2 or Ctrl+`** - Toggle between terminal and editor
- **Ctrl+S** - Save file
- **Esc** - Close editor (with unsaved changes prompt)
- **Ctrl+Z** - Undo
- **Ctrl+Shift+Z** - Redo
- **F12** - Open dev console (passthrough)

**Design Decision**: F2 as primary toggle because Ctrl+` doesn't work on international keyboard layouts (dead key issue).

**Files**: `src/ui/editor.js`, `src/terminal.js` (F12 passthrough)

### Undo/Redo Support
**Tags**: `#editor` `#production` `#high` `#editing`
**Status**: Complete with CodeMirror history extension
**Phase**: 4
**Dependencies**: CodeMirror history extension
**Blocks**: None

**Features**:
- Full undo/redo history
- Ctrl+Z for undo
- Ctrl+Shift+Z for redo
- History persists during editor session
- Cleared on file close

**Files**: `src/ui/editor.js` (history extension)

### vein Command
**Tags**: `#editor` `#production` `#high` `#command`
**Status**: Complete file opening command
**Phase**: 4
**Dependencies**: Editor module, VFS
**Blocks**: None

**Usage**:
```bash
vein file.txt          # Open existing file
vein new-file.js       # Create and edit new file
vein --help            # Show help
```

**Features**:
- Opens file in editor
- Creates new files if they don't exist
- Validates file path
- Returns to terminal on save/close

**Files**: `src/commands/filesystem.js` (vein command)

### 🔧 Working

None - editor is feature-complete for current scope!

### 🧪 Prototype

### Vim Mode
**Tags**: `#editor` `#prototype` `#medium` `#keybindings`
**Status**: Deferred due to CDN dependency conflicts
**Phase**: Future (requires bundler or dependency resolution)
**Dependencies**: @replit/codemirror-vim
**Blocks**: Vim keybindings in editor

**Issue**: `@replit/codemirror-vim` causes `@codemirror/state` duplication when loaded from CDN, breaking editor.

**Resolution Options**:
1. Wait for better CDN dependency resolution
2. Implement custom bundler setup (conflicts with vanilla-only constraint)
3. Implement minimal vim mode from scratch (low priority)

### Syntax Highlighting
**Tags**: `#editor` `#prototype` `#medium` `#ux`
**Status**: Deferred due to same CDN dependency conflicts
**Phase**: Future (requires bundler)
**Dependencies**: CodeMirror language extensions
**Blocks**: Code syntax highlighting

**Issue**: Language extensions cause `@codemirror/state` duplication, same as vim mode.

**Current**: Plain text editing only (acceptable for scripts and configs)

### Multi-File Editing
**Tags**: `#editor` `#prototype` `#low` `#ux`
**Status**: Not implemented
**Phase**: Future (Phase 12+)
**Dependencies**: Tab system in editor
**Blocks**: Editing multiple files without switching

**Planned**:
- Tabs within editor
- Switch between open files
- Dirty state per file
- Save all / close all

### Split Panes
**Tags**: `#editor` `#prototype` `#low` `#advanced`
**Status**: Not implemented
**Phase**: Future (Phase 12+)
**Dependencies**: Multi-file editing
**Blocks**: Side-by-side editing

**Planned**:
- Horizontal/vertical splits
- Resize panes
- Independent scroll
- Copy/paste between panes

## Architecture

### Editor Class

```javascript
class Editor {
  constructor(terminal) {
    this.terminal = terminal;
    this.editorView = null;
    this.currentFile = null;
    this.isDirty = false;
  }

  async open(filepath) {
    // Load file from VFS
    // Create CodeMirror view
    // Show editor overlay
  }

  save() {
    // Write to VFS
    // Clear dirty state
  }

  close() {
    // Prompt if dirty
    // Hide editor overlay
    // Return to terminal
  }

  toggle() {
    // F2/Ctrl+` handler
    // Switch between terminal and editor
  }
}
```

### CodeMirror Extensions

Currently loaded extensions:
- `basicSetup` - Essential features (line numbers, bracket matching, etc.)
- `EditorView.theme` - Koma dark theme
- `EditorState.create` - State management
- `history` - Undo/redo support
- `keymap` - Keyboard shortcuts

**Not loaded** (CDN conflicts):
- Language support (javascript, markdown, etc.)
- Vim mode (@replit/codemirror-vim)

### Modal System

Custom confirm modal for unsaved changes:
- Koma-styled (dark theme, orange accents)
- Keyboard navigation (Tab, Enter, Esc)
- Consistent with terminal aesthetic
- Accessible and user-friendly

## Related Files

**Source**:
- `src/ui/editor.js` - Editor class (~400 lines)
- `src/commands/filesystem.js` - vein command
- `styles/koma.css` - Editor styles, modal system

**Documentation**:
- `docs/man/filesystem/vein.1.md` - vein command man page

**Tests**:
- (Need integration tests for editor)

## Next Steps

**Short-term**:
- None - editor is stable for current needs

**Medium-term** (if CDN issues resolved):
- Add syntax highlighting for JavaScript, Markdown, Shell
- Implement vim mode

**Long-term** (Phase 12+):
- Multi-file editing with tabs
- Split panes for side-by-side editing
- Search and replace
- Code folding

## Notes

**Design Decision - F2 vs Ctrl+`**:
- Ctrl+` (backtick) is a dead key on ENG INTL keyboard layouts
- F2 works on all keyboard layouts
- Both shortcuts work, F2 is primary

**Design Decision - Manual Save**:
- No auto-save (explicit user control)
- Ctrl+S is universal save shortcut
- Dirty state indicator (`[+]`) shows unsaved changes
- Confirm modal prevents accidental data loss

**Design Decision - Esc to Close**:
- Ctrl+W closes browser tab (dangerous)
- Esc is safe and intuitive
- Prompts if unsaved changes exist

**Activity LED Integration**:
- Green pulse during file read
- Orange pulse during file save
- Visual feedback for all VFS operations

**Plain Text Only**:
- Currently acceptable for scripts and configs
- Syntax highlighting deferred due to CDN conflicts
- Future: Either resolve CDN issues or add bundler

---

**Last Updated**: 2025-11-16
**Maturity**: Production
**Priority**: High
