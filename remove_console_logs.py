#!/usr/bin/env python3
"""
Script to remove console.log statements from JavaScript files
while keeping console.error, console.warn, etc.
"""

import os
import re
from pathlib import Path

def remove_console_logs(file_path):
    """Remove console.log statements from a file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original_content = content
        
        # Pattern to match console.log statements (including multiline)
        # This handles:
        # - console.log(...)
        # - console.log('...')
        # - console.log("...")
        # - console.log(`...`)
        # But NOT console.error, console.warn, console.info, etc.
        
        # Remove single-line console.log statements
        content = re.sub(r'^\s*console\.log\([^)]*\);\s*\n', '', content, flags=re.MULTILINE)
        
        # Remove console.log statements without semicolon
        content = re.sub(r'^\s*console\.log\([^)]*\)\s*\n', '', content, flags=re.MULTILINE)
        
        # Remove inline console.log (not at start of line)
        content = re.sub(r'console\.log\([^)]*\);?\s*', '', content)
        
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return True
        return False
    except Exception as e:
        print(f"Error processing {file_path}: {e}")
        return False

def process_directory(directory):
    """Process all JS/JSX files in a directory"""
    directory = Path(directory)
    modified_files = []
    
    for file_path in directory.rglob('*.js'):
        if remove_console_logs(file_path):
            modified_files.append(str(file_path))
    
    for file_path in directory.rglob('*.jsx'):
        if remove_console_logs(file_path):
            modified_files.append(str(file_path))
    
    return modified_files

if __name__ == '__main__':
    src_dir = '/app/frontend/src'
    print(f"Removing console.log statements from {src_dir}...")
    
    modified_files = process_directory(src_dir)
    
    print(f"\nModified {len(modified_files)} files:")
    for file_path in modified_files:
        print(f"  - {file_path}")
    
    print("\n✅ Done! Console.error and other console methods are preserved.")
