
from fastapi import Request
from datetime import datetime, timezone
import random

def get_workspace_query(user_id: str, request: Request) -> dict:
    """
    Helper to generate workspace-aware MongoDB query.
    If Personal: returns {"user_id": user_id, "organization_id": None}
    If Organization: returns {"organization_id": org_id}
    """
    workspace_type = getattr(request.state, 'workspace_type', 'personal')
    workspace_id = getattr(request.state, 'workspace_id', '')
    
    if workspace_type == 'organization' and workspace_id:
        return {"organization_id": workspace_id}
    else:
        # Personal workspace: strictly enforce user_id AND no organization_id
        return {"user_id": user_id, "organization_id": None}

def parse_datetime_safe(dt):
    """Parse datetime from various formats and ensure timezone awareness"""
    if dt is None:
        return None
    if isinstance(dt, datetime):
        # If datetime is naive, make it aware (UTC)
        if dt.tzinfo is None:
            return dt.replace(tzinfo=timezone.utc)
        return dt
    if isinstance(dt, str):
        try:
            parsed = datetime.fromisoformat(dt.replace('Z', '+00:00'))
            # If parsed datetime is naive, make it aware (UTC)
            if parsed.tzinfo is None:
                return parsed.replace(tzinfo=timezone.utc)
            return parsed
        except ValueError:
            return None
    return dt

# Profile color palette - works well in both light and dark modes
PROFILE_COLORS = [
    "#8B5CF6",  # Purple
    "#EC4899",  # Pink
    "#F59E0B",  # Amber
    "#10B981",  # Emerald
    "#3B82F6",  # Blue
    "#EF4444",  # Red
    "#14B8A6",  # Teal
    "#F97316",  # Orange
    "#8B5CF6",  # Violet
    "#06B6D4",  # Cyan
]

def generate_random_profile_color():
    """Generate a random color from the profile color palette."""
    return random.choice(PROFILE_COLORS)
