import uuid
import re

def sanitize_for_id(text: str) -> str:
    """Sanitize text to be used in an ID (alphanumeric and hyphens only)."""
    if not text:
        return "unknown"
    # Convert to upper, replace non-alphanumeric with hyphen
    sanitized = re.sub(r'[^A-Z0-9]', '-', text.upper())
    # Remove consecutive hyphens and leading/trailing hyphens
    sanitized = re.sub(r'-+', '-', sanitized).strip('-')
    return sanitized or "UNKNOWN"

def generate_user_id(username: str) -> str:
    """Generate a structured user ID: SCRAPI-{USERNAME}-{SHORT_UUID}"""
    clean_username = sanitize_for_id(username)
    suffix = uuid.uuid4().hex[:8].upper()
    return f"SCRAPI-{clean_username}-{suffix}"

def generate_org_id(name: str) -> str:
    """Generate a structured organization ID: SCRAPI-ORG-{NAME}-{SHORT_UUID}"""
    clean_name = sanitize_for_id(name)
    suffix = uuid.uuid4().hex[:8].upper()
    return f"SCRAPI-ORG-{clean_name}-{suffix}"
