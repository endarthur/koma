#!/usr/bin/env python3
"""
kmt.py - Koma Magnetic Tape archive creator

Create KMT archives outside of Koma for distribution and packaging.
This script generates the same format as the kmt command in Koma.

Usage:
    python kmt.py pack <source> <output.kmt> [options]

Options:
    --compress, -c         Force gzip compression
    --no-compress, -C      Disable compression
    --absolute, -a         Use absolute paths (default: relative)
    --label LABEL, -l      Set archive label
    --help, -h             Show this help

Examples:
    # Create portable archive with relative paths
    python kmt.py pack examples/ examples.kmt

    # Create with custom label
    python kmt.py pack docs/ docs.kmt --label "Documentation v1.0"

    # Create with absolute paths
    python kmt.py pack /home/project project.kmt --absolute

    # Force compression
    python kmt.py pack small/ small.kmt --compress
"""

import os
import sys
import json
import gzip
import base64
import hashlib
import argparse
from datetime import datetime, timezone
from pathlib import Path

# Fix Windows console encoding for Unicode characters
if sys.platform == 'win32':
    import codecs
    sys.stdout = codecs.getwriter('utf-8')(sys.stdout.buffer, 'strict')
    sys.stderr = codecs.getwriter('utf-8')(sys.stderr.buffer, 'strict')


def compute_sha256(data):
    """Compute SHA-256 hash of data"""
    if isinstance(data, str):
        data = data.encode('utf-8')
    return hashlib.sha256(data).hexdigest()


def compress_string(data):
    """Compress string using gzip"""
    if isinstance(data, str):
        data = data.encode('utf-8')
    return gzip.compress(data)


def get_all_entries(source_path, base_path, use_absolute=False):
    """
    Recursively get all files and directories from source path

    Args:
        source_path: Path to directory or file to archive
        base_path: Base path for relative path calculation
        use_absolute: If True, use absolute paths; if False, use relative

    Returns:
        List of entry dictionaries
    """
    entries = []
    source = Path(source_path).resolve()

    if not source.exists():
        raise FileNotFoundError(f"Source path does not exist: {source_path}")

    def add_entry(path):
        stat = path.stat()

        # Calculate the path to store in archive
        if use_absolute:
            stored_path = str(path.absolute())
        else:
            # Make relative to source directory
            try:
                rel_path = path.relative_to(source.parent)
                stored_path = str(rel_path)
            except ValueError:
                # If can't make relative, use the path relative to source itself
                if path == source:
                    stored_path = '.'
                else:
                    stored_path = str(path.relative_to(source))

        entry = {
            'path': stored_path,
            'type': 'directory' if path.is_dir() else 'file',
            'modified': int(stat.st_mtime * 1000),  # Convert to milliseconds
        }

        if path.is_file():
            with open(path, 'r', encoding='utf-8', errors='replace') as f:
                entry['content'] = f.read()
            entry['size'] = stat.st_size

        entries.append(entry)

    # If source is a directory, walk it
    if source.is_dir():
        # Add the directory itself if using relative paths
        if not use_absolute:
            add_entry(source)

        for root, dirs, files in os.walk(source):
            root_path = Path(root)

            # Add directories
            for dirname in sorted(dirs):
                dir_path = root_path / dirname
                add_entry(dir_path)

            # Add files
            for filename in sorted(files):
                file_path = root_path / filename
                add_entry(file_path)
    else:
        # Single file
        add_entry(source)

    return entries


