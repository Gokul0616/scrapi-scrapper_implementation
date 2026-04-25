"""
Pipeline Models — Actor Chaining / Metamorph system.

A Pipeline is an ordered sequence of actors where each step's input can
be mapped from the previous step's output. Like Apify's actor chaining.
"""

import uuid
from datetime import datetime
from typing import Any, Dict, List, Optional

from pydantic import BaseModel, Field


class PipelineStep(BaseModel):
    """One step in a pipeline."""
    order: int                               # 1-based execution order
    actor_id: str                            # actor to run at this step
    input_mapping: Dict[str, Any] = {}       # e.g. {"startUrl": "{{prev.output.url}}"}
    condition: Optional[str] = None          # e.g. "prev.results_count > 0"


class PipelineCreate(BaseModel):
    name: str
    steps: List[PipelineStep]
    is_enabled: bool = True


class PipelineUpdate(BaseModel):
    name: Optional[str] = None
    steps: Optional[List[PipelineStep]] = None
    is_enabled: Optional[bool] = None


class Pipeline(BaseModel):
    """Full pipeline document stored in MongoDB `pipelines` collection."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    organization_id: Optional[str] = None
    name: str
    steps: List[PipelineStep]
    is_enabled: bool = True
    created_at: datetime = Field(default_factory=datetime.utcnow)
    modified_at: datetime = Field(default_factory=datetime.utcnow)


class PipelineRunStep(BaseModel):
    """Tracks the status of a single step within a pipeline execution."""
    step_order: int
    actor_id: str
    run_id: Optional[str] = None
    status: str = "pending"              # pending | running | succeeded | failed | skipped
    started_at: Optional[datetime] = None
    finished_at: Optional[datetime] = None
    error_message: Optional[str] = None


class PipelineRun(BaseModel):
    """One full execution of a pipeline (all steps)."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    pipeline_id: str
    user_id: str
    status: str = "running"              # running | succeeded | failed
    steps: List[PipelineRunStep]
    started_at: datetime = Field(default_factory=datetime.utcnow)
    finished_at: Optional[datetime] = None
    created_at: datetime = Field(default_factory=datetime.utcnow)
