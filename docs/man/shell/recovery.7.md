# NAME

recovery - Koma emergency recovery system

## SYNOPSIS

**Six-finger salute:** `Ctrl+K` followed by `R E I S U B`

## DESCRIPTION

The Koma recovery system provides a progressive disaster recovery mechanism inspired by Linux's SysRq REISUB sequence. When the terminal becomes unresponsive or the system is in an unstable state, the six-finger salute provides escalating recovery actions.

The recovery sequence is designed to be typed slowly (one key at a time with visual feedback) rather than all at once, allowing you to stop at the appropriate recovery level.

## THE SIX-FINGER SALUTE

To initiate recovery:

1. Press `Ctrl+K` to enter command mode
2. Type the recovery keys one at a time: `R E I S U B`

Each key performs a progressively more aggressive recovery action. The status bar shows your progress through the sequence and prompts for the next key.

**Timeout:** If you wait more than 3 seconds between keys, the sequence resets and you must start over with `Ctrl+K`.

## RECOVERY ACTIONS

### R - Reset Terminal

**Action:** Clear terminal screen and reset shell state

**When to use:**
- Terminal output is corrupted or garbled
- Visual artifacts in the terminal
- Display issues after a failed command

**What it does:**
- Clears the terminal screen
- Resets the shell prompt
- Preserves command history and VFS

**Safe:** Yes - No data loss

**Example scenario:** After accidentally `cat`ing a binary file that corrupted the display.

---

### E - Export Backup

**Action:** Download VFS backup as `.ore` file

**When to use:**
- Before attempting risky operations
- To create an emergency backup
- Before proceeding with more aggressive recovery steps

**What it does:**
- Exports entire VFS as raw JSON dump
- Downloads file as `magma-dump-[timestamp].magma`
- File contains complete filesystem snapshot

**Safe:** Yes - Read-only operation

**File format:** `.magma` (molten VFS dump) - uncompressed JSON dump of the entire IndexedDB VFS. Named after the molten rock from which olivine crystallizes, this is a more primitive format than `.kmt` tape archives.

**Example scenario:** Terminal is acting strange and you want a backup before trying more aggressive fixes.

---

### I - Initialize Kernel

**Action:** Restart the Olivine kernel worker

**When to use:**
- Kernel is unresponsive
- VFS operations are failing
- Suspected kernel corruption

**What it does:**
- Terminates the current kernel worker
- Creates a new kernel worker
- Reinitializes VFS connection
- Reloads standard library modules

**Safe:** Mostly - Active processes will be killed, but VFS data is preserved

**Warning:** Any running background processes will be terminated.

**Example scenario:** VFS commands are failing with strange errors, or file operations are hanging.

---

### S - Save Backup

**Action:** Save VFS backup to internal filesystem

**When to use:**
- To create an internal restore point
- Before system-level changes
- As a fallback if external download fails

**What it does:**
- Exports VFS as raw JSON
- Saves to `/home/.koma-backup-[timestamp].magma`
- Backup remains in VFS for later restoration

**Safe:** Yes - Creates internal backup

**Note:** The backup file itself is stored in the VFS, so it won't help if the VFS is completely corrupted. Use **E** (Export) for a truly external backup.

**Example scenario:** You want to experiment with system changes but keep an easy rollback point.

---

### U - Unload Processes

**Action:** Terminate all running processes

**When to use:**
- Runaway processes consuming resources
- System is sluggish or unresponsive
- Before kernel reinitialization
- Process manager is in bad state

**What it does:**
- Kills all running background processes
- Clears process manager state
- Frees up resources

**Safe:** Mostly - Running processes will be lost

**Warning:** Any background scripts or scheduled tasks will be terminated immediately.

**Example scenario:** A background process is stuck in an infinite loop and making the terminal unresponsive.

---

### B - Bounce (Hard Restart)

**Action:** Reload the entire page

**When to use:**
- Last resort when nothing else works
- Kernel is completely broken
- UI is unresponsive
- After major errors

**What it does:**
- Performs a full page reload
- Restarts all JavaScript
- Reinitializes entire Koma system
- Reloads VFS from IndexedDB

**Safe:** Yes if VFS is healthy, **data loss possible** if VFS is corrupted

**Warning:** This is the most aggressive recovery option. Any unsaved terminal state, command history from the current session, or data not in the VFS will be lost. The VFS itself persists in IndexedDB and will be restored.

**Example scenario:** The entire UI is frozen, nothing responds, and even Ctrl+K doesn't work anymore.

## RECOVERY STRATEGY

Follow this decision tree:

