# UI (User Interface)

**Domain**: `#ui`
**Related Domains**: `#shell`, `#editor`, `#boot`

## Overview

Terminal interface using xterm.js with multi-tab support, status bar, and industrial minimalism aesthetic. Provides the visual foundation for all user interactions.

## Features by Maturity

### ✅ Production

#### xterm.js Terminal Emulation
**Tags**: `#ui` `#production` `#critical` `#terminal`
**Status**: Stable, production-ready
**Phase**: 1, 2
**Dependencies**: xterm.js (CDN)
**Blocks**: All terminal interactions

**Features**:
- VT100-compatible terminal emulation
- ANSI 256-color support
- Unicode character support
- Box drawing characters
- Bold/dim text styles
- Text selection and copy/paste

**Configuration**:
- 13px IBM Plex Mono font
- 50-line scrollback buffer
- Dark theme (deep charcoal background)
- Cursor style: block (blinking)

**Files**: `src/terminal.js`, `index.html` (xterm.js import)

#### Multi-Tab Shell Sessions
**Tags**: `#ui` `#production` `#critical` `#tabs`
**Status**: Complete with persistence
**Phase**: 2
**Dependencies**: Tab manager, localStorage
**Blocks**: None

**Features**:
- Create tabs (click [+] button)
- Switch tabs (click tab name)
- Close tabs (`exit` command)
- Each tab has independent: cwd, history, current line, shell state
- Tab persistence via localStorage
- Restore tabs on page reload
- Active tab tracking

**Limitation**: No keyboard shortcuts (all browser combos conflict)

**Solution**: Ctrl+K command mode (tmux-style, implemented in Phase 6)

**Files**: `src/ui/tab-manager.js` (~600 lines)

#### Status Bar
**Tags**: `#ui` `#production` `#high` `#status`
**Status**: Complete with cwd display
**Phase**: 2
**Dependencies**: Shell state
**Blocks**: None

**Features**:
- Shows current working directory
- Updates on `cd` command
- Bottom-aligned, subtle styling
- Consistent with industrial aesthetic

**Planned Enhancements**:
- Git branch (if VFS supports .git)
- Background job count
- System status indicators

**Files**: `src/terminal.js`, `src/ui/tab-manager.js`, `styles/koma.css`

#### Activity LED
**Tags**: `#ui` `#production` `#high` `#feedback`
**Status**: Complete visual feedback system
**Phase**: 4
**Dependencies**: VFS operations
**Blocks**: None

**Features**:
- 3px vertical bar on tab bar's right edge
- **States**:
  - Idle: Transparent (invisible)
  - Reading: Green pulse (filesystem reads)
  - Writing: Orange pulse (filesystem writes)
  - Error: Orange flash 3x (operation failed)
- Industrial aesthetic (like HDD LEDs)
- Peripheral vision feedback
- Non-intrusive positioning
- Satisfying to watch during operations

**Files**: `src/ui/activity-led.js` (~150 lines), `styles/koma.css`

#### Terminal Copy/Paste
**Tags**: `#ui` `#production` `#high` `#ux`
**Status**: Complete with right-click context
**Phase**: 4
**Dependencies**: xterm.js selection
**Blocks**: None

**Features**:
- Right-click to copy (if selection exists)
- Right-click to paste (if no selection)
- Works with system clipboard
- Respects terminal selection

**Files**: `src/ui/tab-manager.js` (context menu handler)

#### Tab Completion
**Tags**: `#ui` `#production` `#high` `#ux`
**Status**: Complete with nested path support
**Phase**: 4
**Dependencies**: VFS
**Blocks**: None

**Features**:
- Tab to auto-complete commands
- Tab to auto-complete file/directory paths
- Supports nested paths
- Handles `..` (parent directory) properly
- 150ms debounce to prevent VFS spam
- Cycles through matches on repeated Tab

**Files**: `src/ui/tab-manager.js` (tab completion logic)

#### Command History
**Tags**: `#ui` `#production` `#high` `#ux`
**Status**: Complete with up/down arrow navigation
**Phase**: 2
**Dependencies**: Shell history tracking
**Blocks**: None

**Features**:
- Up arrow: Previous command
- Down arrow: Next command
- History persists with tabs
- Per-tab history (each tab has own history)
- Saved to localStorage

**Files**: `src/ui/tab-manager.js`, `src/shell.js`

#### Keyboard Shortcuts
**Tags**: `#ui` `#production` `#high` `#ux`
**Status**: Complete essential shortcuts
**Phase**: 2, 4, 6
**Dependencies**: None
**Blocks**: None

**Shortcuts**:
- **Enter** - Execute command
- **Backspace** - Delete character
- **Ctrl+C** - Cancel current line
- **Ctrl+L** - Clear screen (via ANSI codes)
- **Up/Down** - Navigate history
- **Tab** - Auto-complete
- **F2 or Ctrl+`** - Toggle terminal ↔ editor
- **Right-click** - Copy/paste
- **F12** - Open dev console (passthrough)
- **Ctrl+K** - Command mode (tmux-style, Phase 6)

**Files**: `src/ui/tab-manager.js`, `src/terminal.js`

### 🔧 Working

#### Theme System
**Tags**: `#ui` `#working` `#medium` `#customization`
**Status**: Partial implementation
**Phase**: 1, ongoing
**Dependencies**: CSS custom properties
**Blocks**: User theme customization

**Current State**:
- Single theme: Industrial Minimalism (dark mode)
- CSS custom properties defined
- Colors: Deep charcoal, phosphor green, lava orange
- IBM Plex Mono font

