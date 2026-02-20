import os
import stripe
from datetime import datetime, timezone
from database import get_db

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_fake_key")

class BillingService:
    async def get_billing_summary(self, workspace_id: str, workspace_type: str):
        """Generates the billing payload expected by the frontend Billing.js"""
        db = get_db()
        print(f"[BILLING DEBUG] db object: {db}, type: {type(db)}")
        print(f"[BILLING DEBUG] Looking for workspace_id: {workspace_id}, type: {workspace_type}")
        
        # Retrieve the user or organization
        if workspace_type == "organization":
            workspace = await db.organizations.find_one({"id": workspace_id})
        else:
            workspace = await db.users.find_one({"id": workspace_id})
        
        print(f"[BILLING DEBUG] workspace query result: {workspace}")
        
        if not workspace:
            raise ValueError("Workspace not found")
            
        plan_name = workspace.get("plan", "Free")
        platform_credits = workspace.get("platform_credits", 5.0)
        
        # Calculate current billing period (e.g. beginning of month)
        now = datetime.now(timezone.utc)
        start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        end_of_month = now.replace(month=now.month % 12 + 1, day=1, hour=0, minute=0, second=0, microsecond=0) if now.month < 12 else now.replace(year=now.year + 1, month=1, day=1, hour=0, minute=0, second=0, microsecond=0)
        
        # Aggregate usage from runs in this period
        # Note: created_at is stored as ISO string in DB, so we need to compare strings
        db = get_db()
        runsCursor = db.runs.find({
            "user_id" if workspace_type == "personal" else "organization_id": workspace_id,
            "created_at": {"$gte": start_of_month.isoformat()}
        })
        
        compute_units_used = 0.0
        async for run in runsCursor:
            compute_units_used += run.get("compute_units_used", 0.0)
            
        # CU Price roughly $0.50
        cu_cost = compute_units_used * 0.50
        
        # The mock frontend expects planConsumption
        free_used = min(cu_cost, platform_credits)
        free_total = platform_credits
        free_remaining = max(0, free_total - free_used)
        
        total_usage = cu_cost # Simplified total
        
        return {
            "totalUsage": total_usage,
            "billingPeriod": {
                "start": start_of_month.strftime("%b %d, %Y"),
                "end": end_of_month.strftime("%b %d, %Y"),
                "type": "Monthly"
            },
            "planConsumption": {
                "freeUsed": free_used,
                "freeTotal": free_total,
                "freeRemaining": free_remaining
            },
            "services": [
                { "name": 'Actors', "color": 'bg-emerald-500', "amount": cu_cost, "icon": '●' },
                { "name": 'Data transfer', "color": 'bg-purple-500', "amount": 0.00, "icon": '●' },
                { "name": 'Proxy', "color": 'bg-orange-500', "amount": 0.00, "icon": '●' },
                { "name": 'Storage', "color": 'bg-blue-500', "amount": 0.00, "icon": '●' }
            ],
            "plan_name": plan_name
        }

    def calculate_compute_units(self, duration_seconds: int, ram_mb: int) -> float:
        """
        Calculates compute units based on Apify formula:
        (duration_in_hours) * (ram_in_gb)
        """
        if not duration_seconds:
            return 0.0
        hours = duration_seconds / 3600.0
        gb = ram_mb / 1024.0
        return hours * gb

    async def record_run_usage(self, run_id: str):
        """Update a run with exact CU cost to deduct from their plan after finishing"""
        db = get_db()
        run = await db.runs.find_one({"id": run_id})
        if not run:
            return
            
        duration = run.get("duration_seconds", 0)
        ram_mb = run.get("ram_mb", 1024)
        
        cu_used = self.calculate_compute_units(duration, ram_mb)
        cost = cu_used * 0.50  # Let's say 1 CU = $0.50
        
        # update run
        db = get_db()
        await db.runs.update_one({"id": run_id}, {"$set": {"compute_units_used": cu_used, "cost": cost}})

    async def create_checkout_session(self, workspace_id: str, workspace_type: str, plan_type: str):
        """Generate a Stripe Checkout session to upgrade plan"""
        
        # In a real scenario we'd query price_id from DB or env based on plan_type
        # Using a generic recurring test price for demonstration
        price_id = os.getenv("STRIPE_STARTER_PRICE_ID", "price_fake_test_123")
        
        try:
            session = stripe.checkout.Session.create(
                payment_method_types=['card'],
                line_items=[{
                    'price': price_id,
                    'quantity': 1,
                }],
                mode='subscription',
                success_url='http://localhost:3000/settings?tab=billing&success=true',
                cancel_url='http://localhost:3000/settings?tab=billing&canceled=true',
                client_reference_id=f"{workspace_type}_{workspace_id}"
            )
            return session.url
        except stripe.error.StripeError as e:
            # Fallback for when API keys are totally fake and crash
            print(f"Stripe error: {str(e)}")
            return 'http://localhost:3000/settings?tab=billing&dummyCheckout=true'

billing_service = BillingService()
