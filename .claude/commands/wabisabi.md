# /wabisabi - The wabisabi Documentation Organization Method

**Philosophy**: Finding beauty in entropy-first development through multi-dimensional organization.

---

## CRITICAL: This is a DISCUSSION Tool, Not Automation!

Before doing ANYTHING, you must have a collaborative conversation with the user.

---

## Step 1: STOP and READ THE GUIDE

**First**, read the reorganization guide:
- **If in wabisabi project**: `docs/HOW_WE_ORGANIZED_THIS_PROJECT.md`
- **If in another project**: Ask user for path or if they want to copy it from wabisabi

This guide contains:
- Why the wabisabi method exists
- Four-tier design documentation system
- Multi-dimensional roadmap (domains × maturity × priority)
- When to use (and when NOT to use)
- Step-by-step application instructions

**Read it fully** before proceeding!

---

## Step 2: ASSESS Current State

Run these commands and SHOW RESULTS to user:

```bash
# Count documentation files
find . -name "*.md" -not -path "*/node_modules/*" -not -path "*/.git/*" | wc -l

# Check documentation size
du -sh docs design roadmap 2>/dev/null | head -10

# Check roadmap size (if exists)
wc -l ROADMAP.md 2>/dev/null || echo "No ROADMAP.md found"

# Check for existing organization
ls -d design roadmap 2>/dev/null || echo "No design/ or roadmap/ directories yet"
```

**Present findings** to user:
- "I found X documentation files totaling Y MB"
- "ROADMAP.md is Z lines" (or "No roadmap found")
- "design/ and roadmap/ directories [exist / don't exist]"

---

## Step 3: DISCUSS Need with User

Ask these questions explicitly:

1. **"Does documentation feel overwhelming?"**
   - If <10 files → Probably NO need for reorganization
   - If 10-50 files → Tier system might help
   - If 50+ files → Tier system highly recommended

2. **"Is the roadmap hard to navigate?"**
   - If <500 lines → Probably fine as-is
   - If >500 lines → Multi-dimensional might help
   - If >1000 lines → Strongly recommend reorganization

3. **"Is development 'entropy-first' (jumping between areas)?"**
   - Linear projects → Traditional roadmap fine
   - Jumping between features → Multi-dimensional shines

4. **"Do you work with AI assistants frequently?"**
   - If yes → Context management benefits are huge
   - If no → Still helps humans, but less critical

5. **"What would you like to reorganize?"**
   - [ ] Design documentation only
   - [ ] Roadmap only
   - [ ] Both
   - [ ] Neither (reorganization not needed!)

**IF USER SAYS "NOT NEEDED":**
- ✅ That's fine! Document why in a note
- ✅ Don't force the pattern
- ✅ Exit gracefully

---

## Step 4: PROPOSE Plan (Get Approval!)

Based on the guide and discussion, propose:

### For Design Documentation:
```
Proposed structure:
design/
├── README.md                # Navigation guide
├── SUMMARY.md               # Tier 0 high-level overview
├── [category]/              # Tier 1-2 organized by type
└── specs/                   # Tier 3 implementation details

What to move:
- [List specific files to move from docs/ to design/]
- [Which files stay in docs/ for API docs]

What to create:
- design/README.md (navigation)
- design/SUMMARY.md (Tier 0, ~100-300 lines)
```

### For Roadmap:
```
Proposed structure:
roadmap/
├── STATUS_MAP.md            # At-a-glance matrix
├── README.md                # Navigation guide
└── domains/                 # Functional areas
    ├── domain1.md
    └── domain2.md

Identified domains:
- [List 5-15 functional areas based on current roadmap]

What to move:
- Extract features from ROADMAP.md into domain files
- Keep ROADMAP.md as "vision" document
```

**ASK**: "Does this structure make sense? Should I proceed?"

**WAIT FOR EXPLICIT APPROVAL** before continuing!

---

