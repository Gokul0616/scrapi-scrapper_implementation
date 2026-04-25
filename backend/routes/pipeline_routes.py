"""
Pipeline Routes — REST API for actor chaining / pipeline management.

Endpoints:
  POST   /api/pipelines                  Create pipeline
  GET    /api/pipelines                  List pipelines
  GET    /api/pipelines/{id}             Get pipeline
  PATCH  /api/pipelines/{id}             Update pipeline
  DELETE /api/pipelines/{id}             Delete pipeline
  POST   /api/pipelines/{id}/trigger     Manually trigger pipeline
  GET    /api/pipelines/{id}/runs        List pipeline execution history
  GET    /api/pipelines/{id}/runs/{rid}  Get specific pipeline run detail
"""

import logging
from typing import Optional

from fastapi import APIRouter, Depends, HTTPException, Query

from auth import get_current_user
from database import get_db
from models.pipeline import PipelineCreate, PipelineUpdate
from routes.dependencies import get_api_user
from services.pipeline_service import PipelineService

logger = logging.getLogger(__name__)
router = APIRouter()


def _svc() -> PipelineService:
    return PipelineService(get_db())


# ── Create ─────────────────────────────────────────────────────────────────────

@router.post("", status_code=201)
async def create_pipeline(
    body: PipelineCreate,
    current_user: dict = Depends(get_api_user),
):
    """Create a new actor pipeline."""
    pipeline = await _svc().create_pipeline(
        user_id=current_user["id"],
        data=body,
    )
    return pipeline.model_dump()


# ── List ───────────────────────────────────────────────────────────────────────

@router.get("")
async def list_pipelines(current_user: dict = Depends(get_current_user)):
    """List all pipelines for the current user."""
    pipelines = await _svc().list_pipelines(current_user["id"])
    return {"pipelines": pipelines, "total": len(pipelines)}


# ── Get single ─────────────────────────────────────────────────────────────────

@router.get("/{pipeline_id}")
async def get_pipeline(
    pipeline_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get a single pipeline by ID."""
    pipeline = await _svc().get_pipeline(pipeline_id, current_user["id"])
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return pipeline


# ── Update ─────────────────────────────────────────────────────────────────────

@router.patch("/{pipeline_id}")
async def update_pipeline(
    pipeline_id: str,
    body: PipelineUpdate,
    current_user: dict = Depends(get_api_user),
):
    """Update a pipeline (PATCH semantics)."""
    updated = await _svc().update_pipeline(pipeline_id, current_user["id"], body)
    if not updated:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return updated


# ── Delete ─────────────────────────────────────────────────────────────────────

@router.delete("/{pipeline_id}")
async def delete_pipeline(
    pipeline_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Delete a pipeline and its run history."""
    ok = await _svc().delete_pipeline(pipeline_id, current_user["id"])
    if not ok:
        raise HTTPException(status_code=404, detail="Pipeline not found")
    return {"success": True}


# ── Trigger ────────────────────────────────────────────────────────────────────

@router.post("/{pipeline_id}/trigger", status_code=202)
async def trigger_pipeline(
    pipeline_id: str,
    input_data: dict = {},
    current_user: dict = Depends(get_api_user),
):
    """
    Manually trigger a pipeline execution.
    Returns the PipelineRun document immediately (runs async in background).
    """
    pipeline_run = await _svc().trigger_pipeline(
        pipeline_id=pipeline_id,
        user_id=current_user["id"],
        input_data=input_data,
    )
    return pipeline_run.model_dump()


# ── Run History ────────────────────────────────────────────────────────────────

@router.get("/{pipeline_id}/runs")
async def list_pipeline_runs(
    pipeline_id: str,
    limit: int = Query(20, ge=1, le=100),
    current_user: dict = Depends(get_current_user),
):
    """List execution history for a pipeline."""
    runs = await _svc().list_pipeline_runs(pipeline_id, current_user["id"], limit=limit)
    return {"runs": runs, "total": len(runs)}


@router.get("/{pipeline_id}/runs/{run_id}")
async def get_pipeline_run(
    pipeline_id: str,
    run_id: str,
    current_user: dict = Depends(get_current_user),
):
    """Get details of a specific pipeline execution."""
    db = get_db()
    # Verify ownership
    pipeline = await _svc().get_pipeline(pipeline_id, current_user["id"])
    if not pipeline:
        raise HTTPException(status_code=404, detail="Pipeline not found")

    run = await db.pipeline_runs.find_one(
        {"id": run_id, "pipeline_id": pipeline_id}, {"_id": 0}
    )
    if not run:
        raise HTTPException(status_code=404, detail="Pipeline run not found")
    return run
