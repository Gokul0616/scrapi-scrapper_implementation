"""
MongoDB Job Store for APScheduler.
Provides persistent storage for scheduled jobs in MongoDB.
"""

import pickle
import logging
from typing import Dict, List, Optional, Any
from datetime import datetime, timezone
from apscheduler.jobstores.base import BaseJobStore, JobLookupError, ConflictingIdError
from apscheduler.job import Job
from apscheduler.triggers.cron import CronTrigger
from apscheduler.triggers.interval import IntervalTrigger
from apscheduler.triggers.date import DateTrigger
from motor.motor_asyncio import AsyncIOMotorDatabase

logger = logging.getLogger(__name__)


class MongoDBJobStore(BaseJobStore):
    """
    MongoDB-based job store for APScheduler.
    
    Stores job definitions, execution history, and state in MongoDB collections:
    - scheduler_jobs: Job definitions and metadata
    - scheduler_job_history: Execution history
    """
    
    def __init__(self, db: AsyncIOMotorDatabase, collection: str = 'scheduler_jobs', 
                 history_collection: str = 'scheduler_job_history'):
        """
        Initialize MongoDB job store.
        
        Args:
            db: Async MongoDB database instance
            collection: Name of jobs collection
            history_collection: Name of history collection
        """
        self.db = db
        self.collection = collection
        self.history_collection = history_collection
        
    async def start(self, scheduler, alias):
        """Start the job store and create indexes."""
        try:
            # Create indexes for efficient queries
            await self.db[self.collection].create_index([("job_id", 1)], unique=True)
            await self.db[self.collection].create_index([("next_run_time", 1)])
            await self.db[self.collection].create_index([("id", 1)], unique=True)
            
            await self.db[self.history_collection].create_index([("job_id", 1)])
            await self.db[self.history_collection].create_index([("scheduled_fire_time", -1)])
            
            logger.info(f"✅ MongoDB job store initialized with collections: {self.collection}, {self.history_collection}")
        except Exception as e:
            logger.error(f"❌ Failed to initialize MongoDB job store: {str(e)}")
            raise

    async def lookup_job(self, job_id: str) -> Optional[Job]:
        """Retrieve a job by its ID."""
        try:
            doc = await self.db[self.collection].find_one({"job_id": job_id})
            if not doc:
                return None
            
            # Deserialize job from pickled state
            job_state = pickle.loads(doc['job_state'])
            job = Job.__new__(Job)
            job.__setstate__(job_state)
            job._scheduler = None
            
            return job
        except Exception as e:
            logger.error(f"❌ Failed to lookup job {job_id}: {str(e)}")
            return None

    async def get_due_jobs(self, now: datetime) -> List[Job]:
        """Retrieve all jobs that are due to run."""
        try:
            cursor = self.db[self.collection].find({
                "next_run_time": {"$lte": now}
            }).sort("next_run_time", 1)
            
            jobs = []
            async for doc in cursor:
                try:
                    job_state = pickle.loads(doc['job_state'])
                    job = Job.__new__(Job)
                    job.__setstate__(job_state)
                    job._scheduler = None
                    jobs.append(job)
                except Exception as e:
                    logger.error(f"Failed to deserialize job {doc['job_id']}: {str(e)}")
            
            return jobs
        except Exception as e:
            logger.error(f"❌ Failed to get due jobs: {str(e)}")
            return []

    async def get_next_run_time(self) -> Optional[datetime]:
        """Get the next run time for the next job to run."""
        try:
            doc = await self.db[self.collection].find_one(
                {"next_run_time": {"$ne": None}},
                sort=[("next_run_time", 1)]
            )
            if doc:
                return doc['next_run_time']
            return None
        except Exception as e:
            logger.error(f"❌ Failed to get next run time: {str(e)}")
            return None

    async def get_all_jobs(self) -> List[Job]:
        """Retrieve all jobs."""
        try:
            cursor = self.db[self.collection].find().sort("next_run_time", 1)
            
            jobs = []
            async for doc in cursor:
                try:
                    job_state = pickle.loads(doc['job_state'])
                    job = Job.__new__(Job)
                    job.__setstate__(job_state)
                    job._scheduler = None
                    jobs.append(job)
                except Exception as e:
                    logger.error(f"Failed to deserialize job {doc['job_id']}: {str(e)}")
            
            return jobs
        except Exception as e:
            logger.error(f"❌ Failed to get all jobs: {str(e)}")
            return []

    async def add_job(self, job: Job) -> None:
        """Add a job to the store."""
        try:
            # Check for duplicate job ID
            existing = await self.db[self.collection].find_one({
                "$or": [
                    {"job_id": job.id},
                    {"id": job.id}
                ]
            })
            if existing:
                raise ConflictingIdError(job.id)
            
            job_doc = {
                "job_id": job.id,
                "id": job.id,
                "job_state": pickle.dumps(job.__getstate__()),
                "next_run_time": job.next_run_time,
                "created_at": datetime.now(timezone.utc),
                "updated_at": datetime.now(timezone.utc),
                "is_paused": False,
                "run_count": 0,
                "last_run_time": None,
                "last_status": None
            }
            
            # Store trigger information for recovery
            if job.trigger:
                trigger_info = self._serialize_trigger(job.trigger)
                if trigger_info:
                    job_doc["trigger"] = trigger_info
            
            await self.db[self.collection].insert_one(job_doc)
            logger.info(f"✅ Added job {job.id} to MongoDB")
        except ConflictingIdError:
            raise
        except Exception as e:
            logger.error(f"❌ Failed to add job {job.id}: {str(e)}")
            raise

    async def update_job(self, job: Job) -> None:
        """Update an existing job."""
        try:
            doc = {
                "job_state": pickle.dumps(job.__getstate__()),
                "next_run_time": job.next_run_time,
                "updated_at": datetime.now(timezone.utc)
            }
            
            result = await self.db[self.collection].update_one(
                {"job_id": job.id},
                {"$set": doc}
            )
            
            if result.matched_count == 0:
                raise JobLookupError(job.id)
            
            logger.debug(f"Updated job {job.id}")
        except JobLookupError:
            raise
        except Exception as e:
            logger.error(f"❌ Failed to update job {job.id}: {str(e)}")
            raise

    async def remove_job(self, job_id: str) -> None:
        """Remove a job from the store."""
        try:
            result = await self.db[self.collection].delete_one({"job_id": job_id})
            if result.deleted_count == 0:
                raise JobLookupError(job_id)
            
            logger.info(f"Removed job {job_id}")
        except JobLookupError:
            raise
        except Exception as e:
            logger.error(f"❌ Failed to remove job {job_id}: {str(e)}")
            raise

    async def remove_all_jobs(self) -> None:
        """Remove all jobs from the store."""
        try:
            await self.db[self.collection].delete_many({})
            logger.info("Removed all jobs")
        except Exception as e:
            logger.error(f"❌ Failed to remove all jobs: {str(e)}")
            raise

    async def record_job_execution(
        self, 
        job_id: str, 
        scheduled_fire_time: datetime,
        status: str = "success",
        run_id: Optional[str] = None,
        error_message: Optional[str] = None
    ) -> None:
        """
        Record a job execution in the history.
        
        Args:
            job_id: Job identifier
            scheduled_fire_time: When the job was scheduled to run
            status: Execution status (success, failed, missed)
            run_id: Associated run ID
            error_message: Error message if failed
        """
        try:
            history_doc = {
                "job_id": job_id,
                "scheduled_fire_time": scheduled_fire_time,
                "actual_run_time": datetime.now(timezone.utc),
                "status": status,
                "run_id": run_id,
                "error_message": error_message,
                "created_at": datetime.now(timezone.utc)
            }
            
            await self.db[self.history_collection].insert_one(history_doc)
            
            # Update job statistics
            update_doc = {
                "$inc": {
                    "run_count": 1,
                    f"stats.{status}": 1
                },
                "$set": {
                    "last_run_time": scheduled_fire_time,
                    "last_status": status,
                    "last_run_id": run_id,
                    "updated_at": datetime.now(timezone.utc)
                }
            }
            
            if run_id:
                update_doc["$set"]["last_run_id"] = run_id
            
            await self.db[self.collection].update_one(
                {"job_id": job_id},
                update_doc,
                upsert=False
            )
            
            logger.debug(f"Recorded execution for job {job_id}: {status}")
        except Exception as e:
            logger.error(f"❌ Failed to record job execution: {str(e)}")

    async def get_job_history(self, job_id: str, limit: int = 100) -> List[Dict[str, Any]]:
        """
        Get execution history for a job.
        
        Args:
            job_id: Job identifier
            limit: Maximum number of history records to return
            
        Returns:
            List of execution history records
        """
        try:
            cursor = self.db[self.history_collection].find(
                {"job_id": job_id}
            ).sort("scheduled_fire_time", -1).limit(limit)
            
            history = []
            async for doc in cursor:
                history.append(doc)
            
            return history
        except Exception as e:
            logger.error(f"❌ Failed to get job history: {str(e)}")
            return []

    async def pause_job(self, job_id: str) -> None:
        """Pause a job."""
        try:
            result = await self.db[self.collection].update_one(
                {"job_id": job_id},
                {
                    "$set": {
                        "is_paused": True,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            if result.matched_count == 0:
                raise JobLookupError(job_id)
            
            logger.info(f"Paused job {job_id}")
        except JobLookupError:
            raise
        except Exception as e:
            logger.error(f"❌ Failed to pause job {job_id}: {str(e)}")
            raise

    async def resume_job(self, job_id: str) -> None:
        """Resume a paused job."""
        try:
            result = await self.db[self.collection].update_one(
                {"job_id": job_id},
                {
                    "$set": {
                        "is_paused": False,
                        "updated_at": datetime.now(timezone.utc)
                    }
                }
            )
            
            if result.matched_count == 0:
                raise JobLookupError(job_id)
            
            logger.info(f"Resumed job {job_id}")
        except JobLookupError:
            raise
        except Exception as e:
            logger.error(f"❌ Failed to resume job {job_id}: {str(e)}")
            raise

    async def is_job_paused(self, job_id: str) -> bool:
        """Check if a job is paused."""
        try:
            doc = await self.db[self.collection].find_one(
                {"job_id": job_id},
                {"is_paused": 1}
            )
            return doc.get("is_paused", False) if doc else False
        except Exception as e:
            logger.error(f"❌ Failed to check if job is paused: {str(e)}")
            return False

    def _serialize_trigger(self, trigger) -> Optional[Dict[str, Any]]:
        """Serialize a trigger object for storage."""
        try:
            if isinstance(trigger, CronTrigger):
                return {
                    "type": "cron",
                    "fields": trigger.fields,
                    "timezone": str(trigger.timezone)
                }
            elif isinstance(trigger, IntervalTrigger):
                return {
                    "type": "interval",
                    "interval": trigger.interval.total_seconds(),
                    "timezone": str(trigger.timezone)
                }
            elif isinstance(trigger, DateTrigger):
                return {
                    "type": "date",
                    "run_date": trigger.run_date.isoformat(),
                    "timezone": str(trigger.timezone)
                }
            return None
        except Exception as e:
            logger.warning(f"Failed to serialize trigger: {str(e)}")
            return None
