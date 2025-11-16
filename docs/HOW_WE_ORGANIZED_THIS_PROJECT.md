# How We Organized This Project

**Meta-Documentation**: A guide for applying wabisabi's organization patterns to other projects

**Created**: 2025-11-15
**Context**: After reorganizing design docs and roadmap, we documented the process to replicate on other projects (koma-terminal, JOURNEL, etc.)

---

## Why This Document Exists

After reorganizing wabisabi's documentation and roadmap, we realized the **patterns are reusable** across any software project with:
- Extensive documentation
- Non-linear development ("entropy-first")
- Need for AI assistant context management
- Multiple collaborators or future maintainers

This guide captures **what we did** and **how to apply it elsewhere**.

---

## Part 1: Design Documentation Tiering

### The Problem

**Before**:
- All design docs mixed with Sphinx API documentation
- 1,000+ line design system file
- 20 design documents totaling ~21MB
- Would overwhelm AI context (~700k tokens!)
- Hard to navigate for humans too

**Pain Point**: "Should I read all the design docs to understand this feature?"

### The Solution: Four-Tier System

```
design/
├── README.md                      # Navigation guide (Tier 0)
├── DESIGN_SYSTEM_SUMMARY.md       # Core principles (Tier 0)
│
├── design_system/                 # Tier 1: Complete specs
│   └── DESIGN_SYSTEM.md          # Full specification
│
├── workbenches/                   # Tier 2: On-demand
│   ├── GRADE_SHELL.md
│   ├── PATTERN_WORKBENCH.md
│   └── SLICE_VIEWER.md
│
├── architecture/                  # Tier 2: On-demand
│   ├── SECURITY_ARCHITECTURE.md
│   └── THEMING.md
│
├── components/                    # Tier 2: On-demand
│   ├── VALIDATOR_DESIGN.md
│   └── VERIFIER_DESIGN.md
│
└── specs/                         # Tier 3: Reference only
    ├── block_model_grid_detection.md
    └── transform_step_specification.md
```

**Tier Definitions**:
- **Tier 0**: Always-in-context (~2k tokens) - README + high-level summary
- **Tier 1**: Strategic context (~10k tokens) - Complete specifications when needed
- **Tier 2**: On-demand (~20-30k tokens) - Specific feature documentation
- **Tier 3**: Reference only - Use grep/search, don't load entire files

### Key Files Created

#### 1. `design/README.md` - Navigation Guide
**Contents**:
- Tier system explanation
- Quick navigation by task
- Context budget guidelines
- File size estimates
- Links to all major docs

**Purpose**: Help both humans and AI find relevant docs quickly

#### 2. `design/DESIGN_SYSTEM_SUMMARY.md` - Tier 0 Summary
**Contents**:
- Core design philosophy
- Tool architecture overview
- Color system categories (not all hex codes!)
- Component library list (not detailed specs)
- Quick reference links to full docs

**Size**: ~300 lines (vs. 1,140 lines for full spec)

**Purpose**: Quick orientation without overwhelming context

#### 3. Split Large Files
**Example**: DESIGN_SYSTEM.md (1,140 lines)
- **Summary**: 300 lines → Tier 0
- **Full spec**: 1,140 lines → Tier 1 (design_system/DESIGN_SYSTEM.md)

**Benefit**: Can load summary without full specification

### Context Impact

**Before**:
- Loading all docs = ~700k tokens (would overflow 200k context!)

**After**:
- Typical session: ~17k tokens for design docs
- Leaves ~143k for code and implementation

**Reduction**: ~40x reduction in typical context usage!

---

## Part 2: Multi-Dimensional Roadmap

### The Problem

**Before**:
- Single 1,768-line ROADMAP.md file
- Linear phase structure (Phase 1 → Phase 2 → Phase 3)
- Reality: Work jumps between areas ("entropy-first development")
- Hard to find: "What needs polish?" or "What's critical?"

**Pain Point**: "Where am I in this massive roadmap?"

### The Solution: Multi-Dimensional Organization

**Three Dimensions**:
1. **Domains** (WHAT area?) - drillhole, validation, html_tools, etc.
2. **Maturity** (HOW complete?) - polished, production, working, prototype
3. **Priority** (HOW urgent?) - critical, high, medium, exploration

