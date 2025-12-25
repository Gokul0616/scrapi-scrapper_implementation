#!/usr/bin/env python3
"""
Test script for username generator
"""
import sys
sys.path.append('/app/backend')

from utils.username_generator import generate_username, generate_username_suggestions

# Generate single username
print("Single username:")
print(generate_username())
print()

# Generate multiple suggestions
print("Username suggestions:")
suggestions = generate_username_suggestions(10)
for username in suggestions:
    print(f"  - {username}")
