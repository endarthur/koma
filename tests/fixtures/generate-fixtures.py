#!/usr/bin/env python3
"""
Generate .kmt (Koma Tape) backup files for test fixtures

This script creates pre-made VFS backups that can be used as test fixtures,
providing clean, reproducible test states without needing to create files
during test execution.

Usage:
    python generate-fixtures.py
"""

import json
import base64
from datetime import datetime, timezone
from pathlib import Path


class KMTGenerator:
    """Generator for .kmt (Koma Tape) backup files"""

    def __init__(self, label="fixture"):
        self.label = label
        self.entries = []
        self.timestamp = datetime.now(timezone.utc).isoformat().replace('+00:00', 'Z')

    def add_directory(self, path, created=None, modified=None):
        """Add a directory to the VFS"""
        entry = {
            'path': path,
            'type': 'directory',
            'created': created or self.timestamp,
            'modified': modified or self.timestamp
        }
        self.entries.append(entry)
        return self

    def add_file(self, path, content, created=None, modified=None):
        """Add a file to the VFS"""
        entry = {
            'path': path,
            'type': 'file',
            'size': len(content),
            'created': created or self.timestamp,
            'modified': modified or self.timestamp,
            'content': content
        }
        self.entries.append(entry)
        return self

    def generate(self):
        """Generate the .kmt backup structure"""
        # Sort entries: directories first, then by path depth
        sorted_entries = sorted(self.entries, key=lambda e: (
            0 if e['type'] == 'directory' else 1,
            e['path'].count('/'),
            e['path']
        ))

        # Convert entries to JSON
        entries_json = json.dumps(sorted_entries, separators=(',', ':'))

        # Base64 encode (UTF-8 safe)
        entries_bytes = entries_json.encode('utf-8')
        entries_b64 = base64.b64encode(entries_bytes).decode('ascii')

        # Create .kmt structure
        kmt = {
            'format': 'kmt',
            'version': '1.0',
            'created': self.timestamp,
            'label': self.label,
            'compression': 'none',
            'checksum': {
                'uncompressed': 'fixture-checksum'
            },
            'stats': {
                'files': sum(1 for e in self.entries if e['type'] == 'file'),
                'directories': sum(1 for e in self.entries if e['type'] == 'directory'),
                'size': len(entries_json)
            },
            'data': entries_b64
        }

        return kmt

    def save(self, filename):
        """Generate and save the .kmt file"""
        kmt = self.generate()
        filepath = Path(__file__).parent / filename

        with open(filepath, 'w', encoding='utf-8') as f:
            json.dump(kmt, f, indent=2)

        print(f"[OK] Generated {filename}")
        print(f"  - {kmt['stats']['directories']} directories")
        print(f"  - {kmt['stats']['files']} files")
        print(f"  - {kmt['stats']['size']} bytes")
        return filepath


def generate_basic_fixture():
    """Generate basic VFS structure with /home and /tmp"""
    gen = KMTGenerator(label="basic-vfs")
    gen.add_directory('/home')
    gen.add_directory('/tmp')
    gen.save('basic-vfs.kmt')


def generate_ls_test_fixture():
    """Generate fixture for ls command tests"""
    gen = KMTGenerator(label="ls-test")
    gen.add_directory('/home')
    gen.add_directory('/home/dir1')
    gen.add_file('/home/file1.txt', 'content 1')
    gen.add_file('/home/file2.txt', 'content 2')
    gen.add_file('/home/dir1/file3.txt', 'content 3')
    gen.add_file('/home/.hidden', 'hidden content')
    gen.save('ls-test.kmt')


def generate_pipes_test_fixture():
    """Generate fixture for pipes and redirection tests"""
    gen = KMTGenerator(label="pipes-test")
    gen.add_directory('/home')
    gen.add_file('/home/test.txt', 'apple\nbanana\ncherry\napricot\nblueberry')
    gen.add_file('/home/numbers.txt', '1\n2\n3\n4\n5')
    gen.add_file('/home/mixed.txt', 'hello world\ntest line\nhello again\nanother test')
    gen.add_file('/home/data.csv', 'name,age,city\nalice,30,NYC\nbob,25,LA\ncarol,35,NYC')
    gen.add_file('/home/empty.txt', '')
    gen.save('pipes-test.kmt')


