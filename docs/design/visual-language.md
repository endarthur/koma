# Koma Visual Language

## Introduction

The Koma Workstation's visual language is a carefully crafted system that balances historical authenticity with modern usability. Every color, typeface, and UI element serves a purpose rooted in both geological inspiration and industrial design principles.

This document is the complete specification of Koma's visual design system.

## Color Palette

### Primary Colors

#### Phosphor Green: `#00ff88`
```
RGB: (0, 255, 136)
HSL: (152°, 100%, 50%)
Usage: Primary text, success states, status indicators
```

**Origin:**
- **Geological**: Color of olivine crystals in thin section under polarized light
- **Historical**: P1 phosphor (green) from early CRT terminals
- **Semantic**: "Go ahead", success, activity, life

**Psychology:**
- Readable without eye strain
- Positive association (growth, success)
- Distinct from orange (prevents confusion)
- High contrast against charcoal background

**Where it appears:**
- Success messages
- Status indicators
- Process counts
- File operation confirmations
- Activity LED during reads
- Available/ready states

#### Lava Orange: `#ff6b35`
```
RGB: (255, 107, 53)
HSL: (16°, 100%, 60%)
Usage: Accents, highlights, errors, activity
```

**Origin:**
- **Geological**: Hot komatiite lava at 1600-1650°C
- **Historical**: Industrial warning indicators, hot metal glow
- **Semantic**: Attention, energy, heat, activity

**Psychology:**
- Commands attention without alarm
- Warm, energetic feeling
- Suggests power and capability
- Visible in peripheral vision

**Where it appears:**
- Shell prompt current directory
- Error messages
- Activity LED during writes
- Tab active indicators
- Modal borders
- Cursor color
- Accent highlights
- Button primary states

#### Deep Charcoal: `#1a1a1a`
```
RGB: (26, 26, 26)
HSL: (0°, 0%, 10%)
Usage: Primary background, containers
```

**Origin:**
- **Geological**: Weathered volcanic rock, ancient basalt
- **Historical**: Dark terminal backgrounds (reduced eye strain)
- **Semantic**: Foundation, stability, depth

**Psychology:**
- Professional, serious tone
- Reduces eye fatigue (dark mode)
- Makes colored text pop
- Suggests solidity and permanence

**Where it appears:**
- Main terminal background
- View backgrounds
- Tab backgrounds
- Modal content areas
- Button default states

### Secondary Colors

#### Off-White: `#e0e0e0`
```
RGB: (224, 224, 224)
Usage: Primary text content
```
High contrast against charcoal, readable without glare.

#### Dimmed Gray: `#999999`
```
RGB: (153, 153, 153)
Usage: Secondary text, de-emphasized content
```
Less important information, hints, metadata.

#### Very Dim Gray: `#666666`
```
RGB: (102, 102, 102)
Usage: Tertiary text, very subtle information
```
System info, timestamps, background details.

#### Subtle Border: `#333333`
```
RGB: (51, 51, 51)
Usage: UI structure, dividers
```
Visual separation without harsh lines.

#### Darker Inset: `#0f0f0f`
```
RGB: (15, 15, 15)
Usage: Inset areas, tab bar, status bar
```
Subtle depth for UI chrome elements.

#### Slightly Elevated: `#252525`
```
RGB: (37, 37, 37)
Usage: Raised elements, active tabs
```
Visual hierarchy through minimal elevation.

### Extended ANSI Colors

The terminal supports full 256-color mode, but Koma uses a curated subset:

#### Standard Colors
```javascript
black:   '#1a1a1a'  // Same as background
red:     '#ff6b35'  // Lava orange (errors)
green:   '#00ff88'  // Phosphor green (success)
yellow:  '#ffcc00'  // Warnings
blue:    '#4d9fff'  // Directories, info
magenta: '#ff6bcb'  // Special content
cyan:    '#00ddff'  // Highlights
white:   '#e0e0e0'  // Default text
```

#### Bright Colors
```javascript
brightBlack:   '#666666'  // Dim text
brightRed:     '#ff8c61'  // Lighter errors
brightGreen:   '#33ffaa'  // Lighter success
brightYellow:  '#ffdd33'  // Lighter warnings
brightBlue:    '#70b3ff'  // Lighter info
brightMagenta: '#ff8cdb'  // Lighter special
brightCyan:    '#33eeff'  // Lighter highlights
brightWhite:   '#ffffff'  // Pure white
```

