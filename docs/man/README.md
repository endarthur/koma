# Koma Man Pages

This directory contains the source markdown files for Koma's manual pages.

## Editing Man Pages

1. **Edit files here** - All `.md` files in this directory
2. **Run build script** - `python build-man-pages.py` from the repository root
3. **Test in Koma** - Open Koma and run `man <command>` to verify

## Format

Man pages use standard markdown with the following sections:

- **NAME** - Command name and brief description
- **SYNOPSIS** - Command syntax
- **DESCRIPTION** - Detailed description
- **OPTIONS** - Available flags and options (if any)
- **EXAMPLES** - Usage examples with code blocks
- **SEE ALSO** - Related commands

## Build Process

The build script (`build-man-pages.py`) reads all `.md` files from this directory and generates `src/utils/man-pages.js`, which bundles them into a single JavaScript module.

**Important:** Do not edit `src/utils/man-pages.js` directly - it's auto-generated and will be overwritten!

## Adding New Man Pages

1. Create a new `.md` file (e.g., `newcmd.1.md`)
2. Follow the format of existing man pages
3. Run `python build-man-pages.py`
4. The new page will automatically be available via `man newcmd`

## GitHub Pages Deployment

For GitHub Pages deployment, add this to your workflow:

```yaml
- name: Build man pages
  run: python build-man-pages.py
```

This ensures the man pages are always up-to-date when deployed.