```
roadmap/
├── STATUS_MAP.md                  # At-a-glance matrix (START HERE!)
├── README.md                      # Navigation guide
│
├── domains/                       # Browse by functional area
│   ├── drillhole.md
│   ├── validation.md
│   └── ...
│
├── maturity/                      # Browse by completeness
│   ├── polished.md
│   ├── production.md
│   ├── working.md
│   └── prototype.md
│
├── priority/                      # Browse by urgency
│   ├── critical.md
│   ├── high.md
│   └── medium.md
│
└── views/                         # Alternative perspectives
    ├── timeline.md
    ├── dependencies.md
    ├── completed.md
    └── blockers.md
```

### Tag System

Each feature in domain files has tags:
```markdown
#### Feature Name
**Tags**: `#domain-name` `#maturity-level` `#priority-level` `#feature-type`
**Status**: Description
**Dependencies**: What it needs
**Blocks**: What depends on this
```

**Example**:
```markdown
#### Drillhole Compositing
**Tags**: `#drillhole` `#polished` `#critical` `#core-workflow`
**Status**: Complete and production-ready
**Dependencies**: None
**Blocks**: None
```

**Benefit**: Multi-dimensional searching - find features by domain AND maturity AND priority

### Key Files Created

#### 1. `roadmap/STATUS_MAP.md` - At-a-Glance Overview
**Contents**:
- Visual matrix (domains × maturity with priority markers)
- Progress by priority
- Blockers & dependencies
- Phase progress tracking
- Recent momentum

**Purpose**: Answer "where are we?" in 30 seconds

**Example**:
```
| Domain      | Prototype | Working | Production | Polished |
|-------------|-----------|---------|------------|----------|
| Drillhole   | 🧪        | 🔧      | ✅         | ✅       |
| Validation  | 🧪        | 🔧      | ✅         | ✅       |

Legend: ¹Critical  ²High  ³Medium
```

#### 2. `roadmap/domains/*.md` - Feature Details
**Contents for each domain**:
- Features organized by maturity (polished → prototype)
- Tags for multi-dimensional navigation
- Dependencies and blockers
- Next steps and remaining work
- Related domains and files

**Example**: `roadmap/domains/drillhole.md` contains ALL drillhole features, regardless of phase

#### 3. `roadmap/README.md` - Navigation Guide
**Contents**:
- Three-dimensional navigation explanation
- Quick start ("finding work to do?")
- Understanding tag system
- How to use the system (scenarios)
- Philosophy: "entropy-first development"

### Benefits

**Before**: Linear roadmap pretends work is sequential
```
Phase 1 → Phase 2 → Phase 3 (unrealistic!)
```

**After**: Multi-dimensional shows reality
```
         Polished → Production → Working → Prototype
Drillhole:   ✅          ✅         🔧         🧪
Validation:  ✅          ✅         🔧         🧪
HTML Tools:  ✅          ✅         🔧         🧪
```

**Enables**:
- ✅ Find work by domain (working on drillholes? → `domains/drillhole.md`)
- ✅ Find work by maturity (want to polish? → `maturity/working.md`)
- ✅ Find work by priority (what's critical? → `priority/critical.md`)
- ✅ Honest about state (shows what's experimental vs. production)

---

## Part 3: Integration with Obsidian

### The Problem

**Want**: Browse/edit project docs in Obsidian (graph view, backlinks, search)
**Challenge**: Don't want to duplicate files (breaks version control)

### The Solution: Junction Points

**Windows Junction Points**:
- Create pointer from Obsidian vault to project directories
- No duplication - edits update git repo directly
- No admin/developer mode required!
- Edits in Obsidian = edits in git repo

**Setup**:
```powershell
# From Obsidian vault, create junction to design docs
New-Item -ItemType Junction -Path "vault\projects\myproject\design" -Target "C:\path\to\repo\design"

# Create junction to roadmap
New-Item -ItemType Junction -Path "vault\projects\myproject\roadmap" -Target "C:\path\to\repo\roadmap"
```

**Result**:
```
ObsidianVault/
└── Projects/
    └── myproject/
        ├── design\    → C:\...\repo\design
        └── roadmap\   → C:\...\repo\roadmap
```

**Benefits**:
- ✅ Use Obsidian's graph view for documentation
- ✅ Tag-based filtering
- ✅ Backlinks between features
- ✅ Full-text search
- ✅ No duplication (version controlled in git)

**Limitation**: Junctions don't sync via Obsidian Sync (pointer only, use on primary machine)

---

## Applying This to Your Project

### Step 1: Assess Documentation Size

```bash
# Check documentation size
find docs -name "*.md" | wc -l       # Number of files
du -sh docs                          # Total size
wc -l docs/**/*.md | sort -rn        # Largest files
```

**Decision**:
- <10 files, <100k total → Probably don't need tiering
- 10-50 files, 100k-500k → Tier system helpful
- 50+ files, >500k → Tier system essential

### Step 2: Categorize Documents

**Design Docs** vs. **API Docs**:
- Design docs → `design/` directory
- API docs → Keep in `docs/` (for Sphinx/Docusaurus/etc.)

**Within design docs, identify**:
- High-level overviews (Tier 0 candidates)
- Complete specifications (Tier 1)
- Feature-specific docs (Tier 2)
- Implementation details (Tier 3)

### Step 3: Create Tier Structure

```bash
mkdir -p design/{tier1,tier2,tier3}
# Or organize by type:
mkdir -p design/{architecture,components,workbenches,specs}
```

**Create key files**:
1. `design/README.md` - Navigation guide
2. `design/SUMMARY.md` - High-level overview (Tier 0)
3. Move existing docs into appropriate tiers/categories

### Step 4: Assess Roadmap Structure

**Questions**:
- Does roadmap pretend work is linear? (Phase 1 → 2 → 3)
- Is work actually jumping between areas? ("entropy-first")
- Hard to find "what needs polish" or "what's blocked"?

**If yes** → Multi-dimensional roadmap would help!

### Step 5: Create Roadmap Dimensions

**Identify domains** (functional areas):
```bash
grep "^## \|^### " ROADMAP.md  # Extract section headings
# Group into logical domains (usually 5-15 domains)
```

**Example domains** (adjust for your project):
- Frontend, backend, database, API, DevOps, docs, testing, etc.

**Create structure**:
```bash
mkdir -p roadmap/{domains,maturity,priority,views}
```

### Step 6: Split Roadmap into Domains

For each domain:
1. Create `roadmap/domains/domain-name.md`
2. Extract relevant features from ROADMAP.md
3. Organize by maturity (polished → prototype)
4. Add tags (`#domain`, `#maturity`, `#priority`)