### Semantic Color Mapping

#### Success
- **Primary**: Phosphor green (`#00ff88`)
- **ANSI**: `\x1b[32m`
- **Usage**: Operations completed, confirmations

#### Error
- **Primary**: Lava orange (`#ff6b35`)
- **ANSI**: `\x1b[31m`
- **Usage**: Errors, failures, attention needed

#### Warning
- **Primary**: Yellow (`#ffcc00`)
- **ANSI**: `\x1b[33m`
- **Usage**: Cautions, potential issues

#### Info
- **Primary**: Dimmed gray (`#999999`)
- **ANSI**: `\x1b[90m`
- **Usage**: Supplementary information, metadata

#### Directory
- **Primary**: Blue (`#4d9fff`)
- **ANSI**: `\x1b[34m`
- **Usage**: Directory names in listings

#### Emphasis
- **Primary**: Bold style
- **ANSI**: `\x1b[1m`
- **Usage**: Headers, important terms

#### De-emphasis
- **Primary**: Dim style
- **ANSI**: `\x1b[2m`
- **Usage**: Less important content

## Typography

### Font Family

```css
font-family: 'IBM Plex Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
```

**Why IBM Plex Mono?**
1. **Modern design** (2018) with historical sensibility
2. **Excellent readability** at small sizes (13px)
3. **Professional appearance** (designed for IBM)
4. **Good Unicode coverage** (box drawing, special chars)
5. **Clear differentiation** (0/O, 1/l/I, rn/m)
6. **Open source** (SIL Open Font License)

**Fallbacks:**
- **Menlo**: macOS system monospace
- **Monaco**: Classic Mac monospace
- **Courier New**: Universal fallback
- **monospace**: System default

### Font Sizing

```css
font-size: 13px;
line-height: 1.5;
```

**Rationale:**
- **13px**: Sweet spot for terminal text
  - Large enough to be readable
  - Small enough to be information-dense
  - Matches historical terminal scale
- **1.5 line-height**: Optimal for reading code
  - Prevents lines from feeling cramped
  - Maintains text flow
  - Historical terminal proportion

### Font Weights

#### Regular (400)
```
Usage: Body text, command output, file content
Context: Default weight for all terminal content
```

#### Medium (500)
```
Usage: Filenames in editor, modal headers
Context: Slight emphasis without bold
```

#### Bold (700 via ANSI)
```
Usage: Table headers, emphasized text, help section titles
ANSI: \x1b[1m
Context: Strong emphasis, structure markers
```

### Typography Hierarchy

```
Level 1: Command Names (plain, in command line)
Level 2: Section Headers (bold, uppercase)
Level 3: Subsection Headers (bold, sentence case)
Level 4: Body Text (regular)
Level 5: Metadata (dim, smaller conceptually)
```

## The 3px Activity LED

### Specifications

```css
.activity-led {
  width: 3px;
  height: 26px;
  background: transparent;
  border-radius: 1px;
  transition: background-color 150ms ease;
}
```

**Position**: Right side of tab bar, before system info

**Dimensions**:
- **Width**: 3px (visible but unobtrusive)
- **Height**: 26px (most of tab bar height)
- **Radius**: 1px (subtle softening)

### States

#### Idle (Default)
```css
background: transparent;
box-shadow: none;
```
LED is invisible when system is idle.

#### Reading
```css
background: #00ff88;  /* phosphor green */
box-shadow: 0 0 6px #00ff88;
animation: pulse-green 1s ease-in-out infinite;
```

**Trigger**: Filesystem read operations
**Duration**: Active during operation
**Visual**: Green glow with gentle pulse

#### Writing
```css
background: #ff6b35;  /* lava orange */
box-shadow: 0 0 6px #ff6b35;
animation: pulse-orange 1s ease-in-out infinite;
```

**Trigger**: Filesystem write operations
**Duration**: Active during operation
**Visual**: Orange glow with gentle pulse

#### Error
```css
background: #ff6b35;  /* lava orange */
box-shadow: 0 0 8px #ff6b35;
animation: flash-error 0.3s ease-in-out 3;
```

**Trigger**: Operation failure
**Duration**: Flashes 3 times (0.9s total)
**Visual**: Quick orange flashes

### Animations

#### Pulse (Reading/Writing)
```css
@keyframes pulse-green {
  0%, 100% {
    opacity: 1;
    box-shadow: 0 0 6px var(--accent-green);
  }
  50% {
    opacity: 0.4;
    box-shadow: 0 0 2px var(--accent-green);
  }
}
```