```
Is the display corrupted? → R (Reset)
↓ no
Do you need a backup? → E (Export) or S (Save)
↓ no
Are VFS commands failing? → I (Initialize)
↓ no
Is a process stuck? → U (Unload)
↓ no
Is nothing working? → B (Bounce)
```

**Progressive approach:**
- Start with the least aggressive option that might fix your problem
- Wait and test after each step
- Only proceed to the next step if the problem persists
- Take a backup (E) before aggressive actions (I, U, B)

## FILE FORMATS

### .magma (Molten VFS Dump)

Raw VFS dumps created by the recovery system (E and S steps) and the `magma` command.

**Format:**
```json
{
  "version": "1.0",
  "timestamp": "2025-11-11T16:00:00.000Z",
  "entries": [
    {
      "path": "/home/file.txt",
      "type": "file",
      "content": "...",
      "size": 123,
      "created": 1234567890,
      "modified": 1234567890
    },
    ...
  ]
}
```

**Characteristics:**
- Uncompressed JSON
- Direct IndexedDB dump
- No checksums or compression
- Larger file sizes than .kmt
- Faster to create than .kmt
- Emergency/internal use

**Geological naming:**
- `.magma` - Molten, unprocessed (olivine crystallizes from magma)
- `.kmt` - Solidified, refined (komatiite rock formation)

The naming reflects the geological process: magma → olivine → komatiite.

## RESTORING FROM BACKUPS

Use the `magma inject` command to restore from `.magma` backups:

```bash
# First, verify the backup exists
magma list

# Inject with confirmation
magma inject backup.magma --yes
```

**Warning:** `magma inject` is destructive - it clears the entire VFS before restoring. The `--yes` flag is required to confirm this destructive operation.

**Alternative:** For programmatic restore via developer console:

```javascript
// Load .magma file content into variable 'magmaData'
const kernel = await kernelClient.getKernel();
await kernel.importVFS(magmaData);
```

## EXAMPLES

### Corrupted display

```
Ctrl+K R
```

Clears the screen and resets the terminal.

---

### Create backup before risky operation

```
Ctrl+K R E
```

1. Reset terminal for clean slate
2. Export backup to downloads

---

### Stuck process making terminal slow

```
Ctrl+K U
```

Kills all processes and frees resources.

---

### Complete system freeze

```
Ctrl+K R E I S U B
```

Full progressive recovery:
1. Reset terminal
2. Export backup
3. Restart kernel
4. Save internal backup
5. Kill all processes
6. Hard restart

(Though realistically, if the system is completely frozen, you may need to just close the tab and reopen it.)

---

### Standard pre-update backup

```
Ctrl+K S
```

Saves backup to `/home/.koma-backup-[timestamp].magma` before system update.

---

### Command-line backup workflow

```bash
# Create named backup
magma dump pre-experiment

# Do risky operations...

# List available backups
magma list

# Restore if needed
magma inject pre-experiment.magma --yes
```

## KEYBOARD SHORTCUTS

- `Ctrl+K` - Enter command mode
- `Ctrl+K` + `R` - Reset terminal
- `Ctrl+K` + `E` - Export backup
- `Ctrl+K` + `I` - Initialize kernel
- `Ctrl+K` + `S` - Save backup
- `Ctrl+K` + `U` - Unload processes
- `Ctrl+K` + `B` - Bounce (restart)
- `Esc` - Cancel recovery sequence

## SAFETY

**VFS Persistence:**
The Koma VFS is stored in browser IndexedDB, which persists across page reloads. As long as IndexedDB is healthy, your data survives all recovery actions including hard restarts (B).

**Data loss scenarios:**
- Browser cache/storage is cleared
- IndexedDB becomes corrupted
- Browser private mode (no persistence)

**Recovery limitations:**
- Cannot recover from IndexedDB corruption
- Cannot recover from browser storage being cleared
- Cannot recover unsaved terminal input

**Best practices:**
1. Export backups (E) regularly to external storage
2. Use `backup` command for regular `.kmt` backups
3. Test recovery procedures when system is healthy
4. Keep important data in `.kmt` archives for redistribution

## SEE ALSO

magma(1), koma(1), restart(1), backup(1), restore(1), kmt(5)

## HISTORY

The six-finger salute recovery system was introduced in Koma 0.6.0 as part of the Shale hardening initiative. It was inspired by Linux's Magic SysRq REISUB sequence for emergency system recovery.

The name "six-finger salute" comes from the six recovery keys (R-E-I-S-U-B) that must be typed in sequence, reminiscent of the typing pattern required to safely reboot a frozen Linux system.
