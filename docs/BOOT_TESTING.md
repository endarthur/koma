# Koma Boot System Testing Guide

Comprehensive manual testing procedures for the Slate Hardening boot system. Focus on harsh failure scenarios and recovery mechanisms.

## Overview

Boot system testing requires **real browser environments** with actual failure conditions. Mock tests cannot reliably simulate IndexedDB corruption, storage quota errors, or browser-specific issues.

## Test Prerequisites

- Multiple browsers (Chrome, Firefox, Safari, Edge)
- Developer tools access (F12)
- At least 100MB free disk space
- Test .magma backup prepared

### Creating Test Backups

```bash
# In Koma terminal
mkdir /home/test-data
echo "recovery test" > /home/test-data/recovery.txt
echo "important data" > /home/test-data/important.txt
magma dump backup-for-testing
```

Save this file for emergency recovery tests.

---

## Test Categories

### 1. Pre-flight Checks (Critical Path)
- IndexedDB availability
- Storage quota verification
- Web Workers support
- Sandbox detection

### 2. Kernel Initialization
- Normal boot flow
- Timeout handling
- VFS corruption recovery

### 3. Emergency Mode
- Activation triggers
- .magma injection
- Diagnostic reports
- Storage clearing

### 4. Safe Mode
- Activation methods
- Feature disabling
- Exit functionality

### 5. Health Monitoring
- Session backups
- VFS health checks
- Daily snapshots
- Memory monitoring

---

## Detailed Test Procedures

### Pre-flight: Private Mode (IndexedDB Unavailable)

**Steps:**
1. Open Koma in Private/Incognito window
2. Observe failure message

**Expected:**
- Pre-flight fails immediately
- Error: "IndexedDB not available"
- Suggests disabling private mode
- No kernel initialization attempted

**Pass Criteria:**
- Clear error message ✓
- No console errors ✓
- Actionable guidance ✓

---

### Pre-flight: Low Storage (<10MB)

**Steps:**
1. Fill disk to leave only 5MB free
2. Open Koma

**Expected:**
- Pre-flight fails
- Error: "Insufficient storage"
- Shows available vs. required
- Recommends freeing space

**Pass Criteria:**
- Fails gracefully ✓
- No data corruption ✓
- Clear user guidance ✓

---

### Kernel: VFS Corruption

**Steps:**
1. Open Koma (working state)
2. F12 → Application → IndexedDB → KomaVFS
3. Delete random entries from `filesystem` store
4. Reload page

**Expected:**
- Kernel initialization fails
- Emergency mode activates automatically
- Diagnostic ID shown
- .magma restore option available

**Pass Criteria:**
- Emergency UI appears ✓
- Can inject backup ✓
- No infinite loops/hangs ✓

---

### Emergency: .magma Injection

**Steps:**
1. Corrupt VFS (see above)
2. Enter emergency mode
3. Upload test .magma file
4. Click "Inject & Restart"

**Expected Progress:**
1. "Reading backup file..."
2. "Parsing backup..."
3. "Clearing VFS..."
4. "✓ VFS restored! Reloading..."
5. Page reloads
6. `/home/test-data/recovery.txt` exists

**Pass Criteria:**
- All progress steps shown ✓
- Reload happens automatically ✓
- Data fully restored ✓

---

### Emergency: Invalid .magma

**Steps:**
1. Enter emergency mode
2. Upload random JSON or text file

**Expected:**
- Error: "Invalid .magma format"
- No VFS modification
- Can retry with correct file

**Pass Criteria:**
- Fails safely ✓
- VFS not corrupted further ✓
- User can retry ✓

---

### Emergency: Diagnostic Download

**Steps:**
1. Enter emergency mode
2. Click "Download Diagnostics"
3. Open downloaded file

**Expected Content:**
- Boot ID (unique identifier)
- Error message and stack
- Browser info (user agent, version)
- Storage quota details
- Screen resolution
- Failed boot stage

**Pass Criteria:**
- File downloads ✓
- All data present ✓
- Readable format ✓

---

### Safe Mode: URL Activation

**Steps:**
1. Add `?safemode` to URL
2. Load page

