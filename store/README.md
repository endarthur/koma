# Koma Store

This directory contains KMT (Koma Magnetic Tape) archives that can be downloaded and automatically unpacked using the `koma insert` command.

## Available Archives

### examples.kmt
**Size:** 3.1 KB (compressed)
**Contents:** Schist Lisp example programs
- `factorial.scm` - Factorial implementation
- `fibonacci.scm` - Fibonacci sequence
- `metacircular.scm` - Schist interpreting itself!
- `schist-repl.scm` - Self-hosting REPL

**Install:**
```bash
koma insert examples.kmt
# Files extracted to: /media/examples/
```

## Using the Store

The `koma insert` command automatically downloads archives from this store:

```bash
# Download and unpack to /media/<name>/
koma insert examples.kmt

# Download only (save to /media/)
koma insert examples.kmt --download-only

# Unpack to custom location
koma insert examples.kmt --to /home
```

The store URL is automatically detected based on where Koma is hosted:
- **GitHub Pages**: `https://endarthur.github.io/koma/store/`
- **Localhost**: `http://localhost:8000/store/`

## Adding New Archives

To add a new archive to the store:

1. **Create the KMT archive:**
   ```bash
   python kmt.py pack <source> <name>.kmt --label "Description"
   ```

2. **Move to store:**
   ```bash
   mv <name>.kmt store/
   ```

3. **Update this README** with archive information

4. **Commit and push:**
   ```bash
   git add store/<name>.kmt store/README.md
   git commit -m "Add <name>.kmt to store"
   ```

## Archive Guidelines

- Use **relative paths** for portability (default in `kmt.py`)
- Add descriptive **labels** with `--label`
- Keep archives **focused** (single purpose)
- **Compress** automatically (default for >1KB)
- Test unpacking before publishing

## Format

All archives must be valid KMT v1.0 format. See `man kmt(5)` for specification.

---

**Koma Terminal**
Craton Systems, Inc.
