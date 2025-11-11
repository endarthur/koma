# Koma Terminal: Comprehensive Visual Design Analysis & Recommendations

## Executive Summary

Koma is a browser-based Unix terminal with a geological/retro computing theme that demonstrates strong foundational design principles but has significant opportunities for visual refinement. This document provides actionable recommendations to transform Koma from "functional" to "absolutely perfect" while honoring its retrospec engineering philosophy.

**Current State**: Clean industrial minimalism with basic implementation
**Target State**: Museum-quality retro computing aesthetic that feels like a lost SGI workstation from 1987

---

## I. Current Design Analysis

### Strengths

**Color Palette (Excellent Foundation)**
- Deep charcoal (#1a1a1a): Professional, reduces eye strain
- Lava orange (#ff6b35): Distinctive, energetic accent
- Phosphor green (#00ff88): Readable, evocative of CRT terminals
- High contrast ratios ensure accessibility

**Typography (Solid Choice)**
- IBM Plex Mono at 13px: Modern, readable monospace
- Consistent sizing and line-height (1.5)
- Good fallback stack

**Architecture (Well-Considered)**
- Clean CSS custom properties for theming
- Logical component separation
- Activity LED is inspired industrial design

### Weaknesses & Opportunities

**Visual Hierarchy**
- Tab bar feels flat and generic (could be more 1987 workstation)
- Status bar lacks visual weight and character
- Terminal container has no depth or CRT character
- Missing visual feedback for focus states

**Retro Authenticity**
- No CRT phosphor glow effects
- Missing scan line aesthetic (subtle)
- Lacks terminal "chrome" feeling
- No boot sequence or power-on aesthetic
- Color scheme could be more geologically inspired

**Typography Refinement**
- IBM Plex Mono is good but not period-authentic
- Missing font rendering characteristics of CRTs
- No letter-spacing optimization for terminal
- Tab labels use same size as everything (hierarchy issue)

**Polish & Details**
- No favicon or app icon
- Missing loading/boot states
- No visual Easter eggs
- Terminal cursor could be more distinctive
- Scrollbar is browser-default (breaks immersion)

---

## II. Design Recommendations by Priority

### CRITICAL: Must-Have for Professional Appearance

#### 1. CRT Phosphor Glow Effect (High Impact)

**Implementation**:
```css
.terminal-container {
  background: #1a1a1a;
  position: relative;
}

.terminal-container::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background:
    radial-gradient(
      ellipse at center,
      rgba(0, 255, 136, 0.03) 0%,
      transparent 70%
    );
  pointer-events: none;
  mix-blend-mode: screen;
}

/* Subtle text glow on phosphor green text */
.xterm .xterm-fg-10 { /* ANSI bright green */
  text-shadow: 0 0 8px rgba(0, 255, 136, 0.5);
}
```

**Justification**: VT100/VT220 terminals had characteristic phosphor glow. This is the single most important visual element for retro authenticity without being kitsch.

**Complexity**: Low (pure CSS)

---

#### 2. Refined Color Palette with Geological Depth

**Current palette is good but can be more geological:**

```css
:root {
  /* Background - Volcanic layers */
  --bg-primary: #1a1a1a;        /* Keep - basalt foundation */
  --bg-secondary: #121212;      /* Darker - obsidian inset */
  --bg-elevated: #232323;       /* Lighter - weathered surface */

  /* Accents - Geological processes */
  --accent-orange: #ff6b35;     /* Keep - komatiite lava */
  --accent-green: #00ff88;      /* Keep - olivine */
  --accent-amber: #ffb84d;      /* NEW - olivine in crossed polars */

  /* Text - Stratigraphy */
  --text-primary: #e8e6e3;      /* Slightly warmer off-white */
  --text-secondary: #9a9896;    /* Warmer gray */
  --text-tertiary: #6b6966;     /* Schist gray */

  /* Borders - Metamorphic layers */
  --border: #2d2d2d;            /* Slightly lighter for depth */
  --border-inset: #1a1a1a;      /* Darker for inset borders */
  --border-active: var(--accent-orange);

  /* Special - Geological features */
  --glow-green: rgba(0, 255, 136, 0.4);
  --glow-orange: rgba(255, 107, 53, 0.4);
}
```

**Implementation Notes**:
- Warmer grays (adding slight yellow) feel more like aged phosphor
- Additional amber accent for highlights (like olivine under microscope)
- Distinct border-inset for depth perception

**Complexity**: Low (variable updates + cascade changes)

---

#### 3. Typography: Switch to Period-Appropriate Font

**Recommendation**: Use **DEC Terminal font stack** with modern fallbacks

```css
:root {
  --font-mono:
    'Berkeley Mono',           /* Modern, excellent CRT feel */
    'JetBrains Mono',          /* Fallback 1: widely available */
    'Inconsolata',             /* Fallback 2: good hinting */
    'SF Mono',                 /* Fallback 3: macOS */
    'Consolas',                /* Fallback 4: Windows */
    'IBM Plex Mono',           /* Fallback 5: current choice */
    'Courier New',             /* Final fallback */
    monospace;

  --font-size: 13px;
  --line-height: 1.5;
  --letter-spacing: 0.02em;    /* NEW - improves terminal legibility */
}

/* Apply to all text */
body {
  font-family: var(--font-mono);
  letter-spacing: var(--letter-spacing);
}

/* Slightly tighter spacing in terminal for density */
.xterm {
  letter-spacing: 0.01em;
}
```

**Alternative**: Keep IBM Plex Mono but enhance it:
```css
.xterm {
  font-variant-ligatures: none; /* Disable ligatures in terminal */
  text-rendering: geometricPrecision;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}
```

**Justification**: Berkeley Mono specifically designed for coding/terminals with vintage feel. IBM Plex Mono is excellent but too modern/corporate.

**Complexity**: Low (CSS update, consider web font loading)

---

#### 4. Tab Bar: Industrial Workstation Aesthetic

**Current issue**: Tabs feel generic, like browser tabs

**Recommendation**: VT terminal style tabs with depth

```css
.tab-bar {
  display: flex;
  align-items: center;
  gap: 8px;
  height: 32px;
  background: var(--bg-secondary);
  border-bottom: 2px solid var(--border);
  padding: 0 12px 0 8px;
  flex-shrink: 0;
  box-shadow: inset 0 -1px 0 var(--border-inset);
}

.tab {
  display: flex;
  align-items: center;
  height: 24px;
  padding: 0 12px;
  background: var(--bg-primary);
  border: 1px solid var(--border);
  border-bottom: none;
  cursor: pointer;
  transition: all 100ms ease;
  position: relative;

  /* 3D raised effect */
  box-shadow:
    inset 1px 1px 0 rgba(255, 255, 255, 0.05),
    inset -1px -1px 0 rgba(0, 0, 0, 0.3);

  /* Slight bevel */
  clip-path: polygon(
    2px 0,
    calc(100% - 2px) 0,
    100% 2px,
    100% 100%,
    0 100%,
    0 2px
  );
}

.tab:hover {
  background: var(--bg-elevated);
  box-shadow:
    inset 1px 1px 0 rgba(255, 255, 255, 0.08),
    inset -1px -1px 0 rgba(0, 0, 0, 0.3);
}

.tab.active {
  background: var(--bg-elevated);
  border-left: 3px solid var(--accent-orange);
  padding-left: 10px; /* Compensate for thicker border */

  /* Glowing indicator */
  box-shadow:
    inset 3px 0 8px rgba(255, 107, 53, 0.3),
    inset 1px 1px 0 rgba(255, 255, 255, 0.1),
    inset -1px -1px 0 rgba(0, 0, 0, 0.3);
}

.tab-name {
  font-size: 11px;
  font-weight: 500;
  color: var(--text-secondary);
  user-select: none;
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.tab.active .tab-name {
  color: var(--text-primary);
}
```

**Justification**: 1980s workstations had beveled, embossed UI elements. This creates visual depth without being skeuomorphic.

**Complexity**: Medium (CSS clip-path and box-shadow)

---

#### 5. Status Bar: Information Dense Industrial Design

**Current issue**: Flat, lacks character

**Recommendation**: Recessed display with segmented sections

```css
.status-bar {
  display: flex;
  align-items: center;
  gap: 16px;
  height: 26px;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border);
  padding: 0 12px;
  font-size: 11px;
  flex-shrink: 0;

  /* Recessed effect */
  box-shadow:
    inset 0 2px 4px rgba(0, 0, 0, 0.4),
    inset 0 1px 0 rgba(0, 0, 0, 0.6);
}

.status-bar::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  height: 1px;
  background: linear-gradient(
    to right,
    transparent,
    rgba(0, 0, 0, 0.5) 10%,
    rgba(0, 0, 0, 0.5) 90%,
    transparent
  );
}

/* Status segments have LED-style indicators */
.cwd::before {
  content: '●';
  color: var(--accent-green);
  margin-right: 6px;
  font-size: 8px;
  text-shadow: 0 0 4px var(--glow-green);
}

.cwd {
  color: var(--text-primary);
  font-variant-numeric: tabular-nums;
  letter-spacing: 0.02em;
}

.process-count {
  color: var(--accent-green);
  font-weight: 500;
  text-shadow: 0 0 4px var(--glow-green);
}

.hints {
  margin-left: auto;
  color: var(--text-tertiary);
  font-style: italic;
  opacity: 0.7;
}
```

**Justification**: Status bars on 1980s terminals were recessed displays with LED indicators. Creates visual hierarchy and industrial feel.

**Complexity**: Medium (box-shadow + pseudo-elements)

---

### HIGH: Significant Visual Impact

#### 6. Subtle CRT Scan Lines (Tasteful)

**Implementation**:
```css
.terminal-container::after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: repeating-linear-gradient(
    0deg,
    transparent,
    transparent 1px,
    rgba(0, 0, 0, 0.08) 1px,
    rgba(0, 0, 0, 0.08) 2px
  );
  pointer-events: none;
  opacity: 0.3;
  z-index: 10;
  mix-blend-mode: multiply;
}
```

**Justification**: Very subtle scan lines add CRT authenticity without being distracting. Low opacity (0.3) keeps it classy.

**Complexity**: Low (CSS pseudo-element)

**Toggle Option**: Add user preference to disable
```css
.terminal-container.no-scanlines::after {
  display: none;
}
```

---

#### 7. Boot Sequence Animation

**Recommendation**: Show geological "core sample" loading animation on first load

```html
<div id="boot-sequence" class="boot-overlay">
  <div class="boot-content">
    <pre class="boot-text">
KOMA WORKSTATION v0.1
Olivine Kernel Loading...

Initializing VFS...          [<span class="ok">OK</span>]
Mounting /home...            [<span class="ok">OK</span>]
Starting process manager...  [<span class="ok">OK</span>]
Loading Schist interpreter... [<span class="ok">OK</span>]

READY
    </pre>
  </div>
</div>
```

```css
.boot-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: #0a0a0a;
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeOut 500ms ease 2s forwards;
}

.boot-text {
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--accent-green);
  text-shadow: 0 0 8px var(--glow-green);
  line-height: 1.8;
  animation: flicker 100ms ease-in-out 3;
}

.boot-text .ok {
  color: var(--accent-green);
  font-weight: bold;
}

@keyframes fadeOut {
  to {
    opacity: 0;
    pointer-events: none;
  }
}

@keyframes flicker {
  0%, 100% { opacity: 1; }
  50% { opacity: 0.8; }
}
```

**Justification**: Boot sequences were part of 1980s computing culture. Creates anticipation and sets retro tone. Shows system "warming up" like a CRT.

**Complexity**: Medium (HTML injection + CSS animation + JS timing)

---

#### 8. Enhanced Activity LED with Glow

**Current implementation is good, enhance it:**

```css
.activity-led {
  width: 4px;  /* Slightly wider: 3px → 4px */
  height: 26px;
  background: transparent;
  border-radius: 2px;
  transition: all 150ms ease;
  position: relative;
}

.activity-led::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  border-radius: 2px;
  opacity: 0;
  transition: opacity 150ms ease;
}

.activity-led.reading {
  background: var(--accent-green);
  box-shadow:
    0 0 8px var(--glow-green),
    inset 0 0 4px rgba(255, 255, 255, 0.3);
  animation: pulse-green 1s ease-in-out infinite;
}

.activity-led.reading::before {
  background: radial-gradient(
    ellipse at center,
    rgba(0, 255, 136, 0.6),
    transparent
  );
  filter: blur(4px);
  opacity: 1;
  transform: scale(2);
}

.activity-led.writing {
  background: var(--accent-orange);
  box-shadow:
    0 0 8px var(--glow-orange),
    inset 0 0 4px rgba(255, 255, 255, 0.3);
  animation: pulse-orange 1s ease-in-out infinite;
}

.activity-led.writing::before {
  background: radial-gradient(
    ellipse at center,
    rgba(255, 107, 53, 0.6),
    transparent
  );
  filter: blur(4px);
  opacity: 1;
  transform: scale(2);
}

/* Enhanced pulse with subtle glow expansion */
@keyframes pulse-green {
  0%, 100% {
    opacity: 1;
    box-shadow:
      0 0 8px var(--glow-green),
      inset 0 0 4px rgba(255, 255, 255, 0.3);
  }
  50% {
    opacity: 0.7;
    box-shadow:
      0 0 12px var(--glow-green),
      inset 0 0 2px rgba(255, 255, 255, 0.2);
  }
}

@keyframes pulse-orange {
  0%, 100% {
    opacity: 1;
    box-shadow:
      0 0 8px var(--glow-orange),
      inset 0 0 4px rgba(255, 255, 255, 0.3);
  }
  50% {
    opacity: 0.7;
    box-shadow:
      0 0 12px var(--glow-orange),
      inset 0 0 2px rgba(255, 255, 255, 0.2);
  }
}
```

**Justification**: Hard drive LEDs on 1980s-90s machines had distinct glow. This enhances existing good design with more period authenticity.

**Complexity**: Medium (pseudo-elements + filter effects)

---

#### 9. Terminal Cursor: Block with Glow

**Current**: Default xterm.js cursor

**Recommendation**: Enhanced retro cursor

```css
.xterm-cursor-layer .xterm-cursor {
  background: var(--accent-orange) !important;
  opacity: 0.9 !important;
  box-shadow: 0 0 8px var(--glow-orange);
}

/* Blinking cursor with fade, not instant */
@keyframes blink {
  0%, 49% {
    opacity: 0.9;
  }
  50%, 100% {
    opacity: 0;
  }
}

.xterm-cursor-blink {
  animation: blink 1s step-end infinite;
}
```

**Also update xterm config**:
```javascript
const terminalConfig = {
  // ... existing config
  cursorBlink: true,
  cursorStyle: 'block',
  cursorWidth: 8,  // Slightly wider block
  // ...
};
```

**Justification**: VT100 cursors were bright, blocky, with slight glow. Current implementation is too subtle.

**Complexity**: Low (CSS + config update)

---

#### 10. Favicon and App Icons

**Create geological/terminal themed icons**:

**Favicon Design Concept**:
- 32x32px icon showing:
  - Dark background (#1a1a1a)
  - Orange "K" in terminal font
  - Green cursor block
  - Single scan line

**SVG Implementation**:
```svg
<svg width="32" height="32" xmlns="http://www.w3.org/2000/svg">
  <rect width="32" height="32" fill="#1a1a1a"/>
  <text x="6" y="22"
        font-family="monospace"
        font-size="20"
        font-weight="bold"
        fill="#ff6b35">K</text>
  <rect x="20" y="14" width="6" height="12"
        fill="#00ff88" opacity="0.8"/>
  <line x1="0" y1="16" x2="32" y2="16"
        stroke="#333" stroke-width="1"/>
</svg>
```

**Files to create**:
- `favicon.ico` (32x32, 16x16)
- `apple-touch-icon.png` (180x180)
- `manifest-icon-192.png` (192x192)
- `manifest-icon-512.png` (512x512)

**Add to index.html**:
```html
<link rel="icon" type="image/svg+xml" href="/favicon.svg">
<link rel="icon" type="image/png" sizes="32x32" href="/favicon-32x32.png">
<link rel="apple-touch-icon" sizes="180x180" href="/apple-touch-icon.png">
```

**Complexity**: Medium (icon design + export)

---

### MEDIUM: Nice Polish Touches

#### 11. Focus States and Interaction Feedback

```css
/* Tab focus */
.tab:focus-visible {
  outline: 2px solid var(--accent-orange);
  outline-offset: -2px;
}

/* Button focus */
.new-tab:focus-visible,
.modal-button:focus-visible {
  outline: 2px solid var(--accent-orange);
  outline-offset: 2px;
}

/* Active press states */
.new-tab:active {
  transform: translateY(1px);
  box-shadow: inset 0 1px 2px rgba(0, 0, 0, 0.5);
}

.tab:active {
  transform: translateY(1px);
}
```

**Justification**: Physical feedback makes interface feel responsive and tactile.

**Complexity**: Low (CSS states)

---

#### 12. Terminal Container with Bezel

**Add CRT-style bezel around terminal**:

```css
.terminal-container {
  flex: 1;
  background: var(--bg-primary);
  overflow: hidden;
  position: relative;
  padding: 16px;

  /* Inset bezel effect */
  box-shadow:
    inset 0 0 40px rgba(0, 0, 0, 0.5),
    inset 0 0 8px rgba(0, 0, 0, 0.8);

  /* Subtle vignette */
  background:
    radial-gradient(
      ellipse at center,
      var(--bg-primary) 0%,
      #0f0f0f 100%
    );
}

#terminal {
  width: 100%;
  height: 100%;
  padding: 0;
  border-radius: 2px;
}
```

**Justification**: CRTs had physical bezels and slight vignetting. Creates focus area.

**Complexity**: Low (CSS box-shadow + gradient)

---

#### 13. Custom Scrollbar (Refinement)

**Current scrollbar is default browser style**

```css
/* Webkit/Blink browsers */
.terminal-container ::-webkit-scrollbar {
  width: 10px;
  height: 10px;
}

.terminal-container ::-webkit-scrollbar-track {
  background: var(--bg-secondary);
  border-left: 1px solid var(--border);
  box-shadow: inset 1px 0 2px rgba(0, 0, 0, 0.4);
}

.terminal-container ::-webkit-scrollbar-thumb {
  background: var(--border);
  border-radius: 0;
  border: 1px solid var(--bg-secondary);
  box-shadow: inset 0 0 2px rgba(255, 255, 255, 0.1);
}

.terminal-container ::-webkit-scrollbar-thumb:hover {
  background: #404040;
}

.terminal-container ::-webkit-scrollbar-thumb:active {
  background: #4a4a4a;
}

/* Firefox */
.terminal-container {
  scrollbar-width: thin;
  scrollbar-color: var(--border) var(--bg-secondary);
}
```

**Justification**: Custom scrollbar maintains visual consistency. Square corners match industrial aesthetic.

**Complexity**: Low (CSS only)

---

#### 14. Modal System Enhancement

**Current modals are good, add depth**:

```css
.modal-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.85);
  backdrop-filter: blur(4px);  /* NEW */
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
  animation: fadeIn 200ms ease;
}

.modal {
  background: var(--bg-elevated);
  border: 2px solid var(--accent-orange);
  min-width: 400px;
  max-width: 600px;
  box-shadow:
    0 8px 32px rgba(0, 0, 0, 0.8),
    0 0 20px rgba(255, 107, 53, 0.2),  /* Orange glow */
    inset 0 1px 0 rgba(255, 255, 255, 0.05);
  animation: slideIn 200ms cubic-bezier(0.34, 1.56, 0.64, 1);  /* Slight bounce */
}

@keyframes slideIn {
  from {
    transform: translateY(-40px) scale(0.95);
    opacity: 0;
  }
  to {
    transform: translateY(0) scale(1);
    opacity: 1;
  }
}
```

**Justification**: Backdrop blur and glow enhance modal prominence. Bounce animation feels more alive.

**Complexity**: Low (CSS updates)

---

### LOW: Delightful Extras

#### 15. Easter Eggs

**Geological ASCII Art in Welcome Message**:

```javascript
// In tab-manager.js, enhance welcome message
if (!restoreState) {
  createdTab.terminal.writeln('\x1b[38;5;208m');  // Orange
  createdTab.terminal.writeln('╔═══════════════════════════════════════╗');
  createdTab.terminal.writeln('║   KOMA WORKSTATION v0.1               ║');
  createdTab.terminal.writeln('║   Olivine Kernel • Schist Lisp        ║');
  createdTab.terminal.writeln('╚═══════════════════════════════════════╝');
  createdTab.terminal.writeln('\x1b[0m');  // Reset
  createdTab.terminal.writeln('');
  createdTab.terminal.writeln('Type \x1b[1mhelp\x1b[0m for commands, \x1b[1mman koma\x1b[0m for system info');
  createdTab.terminal.writeln('');
  createdTab.shell.writePrompt();
}
```

**Hidden Command - `koma lore`**:
```javascript
// Show geological facts and retro computing trivia
case 'lore':
  context.writeln('\x1b[38;5;208m━━━ KOMA LORE ━━━\x1b[0m\n');
  context.writeln('Komatiite: Ultramafic volcanic rock from >1600°C lava');
  context.writeln('Last erupted: 89 million years ago (Gorgona Island)');
  context.writeln('Named after: Komati River, South Africa (1969)\n');
  context.writeln('Terminal heritage: VT100 (1978) → xterm (1984) → Koma (2025)');
  context.writeln('Schist: Lisp dialect, self-hosting since Phase 6');
  break;
```

**Complexity**: Low (text + color codes)

---

#### 16. Konami Code Easter Egg

```javascript
// In terminal.js or tab-manager.js
let konamiSequence = [];
const konamiCode = [
  'ArrowUp', 'ArrowUp', 'ArrowDown', 'ArrowDown',
  'ArrowLeft', 'ArrowRight', 'ArrowLeft', 'ArrowRight',
  'b', 'a'
];

document.addEventListener('keydown', (e) => {
  konamiSequence.push(e.key);
  if (konamiSequence.length > konamiCode.length) {
    konamiSequence.shift();
  }

  if (JSON.stringify(konamiSequence) === JSON.stringify(konamiCode)) {
    // Trigger easter egg
    triggerGeologicalEasterEgg();
  }
});

function triggerGeologicalEasterEgg() {
  const term = tabManager.getActiveTab().terminal;
  term.writeln('\n\x1b[38;5;208m🌋 MAGMA CHAMBER UNLOCKED 🌋\x1b[0m');
  term.writeln('\x1b[38;5;46mOlivine crystals forming...\x1b[0m\n');

  // ASCII art of olivine crystal structure
  term.writeln('     ╱╲ ');
  term.writeln('    ╱  ╲');
  term.writeln('   ╱ Mg ╲    Olivine (Mg,Fe)₂SiO₄');
  term.writeln('  ╱      ╲');
  term.writeln(' ╱   Fe   ╲');
  term.writeln('╱__________╲');
  term.writeln('\x1b[0m');
}
```

**Justification**: Playful without breaking professionalism. Geological theme maintained.

**Complexity**: Low (event listener + ASCII art)

---

## III. Refined Color Palette Summary

### Final Recommended Palette

```css
:root {
  /* === BACKGROUNDS: Volcanic Layers === */
  --bg-primary: #1a1a1a;        /* Basalt foundation */
  --bg-secondary: #121212;      /* Obsidian inset */
  --bg-elevated: #232323;       /* Weathered surface */

  /* === ACCENTS: Geological Processes === */
  --accent-orange: #ff6b35;     /* Komatiite lava (1600°C) */
  --accent-green: #00ff88;      /* Olivine crystal */
  --accent-amber: #ffb84d;      /* Olivine in crossed polars */

  /* === TEXT: Stratigraphic Layers === */
  --text-primary: #e8e6e3;      /* Weathered feldspar */
  --text-secondary: #9a9896;    /* Granite matrix */
  --text-tertiary: #6b6966;     /* Schist gray */

  /* === BORDERS: Metamorphic Contacts === */
  --border: #2d2d2d;            /* Contact zone */
  --border-inset: #1a1a1a;      /* Intrusion boundary */
  --border-active: var(--accent-orange);

  /* === GLOWS: Phosphor & Heat === */
  --glow-green: rgba(0, 255, 136, 0.4);
  --glow-orange: rgba(255, 107, 53, 0.4);
  --glow-amber: rgba(255, 184, 77, 0.3);

  /* === SEMANTIC COLORS === */
  --color-success: var(--accent-green);
  --color-warning: var(--accent-amber);
  --color-error: #ff4444;
  --color-info: #4d9fff;
}
```

**Xterm.js Theme Update**:
```javascript
theme: {
  background: '#1a1a1a',
  foreground: '#e8e6e3',
  cursor: '#ff6b35',
  cursorAccent: '#1a1a1a',
  selectionBackground: 'rgba(255, 107, 53, 0.3)',

  // ANSI colors with geological names
  black: '#1a1a1a',           // Basalt
  red: '#ff6b35',             // Lava
  green: '#00ff88',           // Olivine
  yellow: '#ffb84d',          // Olivine (crossed polars)
  blue: '#4d9fff',            // Aquamarine
  magenta: '#ff6bcb',         // Rose quartz
  cyan: '#00ddff',            // Turquoise
  white: '#e8e6e3',           // Feldspar

  // Bright variants
  brightBlack: '#6b6966',     // Schist
  brightRed: '#ff8c61',       // Hot lava
  brightGreen: '#33ffaa',     // Bright olivine
  brightYellow: '#ffdd77',    // Gold
  brightBlue: '#70b3ff',      // Sky
  brightMagenta: '#ff8cdb',   // Pink tourmaline
  brightCyan: '#33eeff',      // Cyan glow
  brightWhite: '#ffffff',     // Pure quartz
}
```

---

## IV. Implementation Roadmap

### Phase 1: Core Visual Upgrades (2-3 hours)
**Critical must-haves**

1. Update color palette (1 hour)
   - CSS variables update
   - xterm.js theme update
   - Test contrast ratios

2. Typography optimization (30 min)
   - Letter-spacing adjustments
   - Rendering optimizations
   - Font fallback testing

3. Tab bar redesign (1 hour)
   - 3D bevel effects
   - Active state glow
   - Hover transitions

4. Status bar enhancement (30 min)
   - Recessed effect
   - LED indicators
   - Segment styling

### Phase 2: Retro Authenticity (2-3 hours)
**High-impact retro features**

5. CRT phosphor glow (30 min)
   - Terminal background gradient
   - Text shadow on green

6. Scan lines (15 min)
   - Pseudo-element overlay
   - Opacity tuning

7. Activity LED enhancement (30 min)
   - Glow effects
   - Pulse refinement

8. Terminal cursor (15 min)
   - Block glow
   - Blink animation

9. Boot sequence (1 hour)
   - HTML structure
   - Animation timing
   - JS integration

10. Favicon/icons (30 min)
    - SVG design
    - Export multiple sizes
    - HTML links

### Phase 3: Polish & Delight (2-3 hours)
**Nice-to-haves**

11. Terminal bezel (30 min)
    - Inset shadows
    - Vignette effect

12. Custom scrollbar (15 min)
    - Track styling
    - Thumb design

13. Modal enhancements (30 min)
    - Backdrop blur
    - Glow effects
    - Animation refinement

14. Focus states (30 min)
    - Keyboard navigation
    - Outline styling

15. Easter eggs (1 hour)
    - Welcome art
    - Konami code
    - Lore command

---

## V. Visual Effects Reference

### Inspiring Examples

**VT100/VT220 Terminals (1978-1983)**
- Green phosphor P1 glow
- Slight screen curvature (skip this)
- Block cursor with glow
- Geometric precision
- High contrast

**SGI IRIX Workstations (Jurassic Park, 1993)**
- Professional industrial design
- Beveled UI elements
- Status indicators
- Recessed displays
- Purposeful color usage

**Modern Retro Terminals**
- cool-retro-term (reference for effects, don't copy wholesale)
- Cathode app (macOS, excellent phosphor simulation)
- Windows Terminal (good scrollbar design)

**Zachtronics Games**
- TIS-100: Minimal UI, maximum function
- EXAPUNKS: Punk aesthetic, readable fonts
- Opus Magnum: Satisfying animations

---

## VI. Success Metrics

### Visual Quality
- **Immediate recognition**: "This looks like a 1987 workstation"
- **Professional feel**: Not a toy, a tool
- **Geological theme**: Clear without being heavy-handed
- **Retro authenticity**: CRT feel without kitsch

### User Experience
- **Fast**: No visual effects slow down usage
- **Accessible**: All WCAG AA compliance maintained
- **Discoverable**: Easter eggs found naturally
- **Satisfying**: Activity LED, boot sequence feel good

### Technical
- **Performant**: 60fps during all animations
- **Compatible**: Works in all modern browsers
- **Maintainable**: CSS well-organized, documented
- **Extensible**: Theme system ready for variants

---

## VII. Conclusion

Koma has an excellent foundation. These recommendations will transform it from "functional terminal" to "museum-quality retro computing artifact" while maintaining usability and professionalism.

**Core Philosophy**: Respect the past, perfect the present, imagine the alternate future.

**Visual Goal**: Make people say "I wish computers still looked like this."

**Implementation Strategy**: Start with critical items (color, typography, tab bar), add high-impact retro elements (glow, boot, LED), finish with delightful extras.

The geological theme is brilliant and underutilized - lean into it with color names, visual metaphors, and subtle references throughout the interface.

---

**Document Version**: 1.0
**Created**: 2025-11-11
**Project**: Koma Terminal v0.1
**Status**: Pre-implementation design spec
