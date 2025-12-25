from datetime import datetime, timedelta, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
from typing import Optional
import logging

logger = logging.getLogger(__name__)

class AccountDeletionService:
    """Service to handle account deletion with grace period and legal retention"""
    
    GRACE_PERIOD_DAYS = 7
    LEGAL_RETENTION_YEARS = 7
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
    
    async def schedule_account_deletion(self, user_id: str, username: str, password_hash: str, 
                                       feedback_reason: Optional[str] = None, 
                                       feedback_text: Optional[str] = None) -> dict:
        """Schedule account for deletion with 7-day grace period"""
        try:
            deletion_scheduled_at = datetime.now(timezone.utc)
            permanent_deletion_at = deletion_scheduled_at + timedelta(days=self.GRACE_PERIOD_DAYS)
            
            # Update user account status to 'pending_deletion'
            await self.db.users.update_one(
                {"id": user_id},
                {"$set": {
                    "account_status": "pending_deletion",
                    "deletion_scheduled_at": deletion_scheduled_at,
                    "permanent_deletion_at": permanent_deletion_at,
                    "deletion_password_hash": password_hash,  # Store for re-auth
                    "updated_at": deletion_scheduled_at
                }}
            )
            
            # Save deletion feedback if provided
            if feedback_reason:
                user = await self.db.users.find_one({"id": user_id}, {"email": 1, "username": 1})
                feedback_doc = {
                    "user_id": user_id,
                    "username": user.get("username", username),
                    "email": user.get("email", ""),
                    "reason": feedback_reason,
                    "feedback_text": feedback_text,
                    "created_at": deletion_scheduled_at
                }
                await self.db.deletion_feedback.insert_one(feedback_doc)
            
            # Log in audit trail
            await self.db.audit_logs.insert_one({
                "user_id": user_id,
                "username": username,
                "action": "account_deletion_scheduled",
                "timestamp": deletion_scheduled_at,
                "details": f"Account scheduled for deletion on {permanent_deletion_at.isoformat()}"
            })
            
            logger.info(f"Account {username} scheduled for deletion on {permanent_deletion_at}")
            
            return {
                "success": True,
                "deletion_scheduled_at": deletion_scheduled_at.isoformat(),
                "permanent_deletion_at": permanent_deletion_at.isoformat(),
                "grace_period_days": self.GRACE_PERIOD_DAYS
            }
            
        except Exception as e:
            logger.error(f"Failed to schedule account deletion for {username}: {str(e)}")
            raise
    
    async def reactivate_account(self, user_id: str, username: str) -> dict:
        """Reactivate a pending deletion account"""
        try:
            # Update user account status back to 'active'
            result = await self.db.users.update_one(
                {"id": user_id, "account_status": "pending_deletion"},
                {"$set": {
                    "account_status": "active",
                    "updated_at": datetime.now(timezone.utc)
                },
                "$unset": {
                    "deletion_scheduled_at": "",
                    "permanent_deletion_at": "",
                    "deletion_password_hash": ""
                }}
            )
            
            if result.modified_count == 0:
                return {"success": False, "error": "Account not found or not pending deletion"}
            
            # Log reactivation
            await self.db.audit_logs.insert_one({
                "user_id": user_id,
                "username": username,
                "action": "account_reactivated",
                "timestamp": datetime.now(timezone.utc),
                "details": "User reactivated account during grace period"
            })
            
            logger.info(f"Account {username} reactivated successfully")
            
            return {"success": True, "message": "Account reactivated successfully"}
            
        except Exception as e:
            logger.error(f"Failed to reactivate account for {username}: {str(e)}")
            raise
    
    async def permanently_delete_account(self, user_id: str, username: str, email: str) -> dict:
        """Permanently delete account and all data, keeping legal retention"""
        try:
            # Get user data for legal retention
            user = await self.db.users.find_one({"id": user_id})
            if not user:
                logger.warning(f"User {user_id} not found for deletion")
                return {"success": False, "error": "User not found"}
            
            deletion_time = datetime.now(timezone.utc)
            
            # Create legal retention record (7 years)
            retention_doc = {
                "user_id": user_id,
                "username": username,
                "email": email,
                "organization_name": user.get("organization_name"),
                "account_created_at": user.get("created_at"),
                "account_deleted_at": deletion_time,
                "last_login_at": user.get("last_login_at"),
                "retention_expires_at": deletion_time + timedelta(days=365 * self.LEGAL_RETENTION_YEARS),
                "deletion_reason": user.get("deletion_reason", "User requested")
            }
            await self.db.deleted_accounts_legal_retention.insert_one(retention_doc)
            
            # Delete all user data
            await self.db.user_settings.delete_many({"user_id": user_id})
            await self.db.actors.delete_many({"user_id": user_id})
            await self.db.runs.delete_many({"user_id": user_id})
            await self.db.schedules.delete_many({"user_id": user_id})
            await self.db.saved_tasks.delete_many({"user_id": user_id})
            await self.db.api_keys.delete_many({"user_id": user_id})
            await self.db.datasets.delete_many({"user_id": user_id})
            
            # Finally delete user
            await self.db.users.delete_one({"id": user_id})
            
            # Log permanent deletion
            await self.db.audit_logs.insert_one({
                "user_id": user_id,
                "username": username,
                "action": "account_permanently_deleted",
                "timestamp": deletion_time,
                "details": "Account and all data permanently deleted. Legal retention record created."
            })
            
            logger.info(f"Account {username} permanently deleted. Legal retention until {retention_doc['retention_expires_at']}")
            
            return {
                "success": True,
                "message": "Account permanently deleted",
                "legal_retention_until": retention_doc['retention_expires_at'].isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to permanently delete account {username}: {str(e)}")
            raise
    
    async def export_user_data(self, user_id: str) -> dict:
        """Export all user data for download"""
        try:
            export_data = {}
            
            # User profile
            user = await self.db.users.find_one({"id": user_id}, {"_id": 0, "hashed_password": 0, "deletion_password_hash": 0})
            export_data["user_profile"] = user
            
            # User settings
            settings = await self.db.user_settings.find_one({"user_id": user_id}, {"_id": 0})
            export_data["user_settings"] = settings
            
            # Actors
            actors = await self.db.actors.find({"user_id": user_id}, {"_id": 0}).to_list(None)
            export_data["actors"] = actors
            export_data["actors_count"] = len(actors)
            
            # Runs
            runs = await self.db.runs.find({"user_id": user_id}, {"_id": 0}).to_list(None)
            export_data["runs"] = runs
            export_data["runs_count"] = len(runs)
            
            # Schedules
            schedules = await self.db.schedules.find({"user_id": user_id}, {"_id": 0}).to_list(None)
            export_data["schedules"] = schedules
            export_data["schedules_count"] = len(schedules)
            
            # Saved tasks
            tasks = await self.db.saved_tasks.find({"user_id": user_id}, {"_id": 0}).to_list(None)
            export_data["saved_tasks"] = tasks
            export_data["saved_tasks_count"] = len(tasks)
            
            # API keys (masked)
            api_keys = await self.db.api_keys.find({"user_id": user_id}, {"_id": 0}).to_list(None)
            for key in api_keys:
                if "key" in key:
                    key["key"] = key["key"][:8] + "*" * 20  # Mask API key
            export_data["api_keys"] = api_keys
            export_data["api_keys_count"] = len(api_keys)
            
            # Datasets metadata (not full data due to size)
            datasets = await self.db.datasets.find({"user_id": user_id}, {"_id": 0, "data": 0}).to_list(None)
            export_data["datasets_metadata"] = datasets
            export_data["datasets_count"] = len(datasets)
            
            export_data["export_timestamp"] = datetime.now(timezone.utc).isoformat()
            
            logger.info(f"Data export completed for user {user_id}")
            
            return export_data
            
        except Exception as e:
            logger.error(f"Failed to export data for user {user_id}: {str(e)}")
            raise


# Singleton instance
_deletion_service = None

def get_deletion_service(db: AsyncIOMotorDatabase):
    global _deletion_service
    if _deletion_service is None:
        _deletion_service = AccountDeletionService(db)
    return _deletion_service
