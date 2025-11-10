# NAME

vein - text editor

## SYNOPSIS

`vein <file> [options]`

## DESCRIPTION

Open files in the CodeMirror text editor. Creates new files if they don't exist. The editor provides a clean interface for editing text files in the virtual filesystem.

## OPTIONS

**-f, --force**
  Open file even if the editor has unsaved changes.

## KEYBOARD SHORTCUTS

**F2 / Ctrl+`**
  Toggle between terminal and editor

**Ctrl+S**
  Save file

**Esc**
  Close editor (prompts if unsaved changes)

**Ctrl+Z**
  Undo

## EXAMPLES

Edit a file:
```
vein file.txt
```

Force open:
```
vein test.js --force
```

Create and edit new file:
```
vein /home/notes.md
```

## SEE ALSO

cat(1), write(1)