**Duration**: 1 second per cycle
**Effect**: Gentle breathing pattern
**Easing**: ease-in-out (natural feel)

#### Flash (Error)
```css
@keyframes flash-error {
  0%, 100% { opacity: 0; }
  50% { opacity: 1; }
}
```

**Duration**: 0.3s per flash × 3 = 0.9s total
**Effect**: Rapid attention-getting blink
**Easing**: ease-in-out

### Design Philosophy

The LED embodies industrial minimalism:

1. **Peripheral awareness** - Visible without being distracting
2. **Functional feedback** - Shows system activity clearly
3. **Industrial heritage** - Inspired by HDD/tape drive LEDs
4. **Geological metaphor** - Green (olivine reads), Orange (lava writes)
5. **Satisfying feedback** - Visual confirmation of operations

## Terminal UI Conventions

### Tab Bar (32px height)

```
┌─────────────────────────────────────────────────────────────────┐
│ [1:main*] [2:work] [+]        [LED] [editor status]  koma v0.1  │
└─────────────────────────────────────────────────────────────────┘
```

**Elements:**
- **Tabs**: Numbered with optional name (1:main)
- **Active indicator**: 2px orange left border
- **New tab button**: [+] at end of tab list
- **Activity LED**: 3px vertical bar
- **Editor status**: Shows active file or empty
- **System info**: Version number, right-aligned

**Background**: Darker inset (`#0f0f0f`)
**Border**: 1px bottom border (`#333333`)

### Terminal Container

```
Background: Deep charcoal (#1a1a1a)
Padding: 8px
Font: IBM Plex Mono 13px
Line height: 1.5
```

**Cursor**:
- **Style**: Block (solid rectangle)
- **Color**: Lava orange (`#ff6b35`)
- **Blink**: Enabled (standard terminal behavior)

**Selection**:
- **Background**: `rgba(255, 107, 53, 0.3)` (orange @ 30% opacity)
- **Behavior**: Standard xterm.js selection

### Status Bar (24px height)

```
┌─────────────────────────────────────────────────────────────────┐
│ /home/user           2 processes               Ctrl+E edit      │
└─────────────────────────────────────────────────────────────────┘
```

**Elements:**
- **CWD**: Current working directory (left)
- **Process count**: Active processes (center-left)
- **Hints**: Keyboard shortcuts (right)

**Background**: Darker inset (`#0f0f0f`)
**Border**: 1px top border (`#333333`)
**Font size**: 11px

### Shell Prompt

```bash
/home/user $ command
```

**Format**:
- **Path**: Current directory in orange (`\x1b[38;5;208m`)
- **Symbol**: Space, dollar sign, space
- **Color**: Orange for path, white for $
- **Reset**: After $ before user input

**Code**:
```javascript
const promptColor = '\x1b[38;5;208m'; // Orange (256-color mode)
const reset = '\x1b[0m';
term.write(`${promptColor}${cwd}${reset} $ `);
```

### Modal Dialogs

```
┌─────────────────────────────────────┐
│ ■ Modal Header                      │ ← Orange header
├─────────────────────────────────────┤
│                                     │
│  Modal content text goes here.      │
│  Multiple lines supported.          │
│                                     │
├─────────────────────────────────────┤
│                    [Cancel] [OK]    │ ← Buttons right-aligned
└─────────────────────────────────────┘
```

**Styling**:
- **Overlay**: `rgba(0, 0, 0, 0.7)` dark backdrop
- **Border**: 2px solid orange (`#ff6b35`)
- **Header**: Orange text on darker background
- **Content**: Off-white text, 20px padding
- **Buttons**: Right-aligned, 8px gap
- **Shadow**: `0 8px 32px rgba(0, 0, 0, 0.5)`

**Animations**:
- **Fade in**: Overlay opacity 0→1 (150ms)
- **Slide in**: Modal translateY(-20px→0), opacity 0→1 (150ms)

## Box Drawing Characters

Koma uses Unicode box-drawing characters for structure:

### Tree Command
```
home/
├── documents/
│   ├── file1.txt
│   └── file2.txt
└── projects/
    └── koma/
```

**Characters used**:
- `├──` Box light down and right + horizontal
- `│` Box light vertical
- `└──` Box light up and right + horizontal