**Expected:**
- Banner at top: `[SAFE MODE] minimal boot...`
- Yellow accent (#ffcc00)
- No emoji or gradient
- "exit" button visible

**Pass Criteria:**
- Banner appears ✓
- Matches Koma aesthetic ✓
- Functional exit button ✓

---

### Safe Mode: .komarc Skipping

**Setup:**
```bash
echo "echo 'komarc ran'" > /home/.komarc
```

**Steps:**
1. Normal boot → see "komarc ran"
2. Safe mode boot → should NOT see message

**Expected:**
- Normal: .komarc executes
- Safe mode: .komarc skipped

**Pass Criteria:**
- Normal execution confirmed ✓
- Safe mode skips confirmed ✓

---

### Safe Mode: Exit Button

**Steps:**
1. Enter safe mode (`?safemode`)
2. Click "exit" button
3. Verify reload
4. Reload again (F5)

**Expected:**
1. First reload: normal mode
2. Second reload: still normal mode
3. URL clean (no `?safemode`)
4. localStorage clean

**Pass Criteria:**
- Exit persistent ✓
- URL cleaned ✓
- localStorage cleared ✓

---

### Health: Session Backup

**Steps:**
1. Open Koma, create tabs
2. Type (don't execute): `echo test command`
3. Wait 35 seconds
4. F12 → Application → IndexedDB → KomaSessionState
5. Inspect "current" entry

**Expected Data:**
- `tabs` array with tab info
- `activeTabId` correct
- `history` with recent commands
- `currentInput`: "echo test command"

**Pass Criteria:**
- Backup created ✓
- All data accurate ✓
- Size reasonable (<50KB) ✓

---

### Health: VFS Health Checks

**Steps:**
1. Open Koma
2. F12 → Console
3. Filter: `[Health]`
4. Wait 60 seconds

**Expected:**
- Logs every ~30 seconds
- "VFS health check" messages
- Read/write test passes

**Pass Criteria:**
- Regular intervals ✓
- No errors ✓
- Minimal performance impact ✓

---

### Health: VFS Failure Detection

**Steps:**
1. Boot Koma normally
2. F12 → Application → IndexedDB
3. Delete some VFS entries
4. Wait for next health check (~30s)

**Expected:**
- Alert: "VFS health check failed"
- Option to restart
- Console error logged

**Pass Criteria:**
- User notified ✓
- Recovery option given ✓
- No silent failure ✓

---

### Health: Daily Snapshot

**Steps:**
1. Fresh boot (new day, or change system clock)
2. Wait 5 seconds
3. Check: `ls -la /home`

**Expected:**
- File: `.koma-snapshot-YYYY-MM-DD.magma`
- Contains full VFS export
- Reasonably sized

**Pass Criteria:**
- Snapshot created ✓
- Valid .magma format ✓
- Contains all data ✓

---

### Health: Snapshot Pruning

**Setup:**
```bash
# Create 10 fake snapshots
for i in {1..10}; do
  touch /home/.koma-snapshot-2025-01-0$i.magma
done
```

**Steps:**
1. Trigger new snapshot (next day or force)
2. Check `/home`

**Expected:**
- Only 7 most recent snapshots remain
- Oldest 4 deleted
- New snapshot present

**Pass Criteria:**
- Pruning works ✓
- Correct count kept ✓
- No data loss ✓

---

## Cross-Browser Testing Matrix

| Test | Chrome | Firefox | Safari | Edge |
|------|--------|---------|--------|------|
| Pre-flight checks | ✓ | ✓ | ✓ | ✓ |
| Kernel boot | ✓ | ✓ | ✓ | ✓ |
| Emergency mode | ✓ | ✓ | ✓ | ✓ |
| Safe mode | ✓ | ✓ | ✓ | ✓ |
| Health monitoring | ✓ | ✓ | ✓ | ✓ |
| .magma injection | ✓ | ✓ | ✓ | ✓ |
| Diagnostic reports | ✓ | ✓ | ✓ | ✓ |

**Browser-Specific Focus:**
- **Chrome:** Memory pressure monitoring, Performance API
- **Firefox:** IndexedDB differences, safe mode Shift key
- **Safari:** Storage quota limits (stricter), sandbox detection
- **Edge:** Enterprise restrictions, group policy issues

---

## Stress Tests

### Rapid Reloads

**Steps:**
1. Reload 20 times rapidly (F5 × 20)

**Expected:**
- All boots succeed
- No race conditions
- VFS consistent
- No memory leaks

---

### Large VFS

**Setup:**
```bash
# Create 1000 files
for i in {1..1000}; do
  echo "file $i" > /home/file$i.txt
done
```

**Steps:**
1. Reload Koma

**Expected:**
- Boot succeeds
- Time < 3 seconds
- Health checks still work

---

### Network Throttling

**Steps:**
1. DevTools → Network → "Slow 3G"
2. Reload Koma

**Expected:**
- Boot succeeds (slower)
- Timeout handling works
- No hanging

---

## Recovery Workflows

### Workflow 1: Complete Data Loss

**Scenario:** User clears all browser data

**Steps:**
1. Clear all (Ctrl+Shift+Delete)
2. Open Koma → Emergency mode
3. Upload .magma backup
4. Inject & restart

**Expected:** Full recovery with all files

---

### Workflow 2: Troubleshooting .komarc

**Scenario:** .komarc contains infinite loop

**Steps:**
1. .komarc breaks boot
2. Add `?safemode` to URL
3. Boot successfully
4. Edit .komarc via `vein`
5. Exit safe mode

**Expected:** Normal boot resumes

---

## Issue Reporting Checklist

When reporting boot issues, include:

- [ ] Diagnostic ID from emergency mode
- [ ] Browser and version
- [ ] Console logs (F12 → Console → Save)
- [ ] Steps to reproduce
- [ ] Storage quota (`navigator.storage.estimate()`)
- [ ] Downloaded diagnostic report (if possible)

---

## Known Limitations

1. **Shift key detection** - Unreliable across browsers, use URL parameter instead
2. **Private mode** - Cannot bypass IndexedDB requirement (by design)
3. **Very old browsers** - May lack Web Workers or IndexedDB
4. **Storage full** - Cannot boot if <10MB available (need space for VFS)

---

## Test Sign-off

Before release, verify all **critical path** tests pass:

- [ ] Private mode fails gracefully
- [ ] Low storage detected and blocked
- [ ] VFS corruption triggers emergency mode
- [ ] .magma injection fully restores data
- [ ] Safe mode activates and exits correctly
- [ ] Session backups work
- [ ] VFS health checks work
- [ ] Daily snapshots work
- [ ] No regression in normal boot
- [ ] All browsers tested

---

**Last Updated:** 2025-11-11 - Phase 6.6 (Slate Hardening)
**Maintainer:** Document boot test failures in GitHub issues