**Planned**:
- Multiple theme options (solarized, terminal-green, etc.)
- `theme` command to switch themes
- Theme persistence
- Custom color schemes

**Files**: `styles/koma.css` (CSS custom properties)

#### Terminal Customization
**Tags**: `#ui` `#working` `#medium` `#ux`
**Status**: Limited customization options
**Phase**: Future
**Dependencies**: Configuration system
**Blocks**: User preferences

**Planned**:
- Font size adjustment
- Scrollback buffer size
- Cursor style (block, bar, underline)
- Color customization
- Saved in VFS (`~/.komarc` or similar)

### 🧪 Prototype

#### Tab Split/Pane Support
**Tags**: `#ui` `#prototype` `#medium` `#advanced`
**Status**: Planned for Phase 12+
**Phase**: 12+
**Dependencies**: Layout manager
**Blocks**: tmux-style pane management

**Planned**:
- Horizontal/vertical splits
- Resize panes
- Independent shell sessions per pane
- Pane navigation shortcuts
- Tmux-inspired commands

#### Screen Buffer Restoration
**Tags**: `#ui` `#prototype` `#low` `#ux`
**Status**: Planned for Phase 12+
**Phase**: 12+
**Dependencies**: Terminal buffer serialization
**Blocks**: Preserve output on tab close

**Planned**:
- Save terminal output when closing tab
- Restore output when reopening tab
- Configurable buffer size limit
- Clear old buffers (automatic cleanup)

## Visual Design Language

### Industrial Minimalism

**Principles**:
- Function over decoration
- Clarity over cleverness
- Timelessness over trends
- Professional utility over playful aesthetics

### Color Palette

**Primary Colors**:
- **Deep Charcoal**: `#1a1a1a` (background)
- **Phosphor Green**: `#00ff88` (olivine, success, primary text)
- **Lava Orange**: `#ff6b35` (hot lava, accents, activity)

**Extended Palette**:
- **Off-white**: `#e0e0e0` (primary text)
- **Dimmed**: `#999999` (secondary text)
- **Very dim**: `#666666` (tertiary text)
- **Subtle borders**: `#333333` (UI structure)

**Semantic Colors**:
- **Success**: `#00ff88` (green)
- **Error**: `#ff6b35` (orange/red)
- **Warning**: `#ffcc00` (yellow)
- **Info**: `#999999` (gray)

### Typography

**Font**: IBM Plex Mono
**Sizes**: 13px (terminal, editor)
**Weights**:
- Regular (400): Body text, output
- Medium (500): Filenames, headers
- Bold (700): Table headers (via ANSI `\x1b[1m`)

**Why IBM Plex Mono?**
- Modern, readable monospace
- Excellent at 13px terminal size
- Professional appearance
- Good Unicode coverage
- Clear distinction between similar characters (0/O, 1/l/I)

### The 3px Activity LED

**Design**:
- Vertical indicator on tab bar's right edge
- 3px wide, full tab height
- Peripheral vision feedback
- Industrial aesthetic (like HDD LEDs)

**Philosophy**: Satisfying feedback without being intrusive

## Architecture

### UI Layers

```
┌─────────────────────────────────────┐
│        Tab Bar (tabs + LED)         │
├─────────────────────────────────────┤
│                                     │
│     Terminal (xterm.js) OR          │
│     Editor (CodeMirror)             │
│     (full-screen, toggled)          │
│                                     │
├─────────────────────────────────────┤
│      Status Bar (cwd, info)         │
└─────────────────────────────────────┘
```

### Tab Manager

```javascript
class TabManager {
  constructor() {
    this.tabs = [];
    this.activeTab = null;
  }

  createTab(name, shell, term) {
    // Create new tab
    // Initialize shell session
    // Add to UI
  }

  switchTab(tabId) {
    // Switch active tab
    // Update UI
    // Focus terminal
  }

  closeTab(tabId) {
    // Close tab
    // Clean up shell
    // Switch to another tab
  }
}
```

## Related Files

**Source**:
- `src/terminal.js` - Main terminal initialization (~300 lines)
- `src/ui/tab-manager.js` - Multi-tab management (~600 lines)
- `src/ui/activity-led.js` - Activity LED controller (~150 lines)
- `styles/koma.css` - All UI styles (~800 lines)

**Documentation**:
- `design/visual-language.md` - Complete visual design spec
- `design/ui-patterns.md` - UI patterns and conventions
- `design/style-guide.md` - Style guide for contributors
- `design/lore/terminal-aesthetics.md` - Aesthetic influences

**Tests**:
- (Need UI integration tests)

## Next Steps

**Short-term** (Phase 7-8):
- Implement theme switching command
- Add more theme options

**Medium-term** (Phase 10):
- Terminal customization system
- User preferences in VFS

**Long-term** (Phase 12+):
- Tab split/pane support
- Screen buffer restoration
- Advanced UI customization

## Notes

**Retrospec Engineering**:
Creating technology that could have existed in 1984-1987 but didn't, using modern knowledge to perfect historical concepts.

**Influences**:
- **Jurassic Park (1993)** - SGI workstations, industrial Unix aesthetic
- **Zachtronics games** - Minimalist puzzle interfaces (TIS-100, EXAPUNKS)
- **VT100 terminals (1978)** - Green phosphor, functional design
- **Dieter Rams** - "Less but better" philosophy

**Geological Theme**:
- Komatiite: Ultra-basic volcanic rock
- Olivine: Primary mineral → phosphor green
- Hot lava: 1600°C eruption → orange accent
- Volcanic rock: Weathered basalt → charcoal background

---

**Last Updated**: 2025-11-16
**Maturity**: Working (80%)
**Priority**: High