**Template for domain file**:
```markdown
# Domain Name

**Domain**: `#domain-name`
**Related Domains**: [other domains]

## Features by Maturity

### ✅ Polished
#### Feature Name
**Tags**: `#domain` `#polished` `#priority`
**Status**: ...
**Dependencies**: ...

### ✅ Production
...

### 🔧 Working
...

### 🧪 Prototype
...
```

### Step 7: Create STATUS_MAP.md

**Matrix showing**:
- Domains × Maturity
- Priority markers
- Phase progress
- Blockers

**Purpose**: Answer "where are we?" at a glance

### Step 8: Update CLAUDE.md

Add sections for:
- Design documentation (tiers, navigation)
- Roadmap (multi-dimensional, tag system)
- How to find information
- Context budget guidelines

### Step 9: Optional: Obsidian Integration

```powershell
# Create junctions from Obsidian vault
New-Item -ItemType Junction -Path "vault\projects\myproject\design" -Target "C:\path\to\repo\design"
New-Item -ItemType Junction -Path "vault\projects\myproject\roadmap" -Target "C:\path\to\repo\roadmap"
```

---

## Example: Applying to koma-terminal

### Current State (Hypothetical)

```
koma-terminal/
├── README.md
├── docs/
│   ├── architecture.md (500 lines)
│   ├── features.md (800 lines)
│   └── roadmap.md (400 lines)
└── ...
```

### After Reorganization

```
koma-terminal/
├── design/
│   ├── README.md                  # Navigation guide
│   ├── ARCHITECTURE_SUMMARY.md    # Tier 0 (~100 lines)
│   ├── architecture/              # Tier 1
│   │   └── ARCHITECTURE.md        # Full spec (500 lines)
│   └── features/                  # Tier 2
│       └── TERMINAL_EMULATION.md
│
├── roadmap/
│   ├── STATUS_MAP.md
│   ├── README.md
│   └── domains/
│       ├── terminal.md
│       ├── ui.md
│       ├── plugins.md
│       └── performance.md
│
└── docs/                          # API documentation (unchanged)
```

**Benefits**:
- AI can load ARCHITECTURE_SUMMARY (Tier 0) by default
- Load full ARCHITECTURE (Tier 1) only when working on architecture
- Roadmap shows maturity across domains
- Easy to find "what needs polish in terminal emulation?"

---

## Checklist for Any Project

### Design Documentation

- [ ] Created `design/` directory
- [ ] Created `design/README.md` (navigation guide)
- [ ] Created high-level summary (Tier 0, ~100-300 lines)
- [ ] Organized docs into tiers/categories
- [ ] Moved design docs out of API docs directory
- [ ] Updated CLAUDE.md with design doc navigation

**Estimated Time**: 2-4 hours depending on doc count

### Roadmap

- [ ] Created `roadmap/` directory
- [ ] Identified domains (5-15 functional areas)
- [ ] Created `roadmap/STATUS_MAP.md`
- [ ] Created `roadmap/README.md` (navigation guide)
- [ ] Created domain files with tags
- [ ] Organized features by maturity
- [ ] Marked dependencies and blockers
- [ ] Updated CLAUDE.md with roadmap navigation

**Estimated Time**: 3-6 hours depending on roadmap complexity

### Obsidian Integration (Optional)

- [ ] Created junctions from vault to `design/`
- [ ] Created junctions from vault to `roadmap/`
- [ ] Tested editing in Obsidian
- [ ] Verified changes appear in git

**Estimated Time**: 15-30 minutes

---

## Lessons Learned from wabisabi

### What Worked Well

✅ **Tier 0 summaries** - Game-changer for context management
✅ **Multi-dimensional roadmap** - Matches how work actually happens
✅ **Tag system** - Enables flexible filtering
✅ **STATUS_MAP** - Quick "where are we?" reference
✅ **Junction points** - Obsidian integration without duplication

### What to Avoid

❌ **Over-organizing** - Don't create 20 tiers, 4 is enough
❌ **Premature optimization** - Wait until docs/roadmap are unwieldy
❌ **Losing original context** - Keep ROADMAP.md as "vision" document
❌ **Too many domains** - 5-15 is sweet spot, not 50
❌ **Forgetting to update CLAUDE.md** - AI needs navigation help too!

### When to Apply This

**Good fit**:
- 20+ design documents
- Roadmap >500 lines
- "Entropy-first" development (work jumps around)
- Multiple collaborators
- Working with AI assistants frequently

**Overkill**:
- <10 documentation files
- Linear development (rare but exists!)
- Solo project with no external collaborators

---

## Tools & Automation Ideas

### Current: Manual

All organization done manually (intentional - discover pain points first)

### Future: `dorr` Tool

**Planned CLI** for roadmap management:
```bash
dorr list --domain terminal --maturity working
dorr status  # Auto-generate STATUS_MAP.md
dorr update "Feature" --maturity production
```

**See**: `roadmap-tool` project in JOURNEL for full design

### Future: Documentation Linter

Could validate:
- All domain files have required tags
- STATUS_MAP matches domain files
- No orphaned features
- Tier 0 summary stays under token limit

---

## Related Resources

**wabisabi Examples**:
- `design/README.md` - Design doc navigation
- `design/DESIGN_SYSTEM_SUMMARY.md` - Tier 0 summary example
- `roadmap/STATUS_MAP.md` - Roadmap matrix example
- `roadmap/domains/drillhole.md` - Domain file example

**JOURNEL Projects**:
- `journel` project - Notes on Obsidian integration
- `roadmap-tool` (dorr) - Future automation ideas

**Original Files** (for comparison):
- `ROADMAP.md` - Original 1,768-line roadmap (kept for vision)
- `docs/DESIGN_SYSTEM.md` was 1,140 lines (now in `design/design_system/`)

---

## Questions?

If applying this to another project and unsure about:
- How to categorize a specific document
- Whether a domain is too broad/narrow
- How many tiers to use
- Whether to use this at all

→ Start simple, iterate based on actual usage!

---

**Remember**: This system emerged from real pain points, not premature optimization. Apply it when you feel the pain, not before!

**Philosophy**: "Organize for discovery, not for perfection."

---

**Last Updated**: 2025-11-15
**Status**: Living document - will evolve as we apply to other projects
**Next Test**: Apply to koma-terminal and document what works/doesn't work
