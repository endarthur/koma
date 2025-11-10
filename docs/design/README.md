# Koma Workstation Design Documentation

## Overview

This directory contains comprehensive documentation of the Koma Workstation's visual design language, UI patterns, and style guidelines. These documents ensure visual consistency and help contributors maintain the retrospec engineering aesthetic.

## Design Philosophy

Koma embodies **Industrial Minimalism** - a design approach that prioritizes:
- Function over decoration
- Clarity over cleverness
- Timelessness over trends
- Professional utility over playful aesthetics

The design is rooted in **retrospec engineering** - creating technology that could have existed in 1984-1987 but didn't, using modern knowledge to perfect historical concepts.

## Documentation Structure

### [Visual Language](./visual-language.md)
Complete specification of Koma's visual design system:
- Color palette (phosphor green, lava orange, deep charcoal)
- Geological origins of colors
- Typography (IBM Plex Mono)
- The 3px activity LED
- Terminal UI conventions
- Industrial minimalism principles

### [UI Patterns](./ui-patterns.md)
Documented patterns and conventions from the codebase:
- Command output formatting
- Error message patterns
- Status indicators
- Table formatting
- Box drawing character usage
- ANSI color usage patterns
- Pipeline and redirection handling

### [Style Guide](./style-guide.md)
Practical guidelines for contributors:
- Adding new commands
- Color usage rules
- Typography hierarchy
- Status/error message formatting
- UI element placement
- Code examples and anti-patterns

## Key Design Principles

### 1. Clarity Over Cleverness
Error messages should be informative, not cute. Output should be precise, not verbose.

### 2. Information Dense, Not Cluttered
Pack meaningful information into the interface without overwhelming the user.

### 3. Consistent Visual Language
Use established patterns for commands, files, paths, options, success, errors, and info.

### 4. Respect User's Time
Fast startup, no splash screens, instant feedback, clear error messages.

### 5. Professional, Not Playful
Koma is a tool for work - satisfying and elegant, but not cute or frivolous.

## The Retrospec Aesthetic

**What makes Koma feel "1984-1987":**
- Terminal-based interface (VT100 heritage)
- Monospace typography (IBM Plex Mono)
- Limited but purposeful color palette
- Industrial design language
- Unix philosophy (pipes, composability, text streams)
- Box drawing characters for structure
- Immediate feedback (no loading screens)

**What makes it better than actual 1987 systems:**
- Modern understanding of UX design
- Clean error messages
- Consistent command patterns
- Smart argument parsing
- Pipeline support
- Better color contrast
- Accessibility considerations

## Influences

### Aesthetic Influences
- **Jurassic Park (1993)** - SGI workstations, industrial Unix aesthetic
- **Zachtronics games** - Minimalist puzzle interfaces (TIS-100, EXAPUNKS)
- **VT100 terminals (1978)** - Green phosphor, functional design
- **Dieter Rams** - "Less but better" philosophy

### Geological Influences
- **Komatiites** - Ultra-basic volcanic rocks, source of naming
- **Olivine** - Primary mineral, source of phosphor green color
- **Hot lava** - 1600°C komatiite eruption temperature, source of orange accent
- **Volcanic rock** - Weathered basalt, source of charcoal background

## Terminal Capabilities

Koma uses modern terminal capabilities (via xterm.js) while maintaining period-appropriate aesthetics:

**Used:**
- Unicode characters
- ANSI 256-color mode
- Box drawing characters
- Bold/dim text styles
- Text selection

**Deliberately avoided:**
- Emoji (not period-appropriate)
- Heavy graphics
- Animations (except subtle LED pulses)
- Gradients
- Transparency effects (except selection)

## Color Theory

### Primary Palette
```
Phosphor Green:  #00ff88  (olivine, success, primary text)
Lava Orange:     #ff6b35  (hot lava, accents, activity)
Deep Charcoal:   #1a1a1a  (volcanic rock, background)
```

### Extended Palette
```
Off-white:       #e0e0e0  (primary text)
Dimmed:          #999999  (secondary text)
Very dim:        #666666  (tertiary text)
Subtle borders:  #333333  (UI structure)
```

### Semantic Colors
```
Success:         #00ff88  (green - operations complete)
Error:           #ff6b35  (red/orange - problems, attention)
Warning:         #ffcc00  (yellow - caution)
Info:            #999999  (gray - supplementary info)
```

## Typography

### Font Stack
```css
font-family: 'IBM Plex Mono', 'Menlo', 'Monaco', 'Courier New', monospace;
font-size: 13px;
line-height: 1.5;
```

### Font Weights
- **Regular (400)**: Body text, command output
- **Medium (500)**: Filenames, headers
- **Bold (700)**: Table headers, emphasis (via ANSI `\x1b[1m`)

### Why IBM Plex Mono?
- Modern, readable monospace design
- Excellent at 13px terminal size
- Professional appearance
- Good Unicode coverage
- Clear distinction between similar characters (0/O, 1/l/I)

## The 3px Activity LED

The vertical activity indicator on the tab bar's right edge:

**States:**
- **Idle**: Transparent (invisible)
- **Reading**: Green pulse (filesystem reads)
- **Writing**: Orange pulse (filesystem writes)
- **Error**: Orange flash 3x (operation failed)

**Design rationale:**
- Peripheral vision feedback
- Industrial aesthetic (like HDD LEDs)
- Non-intrusive positioning
- Satisfying to watch during operations

## Related Documentation

- [Lore: Terminal Aesthetics](../lore/terminal-aesthetics.md) - Deep dive into influences
- [Lore: Komatiite Connection](../lore/komatiite-connection.md) - Geological naming origins
- [Lore: Retrospec Engineering](../lore/retrospec-engineering.md) - Design philosophy

## For Contributors

When adding features or modifying the UI:

1. **Read the Visual Language doc** to understand the design system
2. **Study UI Patterns** to see established conventions
3. **Follow the Style Guide** for implementation details
4. **Ask yourself**: "Could this have existed in 1987?"
5. **Test in the terminal** to ensure it feels cohesive

## Design Tools & Resources

### Color Values (for reference)
```javascript
// CSS custom properties (from styles/koma.css)
--bg-primary: #1a1a1a;
--bg-secondary: #0f0f0f;
--bg-elevated: #252525;
--accent-orange: #ff6b35;
--accent-green: #00ff88;
--text-primary: #e0e0e0;
--text-secondary: #999999;
--text-tertiary: #666666;
--border: #333333;
```

### ANSI Color Codes (for terminal output)
```javascript
// Common patterns
'\x1b[31m'     // Red (errors)
'\x1b[32m'     // Green (success)
'\x1b[33m'     // Yellow (warnings)
'\x1b[34m'     // Blue (directories)
'\x1b[90m'     // Gray (dim info)
'\x1b[1m'      // Bold
'\x1b[2m'      // Dim
'\x1b[0m'      // Reset
```

## Version History

- **2025-11-10**: Initial design documentation created
- Colors, typography, and LED behavior documented from codebase
- UI patterns extracted and categorized
- Style guide established for contributors

---

**Last Updated:** 2025-11-10
