# The Origin Story: Craton Systems and the Koma Workstation

## The Problem (1983)

In the early 1980s, geology departments worldwide faced a computational crisis. Structural analysis, petrology calculations, and geochemical data processing required computing power, but the tools were inadequate:

- **Punch cards** for FORTRAN programs (submitted in the morning, results by evening if you were lucky)
- **Mainframe batch jobs** with cryptic JCL (Job Control Language)
- **Calculator-based workflows** for anything interactive
- **Hand-plotting** on paper for stereonets and ternary diagrams

Meanwhile, a small group of geologists at various universities had discovered **Unix**. They'd seen the power of pipes, text streams, and composable tools. They'd used terminals with actual feedback. And they wanted more.

## The Founding (1984)

**Craton Systems, Inc.** was founded in Vancouver, BC in January 1984 by:

- **Dr. Margaret Keleman** - Structural geologist from UBC, Unix enthusiast
- **Dr. James Pye** - Petrologist from University of Toronto, FORTRAN veteran
- **Robert Chen** - Computer scientist from SFU, kernel hacker
- **Sarah Blackstone** - Hardware engineer from HP, terminal designer

The vision: **"What if geologists had their own workstation? Not a general-purpose computer with geology software bolted on, but a machine designed from the ground up for geological thinking?"**

They called it **The Koma Project** - from *komatiite*, the ultramafic volcanic rock that represented the most basic, fundamental, ancient geology. The name was perfect: ultra-basic rock → ultra-basic terminal → ultra-powerful tools.

## The Technology Stack (1984-1987)

### Olivine Kernel

Named after the primary mineral in komatiites, the Olivine kernel was designed for stability and simplicity:

- **Single-user design** (no multi-user complexity)
- **Persistent filesystem** (using early database technology)
- **Process model optimized for long-running analyses**
- **Built-in scheduler** for automated data processing

The team joked: "Like olivine crystallizes first from komatiitic magma, Olivine is the foundation everything else crystallizes from."

### Spinifex Graphics Engine

The breakthrough came from Sarah Blackstone's insight about komatiitic textures. **Spinifex** - the distinctive texture of acicular (needle-like) olivine crystals in komatiites - became the name for their terminal graphics system.

"If you look at spinifex texture under a microscope," Sarah explained, "it's this beautiful pattern of intersecting lines and needles. That's what our graphics engine does - it weaves terminal characters into patterns that represent geological data."

The Spinifex engine could:
- Render stereonets using Unicode box drawing
- Plot ternary diagrams with ASCII art
- Display rose diagrams for orientation data
- Generate contour maps from field measurements

All in text mode. No framebuffer required.

### Koma Shell

The shell needed to be:
- **Simple enough for geologists** who'd been using FORTRAN
- **Powerful enough for Unix experts** who knew the potential
- **Mnemonic enough** to match geological thinking

It followed POSIX standards (as they emerged) but with geological flair. Pipes were like magma conduits - data flowing from one process to another. Redirection was like stratigraphic deposition - accumulating layers of analysis.

### Provenance Package Manager

By 1986, users were sharing geological analysis scripts. The team needed a way to distribute and track these tools. They called it **Provenance** - the geological term for tracking the source and history of sediments.

`prov install stereonet-extended` would fetch enhanced stereonet plotting tools from other Koma users. The package manager tracked dependencies like a geologist tracks sediment transport pathways.

## The Product Line (1985-1987)

### Koma Workstation Model 1 (1985)
- 16-bit processor
- 512 KB RAM (expandable to 2 MB)
- 20 MB hard disk
- Green phosphor CRT (olivine green, naturally)
- Olivine kernel v1.0
- Price: $8,500 USD

### Koma Workstation Model 2 (1986)
- 32-bit processor
- 2 MB RAM (expandable to 8 MB)
- 40 MB hard disk
- Color CRT (green/orange/charcoal palette)
- Spinifex graphics enhanced
- Price: $12,000 USD

### Koma Field Terminal (1987)
- Portable (17 lbs)
- Battery powered (4 hours)
- Built-in modem
- Ruggedized for field use
- "Take Unix to the outcrop"
- Price: $6,500 USD

## The Marketing (1987)

**Print Ad Copy:**