## Step 5: Work Incrementally (WITH Feedback Loops!)

### Phase 1: Create Directory Structure
1. Create directories: `design/` and/or `roadmap/`
2. **PAUSE** - Show user what was created
3. Get approval to continue

### Phase 2: Create Navigation Guide
1. Create `design/README.md` or `roadmap/README.md`
2. **PAUSE** - Show user, get feedback
3. Adjust based on feedback

### Phase 3: Create Tier 0 Summary (Design) OR STATUS_MAP (Roadmap)
1. Create one example Tier 0 file
2. **PAUSE** - Show user
3. Get feedback on format/content
4. Adjust if needed

### Phase 4: Create ONE Example Domain/Category
1. Move/create one example (e.g., first domain file)
2. **PAUSE** - "Does this look right?"
3. Get approval before doing the rest

### Phase 5: Complete Reorganization
1. Only proceed if user approves the examples
2. Work through remaining files
3. Check in periodically ("Moved X files, Y to go - still looking good?")

### Phase 6: Update CLAUDE.md
1. Add documentation navigation section
2. Add roadmap navigation section
3. **PAUSE** - Show updates
4. Get final approval

---

## DO NOT:

❌ Auto-reorganize without discussion
❌ Move files without showing user first
❌ Create 20 directories at once
❌ Assume the pattern fits every project
❌ Skip the assessment questions
❌ Proceed without explicit approval
❌ Force reorganization if not needed

---

## DO:

✅ Read HOW_WE_ORGANIZED_THIS_PROJECT.md FIRST
✅ Ask questions before acting
✅ Show examples from wabisabi when helpful
✅ Work collaboratively with frequent pauses
✅ Stop if reorganization is overkill
✅ Celebrate when it's done!
✅ Update CLAUDE.md at the end

---

## Example Workflow

**User**: `/wabisabi`

**You**:
1. "Let me first read the reorganization guide..."
2. [Read docs/HOW_WE_ORGANIZED_THIS_PROJECT.md]
3. "Now let me assess your current documentation..."
4. [Run find/du/wc commands]
5. "I found 35 markdown files totaling 2.5MB, and a 1,200-line ROADMAP.md"
6. "Does the documentation feel overwhelming? Is the roadmap hard to navigate?"
7. [User responds]
8. "Based on your answers and the wabisabi pattern, I recommend reorganizing [design/roadmap/both]. Here's what I propose..."
9. [Show proposed structure]
10. "Does this make sense? Should I proceed?"
11. [WAIT for approval]
12. "Great! Let me start by creating the directory structure..."
13. [Create dirs, PAUSE]
14. "Directories created. Now I'll create the README..."
15. [Continue with feedback loops]

---

## When Reorganization is OVERKILL

Tell the user honestly if:
- <10 documentation files
- Roadmap <500 lines
- Linear development (not entropy-first)
- Solo project with no AI assistant usage
- Documentation already well-organized

**Say**: "Based on the assessment, your documentation is already manageable. The wabisabi reorganization pattern is designed for larger, more chaotic projects. I recommend keeping your current structure!"

---

## Integration with dorr (Future)

**Note**: This pattern will eventually be integrated into the `dorr` CLI tool for automated setup. For now, it's a collaborative manual process with AI assistance.

**Future vision**:
```bash
dorr setup wabisabi  # Auto-creates structure based on project analysis
```

---

## Philosophy

**wabisabi** (wabi-sabi): Finding beauty in imperfection

This organizational pattern embraces:
- Entropy-first development (work jumps around)
- Iterative refinement (features mature over time)
- Multi-dimensional thinking (domain × maturity × priority)
- Context awareness (AI-friendly documentation tiers)

**The goal**: Make chaos navigable without pretending it's linear.

---

**Remember**: Organization serves discovery. If the current structure works, don't reorganize just to reorganize!

**Last Updated**: 2025-11-15
**Origin**: wabisabi project (geological data workflows library)
