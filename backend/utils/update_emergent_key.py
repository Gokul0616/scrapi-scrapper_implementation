#!/usr/bin/env python3
"""
Utility script to automatically fetch and update Emergent LLM key in .env file
This should be run whenever the application starts in the Emergent environment
"""
import os
import re
from pathlib import Path

def get_emergent_llm_key():
    """
    Get Emergent LLM key from environment.
    In Emergent environment, this key is automatically available.
    """
    # Try to get from environment first (when running in Emergent)
    key = os.environ.get('EMERGENT_UNIVERSAL_KEY')
    
    if key:
        return key
    
    # If not in environment, try to call the emergent integrations API
    # This is a placeholder - the actual implementation would depend on 
    # how Emergent exposes this key in the runtime environment
    try:
        # In Emergent environment, this would fetch the key
        # For now, we'll just return None to keep existing key
        return None
    except Exception as e:
        print(f"Could not fetch Emergent LLM key: {e}")
        return None

def update_env_file(key):
    """Update the .env file with new Emergent LLM key"""
    env_path = Path(__file__).parent.parent / '.env'
    
    if not env_path.exists():
        print(f".env file not found at {env_path}")
        return False
    
    # Read current .env content
    with open(env_path, 'r') as f:
        content = f.read()
    
    # Update or add EMERGENT_LLM_KEY
    if 'EMERGENT_LLM_KEY=' in content:
        # Replace existing key
        updated_content = re.sub(
            r'EMERGENT_LLM_KEY=.*',
            f'EMERGENT_LLM_KEY={key}',
            content
        )
    else:
        # Add new key
        updated_content = content + f'\nEMERGENT_LLM_KEY={key}\n'
    
    # Write back to file
    with open(env_path, 'w') as f:
        f.write(updated_content)
    
    print(f"✓ Updated EMERGENT_LLM_KEY in .env file")
    return True

def main():
    """Main function to fetch and update Emergent LLM key"""
    print("Checking for Emergent LLM key...")
    
    key = get_emergent_llm_key()
    
    if key:
        print(f"✓ Found Emergent LLM key")
        if update_env_file(key):
            print("✓ Successfully updated .env file")
            return True
        else:
            print("✗ Failed to update .env file")
            return False
    else:
        print("ℹ No new key found, keeping existing configuration")
        return True

if __name__ == '__main__':
    main()