def generate_file_reading_fixture():
    """Generate fixture for cat/head/tail tests"""
    gen = KMTGenerator(label="file-reading-test")
    gen.add_directory('/home')
    gen.add_file('/home/simple.txt', 'Hello, World!')
    gen.add_file('/home/multiline.txt', 'line 1\nline 2\nline 3\nline 4\nline 5')
    gen.add_file('/home/long.txt', '\n'.join(f'Line {i}' for i in range(1, 101)))
    gen.add_file('/home/empty.txt', '')
    gen.save('file-reading-test.kmt')


def generate_vfs_ops_fixture():
    """Generate fixture for VFS operations tests"""
    gen = KMTGenerator(label="vfs-ops-test")
    gen.add_directory('/home')
    gen.add_directory('/tmp')
    gen.add_directory('/home/testdir')
    gen.add_file('/home/test.txt', 'test content')
    gen.add_file('/home/file1.txt', 'content 1')
    gen.add_file('/home/file2.txt', 'content 2')
    gen.save('vfs-ops-test.kmt')


def generate_complex_fixture():
    """Generate complex VFS structure for comprehensive testing"""
    gen = KMTGenerator(label="complex-vfs")

    # Standard directories
    gen.add_directory('/home')
    gen.add_directory('/tmp')
    gen.add_directory('/usr')
    gen.add_directory('/usr/bin')
    gen.add_directory('/usr/local')
    gen.add_directory('/var')
    gen.add_directory('/var/log')

    # Home directory with various files
    gen.add_directory('/home/user')
    gen.add_directory('/home/user/projects')
    gen.add_directory('/home/user/documents')

    gen.add_file('/home/user/readme.txt', 'Welcome to Koma!\n\nThis is a test environment.')
    gen.add_file('/home/user/.bashrc', 'export PS1="\\u@\\h:\\w\\$ "')
    gen.add_file('/home/user/.profile', '# User profile')

    # Project files
    gen.add_file('/home/user/projects/app.js', 'console.log("Hello");')
    gen.add_file('/home/user/projects/package.json', '{"name":"app","version":"1.0.0"}')
    gen.add_file('/home/user/projects/README.md', '# My Project\n\nA test project.')

    # Documents
    gen.add_file('/home/user/documents/notes.txt', 'Meeting notes\n- Topic 1\n- Topic 2')
    gen.add_file('/home/user/documents/todo.txt', '[] Task 1\n[] Task 2\n[x] Task 3')

    # Logs
    gen.add_file('/var/log/system.log', 'INFO: System started\nWARN: Low memory\nERROR: Connection failed')
    gen.add_file('/var/log/app.log', '2024-01-01 10:00:00 - Application started')

    # Binary-like content
    gen.add_file('/tmp/binary.dat', '\x00\x01\x02\xFF\xFE')

    # Files with special names
    gen.add_file('/tmp/file with spaces.txt', 'content with spaces')
    gen.add_file('/tmp/file-with-dashes.txt', 'content with dashes')
    gen.add_file('/tmp/.hidden-file', 'hidden content')

    gen.save('complex-vfs.kmt')


def generate_minimal_fixture():
    """Generate minimal VFS with just required directories"""
    gen = KMTGenerator(label="minimal-vfs")
    gen.add_directory('/home')
    gen.save('minimal-vfs.kmt')


def generate_empty_fixture():
    """Generate completely empty VFS"""
    gen = KMTGenerator(label="empty-vfs")
    gen.save('empty-vfs.kmt')


def main():
    """Generate all fixture files"""
    print("Generating Koma VFS test fixtures...\n")

    fixtures_dir = Path(__file__).parent
    fixtures_dir.mkdir(exist_ok=True)

    generate_empty_fixture()
    print()
    generate_minimal_fixture()
    print()
    generate_basic_fixture()
    print()
    generate_ls_test_fixture()
    print()
    generate_pipes_test_fixture()
    print()
    generate_file_reading_fixture()
    print()
    generate_vfs_ops_fixture()
    print()
    generate_complex_fixture()

    print("\n[SUCCESS] All fixtures generated successfully!")
    print(f"Location: {fixtures_dir}")
    print("\nUsage in tests:")
    print("  import { restoreFromFixture } from '../../helpers/fixture-helper.js';")
    print("  await restoreFromFixture(vfs, 'basic-vfs.kmt');")


if __name__ == '__main__':
    main()