### Table Borders (potential future use)
```
┌─────┬─────┬─────┐
│ PID │ CMD │ TIME│
├─────┼─────┼─────┤
│ 123 │ ls  │ 0ms │
└─────┴─────┴─────┘
```

**Guidelines**:
- Use for structure, not decoration
- Maintain alignment with monospace grid
- Keep patterns simple and consistent

## Scrollbar Styling

```css
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #1a1a1a;
}

::-webkit-scrollbar-thumb {
  background: #333333;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #666666;
}
```

**Design**:
- **Minimal width** (8px)
- **Subtle colors** (blend with UI)
- **Rounded thumb** (4px radius)
- **Hover feedback** (lightens on interaction)

## Transitions and Animations

### General Guidelines

**Fast transitions** (100ms):
- Button hovers
- Tab selections
- Border color changes
- Background color changes

**Medium transitions** (150ms):
- Activity LED state changes
- Modal fade in/out

**Long transitions** (1000ms):
- Activity LED pulses

**Easing**:
- **Linear**: Not used (feels mechanical)
- **Ease**: General purpose transitions
- **Ease-in-out**: Animations with begin/end (pulses, fades)

### No Animation Zones

**Never animate**:
- Text appearance (instant is better)
- Command execution feedback
- Cursor movement
- Scrolling (browser default)

**Why**: Terminal interfaces should feel instant. Animations are for feedback, not decoration.

## Industrial Minimalism Principles

### 1. Form Follows Function

Every element serves a purpose:
- **LED**: Shows system activity
- **Colors**: Semantic meaning (success, error, info)
- **Borders**: Define structure
- **Spacing**: Visual hierarchy

**Anti-pattern**: Decorative elements with no function.

### 2. Geometric Precision

UI elements align to a grid:
- **Heights**: 24px, 32px (multiples of 8)
- **Padding**: 8px, 12px, 16px, 20px
- **Gaps**: 4px, 8px, 12px, 16px

**Anti-pattern**: Arbitrary spacing values like 15px or 23px.

### 3. Limited Palette

Use defined colors only:
- Primary: 3 colors (green, orange, charcoal)
- Secondary: 4 grays (off-white, dimmed, very dim, borders)
- ANSI: Extended set for terminal content

**Anti-pattern**: Adding new colors without design review.

### 4. Technical Honesty

Show what things are:
- Files are text
- Directories are lists
- Processes have states
- Operations take time

**Anti-pattern**: Skeuomorphism, fake 3D, unnecessary metaphors.

### 5. Professional Aesthetic

Koma is a tool for work:
- No emoji (unless explicitly requested)
- No playful language in errors
- No cute animations
- No "fun" sound effects

**Anti-pattern**: Consumer-app casualness.

## Accessibility Considerations

### Color Contrast

All text meets WCAG AA standards:
- **Off-white on charcoal**: 12.6:1 (AAA)
- **Dimmed gray on charcoal**: 5.9:1 (AA)
- **Phosphor green on charcoal**: 11.2:1 (AAA)
- **Lava orange on charcoal**: 6.3:1 (AA)

### Typography

- **Font size**: 13px (readable without zoom for most users)
- **Line height**: 1.5 (prevents cramped text)
- **Monospace**: Consistent character width
- **Clear glyphs**: IBM Plex Mono has distinct 0/O, 1/l/I

### Keyboard Navigation

- **Tab switching**: Mouse or keyboard (Ctrl+Tab)
- **Command line**: Always keyboard-accessible
- **Editor**: Full keyboard navigation
- **Modals**: Tab through buttons, Enter/Esc

### Screen Readers

- **Text mode**: Content is accessible text
- **Copy-paste**: Standard browser behavior works
- **Selection**: No custom selection logic
- **Labels**: Semantic HTML structure

## Design System Version

**Version**: 1.0
**Status**: Stable
**Last Updated**: 2025-11-10

**Breaking changes**: Require major version bump
**Additions**: Can be minor version bumps
**Clarifications**: Patch version bumps

---

## Related Documentation

- [Design README](./README.md) - Overview and index
- [UI Patterns](./ui-patterns.md) - Implementation patterns
- [Style Guide](./style-guide.md) - Contributor guidelines
- [Terminal Aesthetics (Lore)](../lore/terminal-aesthetics.md) - Design philosophy deep dive
- [Komatiite Connection (Lore)](../lore/komatiite-connection.md) - Color palette origins

**Last Updated:** 2025-11-10
