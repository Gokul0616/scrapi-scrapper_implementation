import asyncio
import logging
from datetime import datetime, timezone, timedelta
from motor.motor_asyncio import AsyncIOMotorDatabase
from services.email_service import get_email_service
from routes.notification_routes import send_notification_to_user
from models.notification import Notification

logger = logging.getLogger(__name__)

class SubscriptionScheduler:
    """Scheduler to check for expiring subscriptions and notify users"""
    
    def __init__(self, db: AsyncIOMotorDatabase):
        self.db = db
        self.running = False
        self.task = None
    
    async def start(self):
        """Start the subscription scheduler"""
        if self.running:
            logger.warning("Subscription scheduler already running")
            return
        
        self.running = True
        self.task = asyncio.create_task(self._run_scheduler())
        logger.info("✅ Subscription scheduler started")
    
    async def stop(self):
        """Stop the subscription scheduler"""
        self.running = False
        if self.task:
            self.task.cancel()
            try:
                await self.task
            except asyncio.CancelledError:
                pass
        logger.info("✅ Subscription scheduler stopped")
    
    async def _run_scheduler(self):
        """Main scheduler loop - runs every 12 hours"""
        while self.running:
            try:
                await self._check_expiring_subscriptions()
                await self._process_expired_subscriptions()
                # Run twice a day
                await asyncio.sleep(12 * 3600)
            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"Error in subscription scheduler: {str(e)}", exc_info=True)
                await asyncio.sleep(3600)  # Wait an hour on error
    
    async def _check_expiring_subscriptions(self):
        """Check for subscriptions expiring in 5, 2, or 0 days and notify"""
        try:
            now = datetime.now(timezone.utc)
            email_service = get_email_service()
            
            # Helper to find and notify
            async def notify_expiring(days_left: int, reminder_key: str):
                threshold_start = now + timedelta(days=days_left)
                threshold_end = now + timedelta(days=days_left + 1)
                
                # Query users/orgs whose plan expires in the given window
                query = {
                    "plan": {"$ne": "Free"},
                    "expires_at": {
                        "$gte": threshold_start.isoformat(),
                        "$lt": threshold_end.isoformat()
                    },
                    f"expiry_reminder_sent.{reminder_key}": {"$ne": True}
                }
                
                # Process Users
                users = await self.db.users.find(query).to_list(None)
                for user in users:
                    await self._send_expiry_notification(user, "personal", days_left, reminder_key)
                
                # Process Organizations
                orgs = await self.db.organizations.find(query).to_list(None)
                for org in orgs:
                    await self._send_expiry_notification(org, "organization", days_left, reminder_key)

            # Check 5 days, 2 days, and today
            await notify_expiring(5, "5d")
            await notify_expiring(2, "2d")
            await notify_expiring(0, "0d")
            
        except Exception as e:
            logger.error(f"Error checking expiring subscriptions: {str(e)}", exc_info=True)

    async def _send_expiry_notification(self, workspace: dict, ws_type: str, days_left: int, reminder_key: str):
        """Utility to send both Email and WebSocket notifications"""
        user_id = workspace.get("id") if ws_type == "personal" else workspace.get("owner_user_id")
        email = workspace.get("email") or workspace.get("billing_email")
        ws_name = workspace.get("username") if ws_type == "personal" else workspace.get("name")
        plan_name = workspace.get("plan")
        
        msg = f"Your {plan_name} plan is expiring in {days_left} days!" if days_left > 0 else f"Your {plan_name} plan expires today!"
        title = "Plan Expiration Reminder 💳" if days_left > 0 else "Plan Expiring Today! ⚠️"
        
        # 1. WebSocket Notification
        if user_id:
            try:
                notification = Notification(
                    user_id=user_id,
                    title=title,
                    message=msg,
                    type="billing",
                    icon="💳",
                    link="/settings?tab=billing"
                )
                await send_notification_to_user(user_id, notification)
            except Exception as e:
                logger.error(f"Failed WS notification to {user_id}: {e}")

        # 2. Email Notification
        if email:
            try:
                # Assuming email_service has a method for this, or use a generic one
                await get_email_service().send_custom_email(
                    to_email=email,
                    subject=title,
                    body=f"Hello {ws_name},\n\n{msg}\n\nPlease renew your subscription to maintain your premium limits and features.\n\nBest regards,\nThe Scrapi Team"
                )
            except Exception as e:
                logger.error(f"Failed Email notification to {email}: {e}")

        # 3. Mark as sent
        collection = self.db.users if ws_type == "personal" else self.db.organizations
        await collection.update_one(
            {"id": workspace.get("id")},
            {"$set": {f"expiry_reminder_sent.{reminder_key}": True}}
        )
        logger.info(f"Sent {reminder_key} expiry reminder to {ws_type} {ws_name}")

    async def _process_expired_subscriptions(self):
        """Revert expired plans to Free tier"""
        try:
            now = datetime.now(timezone.utc)
            
            query = {
                "plan": {"$ne": "Free"},
                "expires_at": {"$lt": now.isoformat()}
            }
            
            # Simple fallback: reset plan to Free and credits to 5.0
            update = {
                "$set": {
                    "plan": "Free",
                    "platform_credits": 5.0,
                    "limits": {"max_concurrent_runs": 1, "max_ram_gb": 8, "max_actor_build_mins": 10, "data_retention_days": 7, "max_schedules": 0},
                    "billing_period": "monthly"
                }
            }
            
            # Update Users
            result_users = await self.db.users.update_many(query, update)
            # Update Organizations
            result_orgs = await self.db.organizations.update_many(query, update)
            
            if result_users.modified_count > 0 or result_orgs.modified_count > 0:
                logger.info(f"✅ Reverted {result_users.modified_count} users and {result_orgs.modified_count} orgs to Free plan due to expiration.")
                
        except Exception as e:
            logger.error(f"Error processing expired subscriptions: {str(e)}", exc_info=True)

# Singleton instance
_scheduler = None

async def init_subscription_scheduler(db: AsyncIOMotorDatabase):
    """Initialize and start the subscription scheduler"""
    global _scheduler
    if _scheduler is None:
        _scheduler = SubscriptionScheduler(db)
        await _scheduler.start()
    return _scheduler

def get_subscription_scheduler():
    return _scheduler
