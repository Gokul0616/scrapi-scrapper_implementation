"""Background scheduler for permanent account deletion after grace period"""
import asyncio
from datetime import datetime, timezone
from motor.motor_asyncio import AsyncIOMotorDatabase
import logging
from services.account_deletion_service import get_deletion_service
from services.email_service import get_email_service

logger = logging.getLogger(__name__)

class DeletionScheduler:
    """Scheduler to permanently delete accounts after grace period"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.running = False
        self.task = None
    
    async def start(self):
        """Start the deletion scheduler"""
        if self.running:
            logger.warning("Deletion scheduler already running")
            return
        
        self.running = True
        self.task = asyncio.create_task(self._run_scheduler())
        logger.info("✅ Deletion scheduler started")
    
    async def stop(self):
        """Stop the deletion scheduler"""
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info("✅ Deletion scheduler stopped")
    
    async def _run_scheduler(self):
        """Main scheduler loop - runs every hour"""
        while self.running:
            try:
                await self._process_pending_deletions()
                await self._send_deletion_reminders()
                # Run every hour
                await asyncio.sleep(3600)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in deletion scheduler: {str(e)}", exc_info=True)
                await asyncio.sleep(300)  # Wait 5 minutes on error
    
    async def _process_pending_deletions(self):
        """Process accounts that have passed grace period"""
        try:
            now = datetime.now(timezone.utc)
            
            # Find accounts that are past their permanent deletion date
            pending_accounts = await self.db.users.find({
                "account_status": "pending_deletion",
                "permanent_deletion_at": {"$lte": now}
            }).to_list(None)
            
            deletion_service = get_deletion_service(self.db)
            email_service = get_email_service()
            
            for user in pending_accounts:
                user_id = user.get("id")
                username = user.get("username")
                email = user.get("email")
                
                logger.info(f"Permanently deleting account: {username}")
                
                # Permanently delete account
                result = await deletion_service.permanently_delete_account(user_id, username, email)
                
                if result.get("success"):
                    # Send final deletion confirmation email
                    try:
                        await email_service.send_account_deletion_email(email, username)
                    except Exception as e:
                        logger.error(f"Failed to send deletion email to {email}: {str(e)}")
                    
                    logger.info(f"✅ Account {username} permanently deleted")
            
            if pending_accounts:
                logger.info(f"Processed {len(pending_accounts)} pending deletions")
            
        except Exception as e:
            logger.error(f"Error processing pending deletions: {str(e)}", exc_info=True)
    
    async def _send_deletion_reminders(self):
        """Send reminder emails for accounts pending deletion"""
        try:
            from datetime import timedelta
            now = datetime.now(timezone.utc)
            
            # Find accounts with 2 days remaining (grace period - 5 days ago)
            reminder_threshold = now + timedelta(days=2)
            
            pending_accounts = await self.db.users.find({
                "account_status": "pending_deletion",
                "permanent_deletion_at": {"$lte": reminder_threshold, "$gt": now},
                "deletion_reminder_sent": {"$ne": True}
            }).to_list(None)
            
            email_service = get_email_service()
            
            for user in pending_accounts:
                username = user.get("username")
                email = user.get("email")
                permanent_deletion_at = user.get("permanent_deletion_at")
                
                if not email:
                    continue
                
                days_remaining = (permanent_deletion_at - now).days
                
                try:
                    await email_service.send_deletion_reminder_email(
                        email, 
                        username, 
                        days_remaining,
                        permanent_deletion_at
                    )
                    
                    # Mark reminder as sent
                    await self.db.users.update_one(
                        {"id": user.get("id")},
                        {"$set": {"deletion_reminder_sent": True}}
                    )
                    
                    logger.info(f"Sent deletion reminder to {username}")
                    
                except Exception as e:
                    logger.error(f"Failed to send reminder to {email}: {str(e)}")
            
        except Exception as e:
            logger.error(f"Error sending deletion reminders: {str(e)}", exc_info=True)


# Singleton instance
_scheduler = None

async def init_deletion_scheduler(db: AsyncIOMotorDatabase):
    """Initialize and start the deletion scheduler"""
    global _scheduler
    if _scheduler is None:
        _scheduler = DeletionScheduler(db)
        await _scheduler.start()
    return _scheduler

def get_deletion_scheduler():
    """Get the deletion scheduler instance"""
    return _scheduler