```
┌─────────────────────────────────────────────────────────┐
│                                                         │
│               CRATON SYSTEMS PRESENTS                   │
│                                                         │
│                  KOMA WORKSTATION                       │
│                                                         │
│            "Like the mantle drives the plates,          │
│             Koma drives your geology."                  │
│                                                         │
│   ✓ Olivine Kernel - Stable as the mineral itself     │
│   ✓ Spinifex Graphics - Crystalline clarity           │
│   ✓ Provenance Package Manager - Track your tools     │
│   ✓ POSIX Compatible - Unix power, geological focus   │
│                                                         │
│   From komatiite analysis to comprehensive petrology,  │
│   Koma brings 3.5 billion years of geological wisdom   │
│   to your desktop.                                      │
│                                                         │
│   Ultramafic. Ultra-powerful. Ultra-simple.            │
│                                                         │
│   Craton Systems, Inc. - Vancouver, BC                 │
│   "Building on bedrock since 1984"                     │
│                                                         │
└─────────────────────────────────────────────────────────┘
```

## The Users (1985-1990)

Koma Workstations found homes in:

### Academic Institutions
- **UBC Department of Earth Sciences** (12 units)
- **MIT Department of Earth, Atmospheric, and Planetary Sciences** (8 units)
- **University of Toronto Geology** (15 units)
- **Australian National University** (6 units for komatiite research - full circle!)

### Research Organizations
- **Geological Survey of Canada** (20+ units)
- **USGS** (various branches)
- **Mining companies** (exploration divisions)

### Field Camps
- **Barberton Greenstone Belt, South Africa** (Koma Field Terminal)
- **Abitibi Greenstone Belt, Canada** (Multiple Field Terminals)
- **Yilgarn Craton, Western Australia** (Where komatiites were first named!)

## Notable Projects

**1986: Abitibi Komatiite Project**
Dr. Keleman used a Koma Workstation to process over 500 structural measurements from komatiite flows. The stereonet analysis, done interactively in the field, revealed previously unrecognized fold patterns. Paper published in *Nature*, 1987.

**1987: Greenland Archean Crustal Studies**
Teams in Greenland used Koma Field Terminals to process geochemical data in real-time. The ability to run XRF classification and ternary plots at camp changed their sampling strategy mid-expedition.

**1988: Teaching Revolution**
University of Toronto replaced their FORTRAN labs with Koma terminals. Students learned structural geology by *doing* stereonet plots interactively, not waiting days for batch jobs.

## The Legacy (1990-Present)

Craton Systems was acquired by a larger workstation manufacturer in 1990. The Koma product line was discontinued in favor of more general-purpose machines.

But the software lived on:
- Olivine kernel concepts influenced later embedded systems
- Spinifex graphics techniques appeared in other terminal applications
- The provenance tracking system inspired modern package managers
- Many geology professors kept their Koma Workstations running well into the 2000s

**The Last Known Working Unit:**
As of 2025, a Koma Workstation Model 2 still boots in the Department of Earth Sciences at UBC. It displays a login prompt in glowing olivine green:

```
Koma Workstation - Olivine v1.2.4
Craton Systems, Inc. (c) 1986

login: _
```

Students occasionally fire it up, not knowing they're using a piece of retrospec history - technology that never existed but should have.

---

## The Retrospec Truth

*In our timeline, Koma never existed. Geologists continued using FORTRAN and eventually graduated to generic Unix workstations with geology software packages.*

*But in the retrospec timeline - the one where geologists got together in 1984 and built their own system from scratch - Koma Workstations changed how geology was done. They proved that domain-specific computing, built by experts for experts, could be both powerful and simple.*

*We're building that system now. Not in 1984, but in 2025. Not in hardware, but in a browser. But the vision remains:*

**Ultramafic computing. From the mantle to the terminal.**

---

**Related Lore:**
- [The Olivine Kernel](./olivine-kernel.md)
- [Komatiite Connection](./komatiite-connection.md)
- [Spinifex Graphics](./spinifex-graphics.md)
- [Terminal Aesthetics](./terminal-aesthetics.md)
- [Retrospec Engineering](./retrospec-engineering.md)

**Last Updated:** 2025-11-10
