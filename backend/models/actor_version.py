"""
Actor Version & Build Models — Phase 5

Two-tier model mirroring Apify's versioning system:
  ActorVersion  — Source code snapshot for a MAJOR.MINOR version (e.g. "1.1")
  ActorBuild    — Immutable execution-ready build (e.g. "1.1.3") created by the build pipeline
"""

from pydantic import BaseModel, Field, field_validator
from typing import List, Optional, Dict, Any
from datetime import datetime, timezone
import re
import uuid


# ── ActorVersion ──────────────────────────────────────────────────────────────

class ActorVersion(BaseModel):
    """Source code + configuration for a MAJOR.MINOR version."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    actor_id: str
    version_number: str           # "1.0", "1.1", "2.0" — strict MAJOR.MINOR
    source_type: str = "SOURCE_FILES"  # SOURCE_FILES | GIT_REPO (future)
    source_code: Optional[str] = None  # Python source for SOURCE_FILES
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    build_tag: str = "latest"     # Tag applied to successful build of this version
    default_build_id: Optional[str] = None   # Currently deployed build for this version
    apply_env_vars_to_build: bool = False
    readme: Optional[str] = None
    created_by: str               # user_id
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ActorVersionCreate(BaseModel):
    version_number: str
    source_code: Optional[str] = None
    input_schema: Dict[str, Any] = Field(default_factory=dict)
    build_tag: str = "latest"
    readme: Optional[str] = None

    @field_validator("version_number")
    @classmethod
    def validate_version_number(cls, v: str) -> str:
        if not re.match(r"^\d+\.\d+$", v):
            raise ValueError("version_number must be MAJOR.MINOR format (e.g. '1.0', '2.1')")
        return v


class ActorVersionUpdate(BaseModel):
    source_code: Optional[str] = None
    input_schema: Optional[Dict[str, Any]] = None
    readme: Optional[str] = None
    build_tag: Optional[str] = None


class ActorVersionResponse(BaseModel):
    id: str
    actor_id: str
    version_number: str
    source_type: str
    source_code: Optional[str]
    input_schema: Dict[str, Any]
    build_tag: str
    default_build_id: Optional[str]
    apply_env_vars_to_build: bool
    readme: Optional[str]
    created_by: str
    created_at: str
    updated_at: str
    # Computed fields
    build_count: int = 0


# ── ActorBuild ────────────────────────────────────────────────────────────────

BUILD_STATUS_READY = "READY"
BUILD_STATUS_RUNNING = "RUNNING"
BUILD_STATUS_SUCCEEDED = "SUCCEEDED"
BUILD_STATUS_FAILED = "FAILED"
BUILD_STATUS_ABORTED = "ABORTED"

TERMINAL_BUILD_STATUSES = {BUILD_STATUS_SUCCEEDED, BUILD_STATUS_FAILED, BUILD_STATUS_ABORTED}


class ActorBuild(BaseModel):
    """Immutable build snapshot — result of running the build pipeline on an ActorVersion."""

    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    actor_id: str
    version_id: str               # Parent ActorVersion ID
    version_number: str           # Denormalized for fast lookup (e.g. "1.1")
    build_number: str             # Full build number (e.g. "1.1.3")
    patch_number: int             # Just the BUILD part — auto-incremented per version
    status: str = BUILD_STATUS_READY   # READY → RUNNING → SUCCEEDED | FAILED | ABORTED
    build_log: List[str] = Field(default_factory=list)
    source_code_snapshot: Optional[str] = None   # Locked at build time
    input_schema_snapshot: Dict[str, Any] = Field(default_factory=dict)
    stats: Dict[str, Any] = Field(default_factory=dict)
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class ActorBuildResponse(BaseModel):
    id: str
    actor_id: str
    version_id: str
    version_number: str
    build_number: str
    patch_number: int
    status: str
    build_log: List[str]
    stats: Dict[str, Any]
    started_at: Optional[str]
    finished_at: Optional[str]
    created_at: str
