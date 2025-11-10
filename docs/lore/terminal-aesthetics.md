# Terminal Aesthetics: Jurassic Park, Zachtronics, and Industrial Minimalism

## The Formative Experience: Jurassic Park (1993)

**"It's a Unix system! I know this!"**

For anyone born around 1990, that scene from Jurassic Park was *formative*. Lex sits down at an SGI workstation running IRIX, navigates a 3D file browser (FSN - "Fusion"), and manages to lock the doors and save everyone.

### What That Scene Did

1. **Made Unix look cool** - Not nerdy, not academic. *Heroic*.
2. **Showed workstations as tools** - Professional, industrial, purposeful
3. **Demonstrated file systems spatially** - Files as objects in 3D space
4. **Created an aesthetic** - Green text, CRT glow, technical precision

The Koma aesthetic is directly descended from that moment. Not the 3D visualization (we're text-mode), but the *feeling*:
- **Industrial design**
- **Technical competence**
- **Purposeful interfaces**
- **Green phosphor glow**

### The SGI Influence

Those weren't props. Those were real SGI Indigo workstations running real Unix:
- IRIX operating system (SGI's Unix)
- 24-bit color graphics
- OpenGL acceleration
- Professional CAD/visualization tools

Jurassic Park's control room was a *geek paradise*. Koma inherits that DNA: serious computing for serious work, but with style.

## Zachtronics Games: Puzzle Interfaces Done Right

If Jurassic Park provided the *aesthetic*, Zachtronics provided the *interaction design*.

### TIS-100 (2015)

**The assembly language puzzle game.**

You program nodes with a simple assembly-like language:
```
MOV UP ACC
ADD 5
MOV ACC DOWN
```

**What Koma learned from TIS-100:**
- Minimalist interfaces work for complex tasks
- Text > graphics for some problems
- Assembly-level thinking is satisfying
- Documentation matters (TIS-100 had a PDF manual!)
- Constraints breed creativity

### EXAPUNKS (2018)

**Hacking as puzzle-solving.**

You write programs (EXAs) that navigate networks:
```
LINK 800
GRAB 200
SEEK 9999
REPL SENDER
```

**What Koma learned from EXAPUNKS:**
- Terminal interfaces can be beautiful
- Code is content
- Zines as documentation
- Underground/hacker aesthetic
- Text-based UIs are engaging

### Opus Magnum / SpaceChem

**Visual programming games.**

While not terminal-based, these taught:
- Optimization as gameplay
- Multiple solutions to one problem
- Satisfying mechanics
- "Watch it run" satisfaction

### Last Call BBS: 20th Century Food Court

**The Eurorack inspiration.**

"20th Century Food Court" is a puzzle game simulating a modular synthesizer (Eurorack format). You patch together modules to create sounds.

**Original Koma plan:** Flow-based editor that looked like Eurorack. Patch cords connecting commands. Visual dataflow.

**Why it didn't work:** Too finicky in browser. Too much UI scaffolding. Lost the immediacy of a terminal.

**What we kept:** The industrial aesthetic. The modular thinking (Unix pipes!). The idea of composable components.

**What we changed:** Pipes instead of patch cords. Text instead of graphics. Terminal instead of canvas.

The result: More Unix, less Eurorack. Better fit for the medium.

## Industrial Minimalism: Less is More

### Characteristics

1. **Functional over decorative**
   - No unnecessary chrome
   - Every element serves a purpose
   - Form follows function

2. **Monospace typography**
   - IBM Plex Mono (our choice)
   - Fixed-width = predictable layout
   - Readable at 13px

3. **Limited color palette**
   - Deep charcoal (#1a1a1a)
   - Lava orange (#ff6b35)
   - Phosphor green (#00ff88)
   - High contrast, purposeful

4. **Geometric precision**
   - Aligned to grid
   - Clear hierarchy
   - No ambiguity

5. **Technical honesty**
   - Show what things are
   - No skeuomorphism
   - No faux 3D

### Historical Influences

**1970s-80s Terminals:**
- VT100 (1978) - The standard
- ADM-3A (1976) - Simple, effective
- Wyse 50/60 (1980s) - Workhorse
- Green phosphor CRTs - Easy on eyes for long sessions

**1990s Workstations:**
- SGI (seen in Jurassic Park)
- Sun SPARCstation (Unix workhorses)
- NeXT (elegant Unix)
- HP 9000 series (engineering focus)

**Industrial Design:**
- Dieter Rams (Braun, "less but better")
- Bauhaus (form follows function)
- Swiss design (typography, grids, clarity)

## The 3px Activity LED

**Vertical bar, right edge:**
- Green = reading
- Orange = writing
- Red = error
- Gray = idle

**Why it works:**
- Peripheral vision catches it
- Doesn't obstruct content
- Industrial feedback (like HDD LEDs)
- Satisfying to watch during operations

**Inspiration:**
- Vintage hard drive LEDs
- Tape drive indicators
- Industrial equipment status lights
- "Machine is working" feedback

## Color Theory: Geology + CRT

### Phosphor Green (#00ff88)

**Origin:** P1 phosphor (green) from early CRT terminals

**Geological:** Olivine's color in thin section

**Usage:** Primary text, status indicators, success

**Psychology:** Readable, not fatiguing, "go ahead"

### Lava Orange (#ff6b35)

**Origin:** Hot lava glow, volcanic heat

**Geological:** 1600°C komatiite lava

**Usage:** Accents, highlights, activity

**Psychology:** Energy, warmth, attention

### Deep Charcoal (#1a1a1a)

**Origin:** Volcanic rock, stable foundation

**Geological:** Weathered basalt, ancient crust

**Usage:** Background, containers

**Psychology:** Depth, focus, professionalism

## Why Text Mode?

In 2025, why not use Canvas/WebGL/fancy graphics?

### Advantages of Text:

1. **Accessibility**
   - Screen readers work
   - Copy-paste works
   - Search works
   - Zoom works

2. **Performance**
   - Renders fast
   - Low memory
   - No GPU needed
   - Works on anything

3. **Composability**
   - Pipes work naturally
   - Grep/sed/awk work
   - Unix philosophy preserved
   - Text as universal interface

4. **Longevity**
   - Text files last forever
   - No proprietary formats
   - Human-readable
   - Future-proof

5. **Focus**
   - Content over chrome
   - No visual clutter
   - Cognitive clarity
   - Professional aesthetic

### xterm.js Capabilities

Modern terminals are powerful:
- Unicode (full character set)
- ANSI colors (16.7 million colors)
- Box drawing characters
- Braille patterns (pseudo-graphics)
- Mouse support
- Hyperlinks
- Images (Kitty protocol)

**Koma's choice:** Use enough for clarity, not so much it becomes noise.

## Design Principles

### 1. Clarity Over Cleverness

```
Good:  Error: file not found
Bad:   ☠️ Oops! Something went wrong! 😅
```

### 2. Information Dense, Not Cluttered

```
Good:  44 commands, 6 modules, 8 processes
Bad:   [Loading...] Please wait... Almost there...
```

### 3. Consistent Visual Language

- Commands: plain text
- Files: plain text
- Paths: /forward/slashes
- Options: --long-form, -s short
- Success: green
- Error: red
- Info: default color

### 4. Respect User's Time

- Fast startup
- No splash screens
- No unnecessary animations
- Instant feedback
- Clear error messages

### 5. Professional, Not Playful

Koma is for work. It can be *satisfying* and *elegant*, but not *cute*. It's a tool, not a toy.

## The Retrospec Aesthetic

**Retrospec** = Retrospective + Specification + Respect

Building technology that:
- Could have existed in 1987
- Would have been better than what actually existed
- Respects the constraints of the era
- Uses modern knowledge to perfect the concept

**Not:**
- Mere nostalgia
- Artificial limitations
- Slavish reproduction

**But:**
- Taking the best ideas from the past
- Applying modern understanding
- Creating what *should* have existed
- Honoring the craft

## Influences Summary

| Source | Contribution |
|--------|-------------|
| Jurassic Park | Industrial Unix aesthetic, SGI workstations |
| Zachtronics | Minimalist puzzle interfaces, TIS-100 assembly |
| 20th Century Food Court | Eurorack visual thinking (abandoned) |
| VT100 terminals | Green phosphor, functional design |
| SGI workstations | Professional tools with style |
| Dieter Rams | "Less but better" philosophy |
| IBM Plex Mono | Modern monospace typography |
| Unix philosophy | Text streams, composability |
| Geology field work | Ruggedized, purposeful tools |

## The Result

**Koma Workstation aesthetic = Industrial Minimalist Unix Terminal for Geology**

- Clean as a VT100
- Purposeful as an SGI
- Satisfying as TIS-100
- Geological as komatiite
- Professional as a field instrument
- Timeless as Unix

---

**Related Lore:**
- [Origin Story](./origin-story.md)
- [Komatiite Connection](./komatiite-connection.md)
- [Retrospec Engineering](./retrospec-engineering.md)

**Last Updated:** 2025-11-10