def create_kmt_archive(source_path, output_path, compress=None, use_absolute=False, label=None):
    """
    Create a KMT archive

    Args:
        source_path: Path to directory or file to archive
        output_path: Output .kmt file path
        compress: None (auto), True (force), or False (disable)
        use_absolute: Use absolute paths instead of relative
        label: Archive label (defaults to source basename)

    Returns:
        Dictionary with archive statistics
    """
    source = Path(source_path).resolve()

    # Determine label
    if label is None:
        label = source.name

    print(f"Creating archive from {source_path}...")
    print(f"Path type: {'absolute' if use_absolute else 'relative'}")

    # Get all entries
    base_path = source.parent if source.is_dir() else source.parent.parent
    entries = get_all_entries(source_path, base_path, use_absolute)

    # Convert to JSON
    entries_json = json.dumps(entries, separators=(',', ':'))

    # Determine compression (auto = compress if > 1KB)
    should_compress = compress if compress is not None else (len(entries_json) > 1024)

    # Prepare archive data
    if should_compress:
        print("Compressing data...")

        # Hash uncompressed
        uncompressed_hash = compute_sha256(entries_json)

        # Compress
        compressed = compress_string(entries_json)
        compressed_hash = compute_sha256(compressed)

        # Base64 encode
        data = base64.b64encode(compressed).decode('ascii')

        stats = {
            'files': sum(1 for e in entries if e['type'] == 'file'),
            'directories': sum(1 for e in entries if e['type'] == 'directory'),
            'size_uncompressed': len(entries_json),
            'size_compressed': len(compressed),
            'compression_ratio': f"{(100 - (len(compressed) / len(entries_json) * 100)):.1f}%"
        }

        checksum = {
            'uncompressed': f'sha256:{uncompressed_hash}',
            'compressed': f'sha256:{compressed_hash}'
        }
        compression = 'gzip'
    else:
        # No compression
        uncompressed_hash = compute_sha256(entries_json)
        data = base64.b64encode(entries_json.encode('utf-8')).decode('ascii')

        stats = {
            'files': sum(1 for e in entries if e['type'] == 'file'),
            'directories': sum(1 for e in entries if e['type'] == 'directory'),
            'size': len(entries_json)
        }

        checksum = {
            'uncompressed': f'sha256:{uncompressed_hash}'
        }
        compression = 'none'

    # Build archive structure
    archive = {
        'format': 'kmt',
        'version': '1.0',
        'created': datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z'),
        'label': label,
        'compression': compression,
        'checksum': checksum,
        'stats': stats,
        'data': data
    }

    # Write to file
    output = Path(output_path)
    with open(output, 'w', encoding='utf-8') as f:
        json.dump(archive, f, indent=2)

    print(f"\n✓ Archive created: {output_path}")
    print(f"  Label: {label}")
    print(f"  Files: {stats['files']}")
    print(f"  Directories: {stats['directories']}")

    if should_compress:
        print(f"  Size: {stats['size_compressed'] / 1024:.1f} KB (compressed)")
        print(f"  Uncompressed: {stats['size_uncompressed'] / 1024:.1f} KB")
        print(f"  Compression: {stats['compression_ratio']}")
    else:
        print(f"  Size: {stats['size'] / 1024:.1f} KB")

    print(f"  Checksum: {uncompressed_hash[:16]}...")

    return stats


def main():
    parser = argparse.ArgumentParser(
        description='KMT archive creator for Koma',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Create portable archive with relative paths
  python kmt.py pack examples/ examples.kmt

  # Create with custom label
  python kmt.py pack docs/ docs.kmt --label "Documentation v1.0"

  # Create with absolute paths
  python kmt.py pack /home/project project.kmt --absolute

  # Force compression
  python kmt.py pack small/ small.kmt --compress

For more information, see: https://github.com/anthropics/koma
        """
    )

    parser.add_argument('command', choices=['pack'], help='Command to execute')
    parser.add_argument('source', help='Source directory or file to archive')
    parser.add_argument('output', help='Output .kmt file path')

    parser.add_argument('-c', '--compress', action='store_true',
                        help='Force gzip compression')
    parser.add_argument('-C', '--no-compress', action='store_true',
                        help='Disable compression')
    parser.add_argument('-a', '--absolute', action='store_true',
                        help='Use absolute paths (default: relative)')
    parser.add_argument('-l', '--label', type=str,
                        help='Set archive label')

    args = parser.parse_args()

    if args.command != 'pack':
        print(f"Error: Unknown command '{args.command}'", file=sys.stderr)
        return 1

    # Validate arguments
    if args.compress and args.no_compress:
        print("Error: Cannot use both --compress and --no-compress", file=sys.stderr)
        return 1

    # Determine compression setting
    if args.compress:
        compress = True
    elif args.no_compress:
        compress = False
    else:
        compress = None  # Auto

    try:
        create_kmt_archive(
            args.source,
            args.output,
            compress=compress,
            use_absolute=args.absolute,
            label=args.label
        )
        return 0
    except Exception as e:
        print(f"Error: {e}", file=sys.stderr)
        import traceback
        traceback.print_exc()
        return 1


if __name__ == '__main__':
    sys.exit(main())
