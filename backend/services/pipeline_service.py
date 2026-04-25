"""
Pipeline Service — Actor Chaining / Metamorph execution logic.

Responsibilities:
  - CRUD for pipeline definitions
  - trigger_next_step(): advances pipeline execution after a run completes
  - Input mapping: resolves "{{prev.output.url}}" template expressions
  - Condition evaluation: skips steps based on prev run output
"""

import logging
import re
import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from motor.motor_asyncio import AsyncIOMotorDatabase

from models.pipeline import Pipeline, PipelineCreate, PipelineRun, PipelineRunStep, PipelineUpdate

logger = logging.getLogger(__name__)


class PipelineService:
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db

    # ── Indexes ───────────────────────────────────────────────────────────────

    async def ensure_indexes(self):
        await self.db.pipelines.create_index([("user_id", 1)])
        await self.db.pipeline_runs.create_index([("pipeline_id", 1)])
        await self.db.pipeline_runs.create_index([("user_id", 1)])
        # Index to quickly find the pipeline run associated with a specific run_id
        await self.db.pipeline_runs.create_index([("steps.run_id", 1)])
        logger.info("✅ Pipeline indexes ensured")

    # ── CRUD ──────────────────────────────────────────────────────────────────

    async def create_pipeline(
        self, user_id: str, data: PipelineCreate, organization_id: Optional[str] = None
    ) -> Pipeline:
        if len(data.steps) < 2:
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="A pipeline must have at least 2 steps.")

        # Validate all actor_ids exist
        for step in data.steps:
            actor = await self.db.actors.find_one({"id": step.actor_id})
            if not actor:
                from fastapi import HTTPException
                raise HTTPException(
                    status_code=400, detail=f"Actor not found for step {step.order}: {step.actor_id}"
                )

        pipeline = Pipeline(
            user_id=user_id,
            organization_id=organization_id,
            name=data.name,
            steps=sorted(data.steps, key=lambda s: s.order),
            is_enabled=data.is_enabled,
        )
        doc = pipeline.model_dump()
        doc["created_at"] = doc["created_at"].isoformat()
        doc["modified_at"] = doc["modified_at"].isoformat()
        await self.db.pipelines.insert_one(doc)
        logger.info(f"Pipeline created: {pipeline.id}")
        return pipeline

    async def list_pipelines(self, user_id: str) -> List[dict]:
        return await self.db.pipelines.find({"user_id": user_id}, {"_id": 0}).to_list(None)

    async def get_pipeline(self, pipeline_id: str, user_id: str) -> Optional[dict]:
        return await self.db.pipelines.find_one(
            {"id": pipeline_id, "user_id": user_id}, {"_id": 0}
        )

    async def update_pipeline(self, pipeline_id: str, user_id: str, data: PipelineUpdate) -> Optional[dict]:
        updates: dict = {"modified_at": datetime.utcnow().isoformat()}
        if data.name is not None:
            updates["name"] = data.name
        if data.steps is not None:
            updates["steps"] = [s.model_dump() for s in sorted(data.steps, key=lambda s: s.order)]
        if data.is_enabled is not None:
            updates["is_enabled"] = data.is_enabled

        result = await self.db.pipelines.find_one_and_update(
            {"id": pipeline_id, "user_id": user_id},
            {"$set": updates},
            return_document=True,
        )
        if result:
            result.pop("_id", None)
        return result

    async def delete_pipeline(self, pipeline_id: str, user_id: str) -> bool:
        result = await self.db.pipelines.delete_one({"id": pipeline_id, "user_id": user_id})
        if result.deleted_count > 0:
            await self.db.pipeline_runs.delete_many({"pipeline_id": pipeline_id})
            return True
        return False

    # ── Trigger ───────────────────────────────────────────────────────────────

    async def trigger_pipeline(self, pipeline_id: str, user_id: str, input_data: dict) -> PipelineRun:
        """Manually start a pipeline from step 1."""
        pipeline_doc = await self.get_pipeline(pipeline_id, user_id)
        if not pipeline_doc:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Pipeline not found")
        if not pipeline_doc.get("is_enabled"):
            from fastapi import HTTPException
            raise HTTPException(status_code=400, detail="Pipeline is disabled")

        steps = sorted(pipeline_doc["steps"], key=lambda s: s["order"])
        step_records = [
            PipelineRunStep(step_order=s["order"], actor_id=s["actor_id"])
            for s in steps
        ]

        pipeline_run = PipelineRun(
            pipeline_id=pipeline_id,
            user_id=user_id,
            steps=step_records,
        )
        doc = pipeline_run.model_dump()
        doc["started_at"] = doc["started_at"].isoformat()
        doc["created_at"] = doc["created_at"].isoformat()
        await self.db.pipeline_runs.insert_one(doc)

        # Start first step
        first_step = steps[0]
        await self._dispatch_step(
            pipeline_run_id=pipeline_run.id,
            pipeline_doc=pipeline_doc,
            step=first_step,
            user_id=user_id,
            input_data=input_data,
        )
        return pipeline_run

    async def trigger_next_step(self, completed_run_id: str):
        """
        Called by scraping_worker after a run completes.
        Finds if the run is part of a pipeline and advances to the next step.
        """
        # Find the pipeline_run that has this run_id in its steps
        pipeline_run_doc = await self.db.pipeline_runs.find_one(
            {"steps.run_id": completed_run_id}
        )
        if not pipeline_run_doc:
            return  # Not part of a pipeline — normal run, do nothing

        pipeline_run_doc.pop("_id", None)
        pipeline_doc = await self.db.pipelines.find_one(
            {"id": pipeline_run_doc["pipeline_id"]}, {"_id": 0}
        )
        if not pipeline_doc:
            return

        # Find which step just completed
        completed_step = next(
            (s for s in pipeline_run_doc["steps"] if s.get("run_id") == completed_run_id), None
        )
        if not completed_step:
            return

        completed_run = await self.db.runs.find_one({"id": completed_run_id}, {"_id": 0}) or {}

        # Mark step as succeeded or failed
        step_final_status = "succeeded" if completed_run.get("status") == "succeeded" else "failed"
        await self.db.pipeline_runs.update_one(
            {"id": pipeline_run_doc["id"], "steps.run_id": completed_run_id},
            {
                "$set": {
                    "steps.$.status": step_final_status,
                    "steps.$.finished_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

        if step_final_status == "failed":
            await self._mark_pipeline_run_done(pipeline_run_doc["id"], "failed")
            logger.warning(
                f"Pipeline {pipeline_run_doc['pipeline_id']} failed at step "
                f"{completed_step['step_order']} (run {completed_run_id})"
            )
            return

        # Find the next step
        next_step_order = completed_step["step_order"] + 1
        pipeline_steps = sorted(pipeline_doc["steps"], key=lambda s: s["order"])
        next_step = next((s for s in pipeline_steps if s["order"] == next_step_order), None)

        if not next_step:
            # All steps done — pipeline succeeded
            await self._mark_pipeline_run_done(pipeline_run_doc["id"], "succeeded")
            logger.info(f"Pipeline {pipeline_run_doc['pipeline_id']} completed successfully")
            return

        # Evaluate step condition (if any)
        condition = next_step.get("condition")
        if condition and not self._evaluate_condition(condition, completed_run):
            # Mark step as skipped and advance
            await self.db.pipeline_runs.update_one(
                {"id": pipeline_run_doc["id"], "steps.step_order": next_step_order},
                {"$set": {"steps.$.status": "skipped"}},
            )
            logger.info(f"Pipeline step {next_step_order} skipped (condition not met)")
            # Recursively try the step after that
            return

        # Map previous output → next step input
        prev_results = await self._get_run_results(completed_run_id)
        mapped_input = self._resolve_input_mapping(next_step.get("input_mapping", {}), completed_run, prev_results)

        await self._dispatch_step(
            pipeline_run_id=pipeline_run_doc["id"],
            pipeline_doc=pipeline_doc,
            step=next_step,
            user_id=pipeline_run_doc["user_id"],
            input_data=mapped_input,
        )

    # ── Helpers ───────────────────────────────────────────────────────────────

    async def _dispatch_step(
        self, pipeline_run_id: str, pipeline_doc: dict, step: dict, user_id: str, input_data: dict
    ):
        """Create a new run for a pipeline step."""
        from workers.scraping_worker import run_scraping_task

        # Check actor exists
        actor = await self.db.actors.find_one({"id": step["actor_id"]}, {"_id": 0})
        if not actor:
            logger.error(f"Pipeline step actor not found: {step['actor_id']}")
            return

        import uuid as _uuid
        from datetime import datetime as _dt
        run_id = str(_uuid.uuid4())
        now = _dt.now(timezone.utc).isoformat()

        run_doc = {
            "id": run_id,
            "user_id": user_id,
            "actor_id": step["actor_id"],
            "actor_name": actor.get("name", ""),
            "actor_icon": actor.get("icon"),
            "input_data": input_data,
            "status": "queued",
            "pipeline_run_id": pipeline_run_id,
            "created_at": now,
            "started_at": None,
            "finished_at": None,
            "duration_seconds": None,
            "results_count": 0,
            "logs": [],
            "error_message": None,
        }
        await self.db.runs.insert_one(run_doc)

        # Link run to pipeline step
        await self.db.pipeline_runs.update_one(
            {"id": pipeline_run_id, "steps.step_order": step["order"]},
            {
                "$set": {
                    "steps.$.run_id": run_id,
                    "steps.$.status": "running",
                    "steps.$.started_at": now,
                }
            },
        )

        run_scraping_task.apply_async(
            kwargs={
                "run_id": run_id,
                "actor_id": step["actor_id"],
                "user_id": user_id,
                "input_data": input_data,
            },
            queue="default",
        )
        logger.info(f"Pipeline step {step['order']} dispatched: run {run_id}")

    async def _mark_pipeline_run_done(self, pipeline_run_id: str, status: str):
        await self.db.pipeline_runs.update_one(
            {"id": pipeline_run_id},
            {
                "$set": {
                    "status": status,
                    "finished_at": datetime.now(timezone.utc).isoformat(),
                }
            },
        )

    async def _get_run_results(self, run_id: str) -> List[dict]:
        """Fetch the first 100 results from a completed run for input mapping."""
        items = await self.db.dataset_items.find(
            {"run_id": run_id}, {"_id": 0}
        ).limit(100).to_list(100)
        return [item.get("data", item) for item in items]

    def _resolve_input_mapping(
        self, mapping: dict, prev_run: dict, prev_results: List[dict]
    ) -> dict:
        """
        Resolve template expressions in input_mapping.
        Supported templates:
          {{prev.output[0].url}}     → first result's url field
          {{prev.results_count}}     → number of results
          {{prev.status}}            → run status string
        """
        def resolve_value(template: str) -> Any:
            if not isinstance(template, str):
                return template
            def replacer(match):
                expr = match.group(1).strip()
                if expr.startswith("prev.output"):
                    # e.g. prev.output[0].url
                    m = re.match(r"prev\.output\[(\d+)\]\.(.+)", expr)
                    if m and prev_results:
                        idx = int(m.group(1))
                        field = m.group(2)
                        if idx < len(prev_results):
                            return str(prev_results[idx].get(field, ""))
                    return ""
                elif expr == "prev.results_count":
                    return str(prev_run.get("results_count", 0))
                elif expr == "prev.status":
                    return str(prev_run.get("status", ""))
                return match.group(0)
            return re.sub(r"\{\{(.+?)\}\}", replacer, template)

        return {k: resolve_value(v) for k, v in mapping.items()}

    def _evaluate_condition(self, condition: str, prev_run: dict) -> bool:
        """
        Evaluate a simple condition string.
        Supported: "prev.results_count > 0", "prev.status == 'succeeded'"
        """
        try:
            safe_ctx = {
                "prev": {
                    "results_count": prev_run.get("results_count", 0),
                    "status": prev_run.get("status", ""),
                    "duration_seconds": prev_run.get("duration_seconds", 0),
                }
            }

            class _Prev(dict):
                def __getattr__(self, k):
                    return self.get(k)

            ctx = {"prev": _Prev(safe_ctx["prev"])}
            return bool(eval(condition, {"__builtins__": {}}, ctx))  # noqa: S307
        except Exception as exc:
            logger.warning(f"Pipeline condition eval error '{condition}': {exc}")
            return True  # default: run the step

    # ── Run History ───────────────────────────────────────────────────────────

    async def list_pipeline_runs(self, pipeline_id: str, user_id: str, limit: int = 20) -> list:
        pipeline = await self.get_pipeline(pipeline_id, user_id)
        if not pipeline:
            from fastapi import HTTPException
            raise HTTPException(status_code=404, detail="Pipeline not found")

        runs = await self.db.pipeline_runs.find(
            {"pipeline_id": pipeline_id}, {"_id": 0}
        ).sort("started_at", -1).limit(limit).to_list(limit)
        return runs
