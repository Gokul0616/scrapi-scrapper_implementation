import os
import stripe
import logging
from datetime import datetime, timezone, timedelta
from database import get_db

logger = logging.getLogger(__name__)

stripe.api_key = os.getenv("STRIPE_SECRET_KEY", "sk_test_fake_key")

def parse_datetime_safe(date_str):
    if not date_str: return None
    try:
        if isinstance(date_str, datetime): return date_str
        if date_str.endswith('Z'): date_str = date_str[:-1] + '+00:00'
        dt = datetime.fromisoformat(date_str)
        if dt.tzinfo is None: dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except: return None

class BillingService:
    PLAN_DATA = {
        "free": {
            "name": "Free", "price": 0, 
            "features": ["5 Actor runs / month", "1 GB memory", "7-day data retention"],
            "gradient": "linear-gradient(90deg,#f97316,#ef4444)", "payg": None, "tier": None
        },
        "starter": {
            "name": "Starter", "price": 29, 
            "features": ["100 Actor runs / month", "4 GB memory", "30-day data retention", "Email support"],
            "gradient": "linear-gradient(90deg,#f59e0b,#fbbf24)", "payg": "$29 then\nPay as you go", "tier": "Bronze 🥉"
        },
        "growth": {
            "name": "Growth", "price": 99, 
            "features": ["Unlimited Actor runs", "8 GB memory", "90-day data retention", "Priority support"],
            "gradient": "linear-gradient(90deg,#6366f1,#8b5cf6)", "payg": "$99 then\nPay as you go", "tier": "Silver 🥈"
        },
        "scale": {
            "name": "Scale", "price": 299, 
            "features": ["Unlimited everything", "16 GB memory", "180-day data retention", "Dedicated support"],
            "gradient": "linear-gradient(90deg,#10b981,#14b8a6)", "payg": "$299 then\nPay as you go", "tier": "Gold 🥇"
        },
        "enterprise": {
            "name": "Enterprise", "price": None, 
            "features": ["Custom usage limits", "Custom retention", "Dedicated support", "SSO & more"],
            "gradient": "linear-gradient(90deg,#7c3aed,#5b21b6)", "payg": None, "tier": None
        }
    }
    
    PLAN_PRICES = {
        "free": 0.0,
        "starter": 29.0,
        "growth": 99.0,
        "scale": 299.0,
        "enterprise": 0.0
    }

    ADDON_DATA = {
        "datacenter_proxies": {
            "label": "Shared datacenter proxies", "price": 1, "unit": "IP",
            "title": "Shared datacenter proxies",
            "description": "Improve reliability of data extraction from the web.",
            "tooltip": "Additional shared datacenter proxy IPs billed at $1 per IP per month.",
            "displayPrice": "$1 / IP", "type": "spinner", "min": 0, "max": 500
        },
        "actor_memory": {
            "label": "Max Actor memory", "price": 2, "unit": "GB",
            "title": "Max Actor memory",
            "description": "Run Actors with more memory to make them faster.",
            "tooltip": "Extra RAM available for each Actor run, billed at $2 per GB.",
            "displayPrice": "$2 / GB", "type": "spinner", "min": 0, "max": 256
        },
        "priority_support": {
            "label": "Priority chat support", "price": 100, "unit": None,
            "title": "Priority chat support",
            "description": "Get priority for chatting with the Scrapi support team.",
            "tooltip": "Skip the queue and get priority access to our support agents.",
            "displayPrice": "$100", "type": "toggle", "min": 0, "max": 1
        },
        "tech_training": {
            "label": "Personal tech training", "price": 150, "unit": "hour", # Changed from 'hr' for consistency
            "title": "Personal tech training",
            "description": "Individual time with Scrapi engineers to help you develop your scrapers.",
            "tooltip": "One-on-one session with a Scrapi engineer at $150 per hour.",
            "displayPrice": "$150 / hour", "type": "spinner", "min": 0, "max": 20
        },
        "concurrent_runs": {
            "label": "Max Actor concurrent runs", "price": 5, "unit": "run",
            "title": "Max Actor concurrent runs",
            "description": "Run more Actors in parallel.",
            "tooltip": "Add extra concurrent Actor run slots at $5 per run.",
            "displayPrice": "$5 / run", "type": "spinner", "min": 0, "max": 100
        },
    }

    async def get_billing_summary(self, workspace_id: str, workspace_type: str):
        """Generates the billing payload expected by the frontend Billing.js"""
        db = get_db()
        
        # Retrieve the user or organization
        if workspace_type == "organization":
            workspace = await db.organizations.find_one({"id": workspace_id})
        else:
            workspace = await db.users.find_one({"id": workspace_id})
        
        if not workspace:
            raise ValueError("Workspace not found")
            
        plan_name = workspace.get("plan", "Free").lower()
        
        base_credits = {
            "free": 0.0,
            "starter": 29.0,
            "growth": 99.0,
            "scale": 299.0,
            "enterprise": 0.0
        }
        monthly_base = base_credits.get(plan_name, 0.0)
        
        plan_period = workspace.get("billing_period", "monthly")
        now = datetime.now(timezone.utc)
        
        # Irrespective of the subscription duration, credits reset and map strictly to a 30-day window
        platform_credits = 5.0 + monthly_base

        expires_at_str = workspace.get("expires_at")
        
        if expires_at_str:
            if isinstance(expires_at_str, str):
                expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
                if expires_at.tzinfo is None:
                    expires_at = expires_at.replace(tzinfo=timezone.utc)
            else:
                expires_at = expires_at_str
        else:
            expires_at = now + timedelta(days=28)
            
        # For Paid plans, usage resets on the anniversary (calculated from expires_at)
        # For Free plans or if anniversary is unknown, fallback to the 1st of the calendar month
        if plan_name != "free" and expires_at_str:
            # Current period starts exactly one month (or period) before expiration
            # We use the day from expires_at
            anniversary_day = expires_at.day
            
            # If today is after the anniversary day this month, start is this month's anniversary
            if now.day >= anniversary_day:
                start_of_period = now.replace(day=anniversary_day, hour=0, minute=0, second=0, microsecond=0)
            else:
                # Start was last month's anniversary
                last_month = now.replace(day=1) - timedelta(days=1)
                try:
                    start_of_period = last_month.replace(day=anniversary_day, hour=0, minute=0, second=0, microsecond=0)
                except ValueError:
                    # Handle Feb 29/30/31 case
                    start_of_period = last_month.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        else:
            # Fallback to 1st of month
            start_of_period = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)

        # End of period is always the next anniversary or 1st of next month
        if plan_name != "free" and expires_at_str:
            end_of_period = expires_at
        else:
            if start_of_period.month == 12:
                end_of_period = start_of_period.replace(year=start_of_period.year + 1, month=1)
            else:
                end_of_period = start_of_period.replace(month=start_of_period.month + 1)

        # Aggregate usage from runs in this period for "Actors" breakdown
        # 1. Aggregate Terminated Runs (Using pre-calculated fields)
        terminated_query = {
            "user_id" if workspace_type == "personal" else "organization_id": workspace_id,
            "created_at": {"$gte": start_of_period.isoformat()},
            "status": {"$in": ["succeeded", "aborted", "failed"]}
        }
        
        # Breakdown by actor and Global Totals in one aggregation?
        # Let's do breakdown first
        actor_pipeline = [
            {"$match": terminated_query},
            {"$group": {
                "_id": "$actor_id",
                "actor_name": {"$first": "$actor_name"},
                "event_count": {"$sum": 1},
                "event_cost": {"$sum": "$event_cost"},
                "total_cu": {"$sum": "$compute_units_used"},
                "last_run": {"$max": "$started_at"}
            }}
        ]
        
        terminated_actors = await db.runs.aggregate(actor_pipeline).to_list(length=None)
        
        compute_units_used = 0.0
        total_event_cost = 0.0
        actor_run_details = []
        
        for actor_data in terminated_actors:
            actor_id = actor_data["_id"]
            compute_units_used += actor_data["total_cu"]
            total_event_cost += actor_data["event_cost"]
            
            # Formulate detail row
            actor_rec = await db.actors.find_one({"id": actor_id})
            author = actor_rec.get("author_name") if actor_rec else "scrapi"
            
            actor_run_details.append({
                "actor_id": actor_id,
                "actor_name": f"{author}/{actor_data['actor_name']}",
                "unit_label": "Actor Start",
                "date": actor_data["last_run"],
                "units": f"{actor_data['event_count']} events",
                "price_per_unit": "$0.008 per event",
                "cost": actor_data["event_cost"],
                "type": "run"
            })
            
        # 2. Estimate Running Runs (Real-time)
        running_query = {
            "user_id" if workspace_type == "personal" else "organization_id": workspace_id,
            "created_at": {"$gte": start_of_period.isoformat()},
            "status": "running"
        }
        running_runs = await db.runs.find(running_query).to_list(length=None)
        
        for run in running_runs:
            started_at_str = run.get("started_at")
            if started_at_str:
                started_at = parse_datetime_safe(started_at_str)
                if started_at:
                    duration_sec = (now - started_at).total_seconds()
                    cu = self.calculate_compute_units(int(duration_sec), run.get("ram_mb", 1024))
                    compute_units_used += cu
                    
            # We don't add "running" jobs to the Pay Per Event list until they're finished/aborted
            # because the event fee isn't locked in yet (could fail and be $0)
            
        # CU Price $0.50
        cu_cost = compute_units_used * 0.50
        
        # Total cost for Actors service
        actors_total_cost = total_event_cost + cu_cost
        
        # Storage usage calculation
        dataset_cursor = db.datasets.find({
            "user_id" if workspace_type == "personal" else "organization_id": workspace_id
        })
        
        total_items = 0
        timed_storage_cost = 0.0
        
        async for ds in dataset_cursor:
            items = ds.get("item_count", 0)
            total_items += items
            
            # Timed Storage (GB-hours) 
            # Assume 0.5KB per item
            ds_size_gb = (items * 0.5) / (1024 * 1024)
            
            # Calculate hours since creation or within billing period
            created_at = ds.get("created_at")
            
            if isinstance(created_at, str):
                try:
                    # Handle ISO format and 'Z' suffix
                    created_at = datetime.fromisoformat(created_at.replace("Z", "+00:00"))
                except (ValueError, TypeError):
                    created_at = None
            
            if not created_at:
                created_at = start_of_period
            
            # Ensure it's timezone-aware
            if created_at.tzinfo is None:
                created_at = created_at.replace(tzinfo=timezone.utc)
                
            start_tz = start_of_period.replace(tzinfo=timezone.utc) if start_of_period.tzinfo is None else start_of_period
            active_since = max(created_at, start_tz)
            hours_active = (now - active_since).total_seconds() / 3600
            hours_active = max(0.0, float(hours_active))
            
            cost = ds_size_gb * hours_active * 0.0010
            timed_storage_cost += cost
            
        # Write operations: $0.005 per 1,000 writes
        write_ops_cost = (total_items / 1000) * 0.005
        # Read operations: $0.0004 per 1,000 reads (simulate 2 reads per item)
        read_ops_cost = ((total_items * 2) / 1000) * 0.0004

        storage_total_cost = timed_storage_cost + write_ops_cost + read_ops_cost

        # Proxy and Data Transfer Simulation (based on runs for visual spikes/variety)
        # In a real app, these would come from usage logs
        # No simulated proxy or data transfer costs as per user request
        proxy_total_cost = 0.0
        data_transfer_total_cost = 0.0

        total_usage = actors_total_cost + storage_total_cost + proxy_total_cost + data_transfer_total_cost

        # The frontend expects planConsumption
        free_total = platform_credits
        free_used = min(total_usage, free_total) 
        free_remaining = max(0, free_total - free_used)
        
        # Calculate current active RAM usage
        running_runs_cursor = db.runs.find({
            "user_id" if workspace_type == "personal" else "organization_id": workspace_id,
            "status": "running"
        })
        
        current_ram_mb = 0
        async for active_run in running_runs_cursor:
            current_ram_mb += active_run.get("ram_mb", 1024)
            
        # Get plan limits
        plan_limits = workspace.get("limits", {})
        # Default to 2GB (2048MB) if not set, or read from plan limits
        max_ram_gb = plan_limits.get("max_ram_gb", 8)
        max_ram_mb = max_ram_gb * 1024
        
        # Calculate current counts for Limits UI
        workspace_query = {"user_id" if workspace_type == "personal" else "organization_id": workspace_id}
        current_actors_count = await db.actors.count_documents(workspace_query)
        current_schedules_count = await db.schedules.count_documents(workspace_query)
        current_tasks_count = await db.tasks.count_documents(workspace_query)
        
        return {
            "totalUsage": total_usage,
            "billingPeriod": {
                "start": start_of_period.strftime("%b %d, %Y"),
                "end": end_of_period.strftime("%b %d, %Y"),
                "type": "Annual" if plan_period == "yearly" else "Monthly"
            },
            "planConsumption": {
                "freeUsed": free_used,
                "freeTotal": free_total,
                "freeRemaining": free_remaining
            },
            "ramUsage": {
                "used_mb": current_ram_mb,
                "limit_mb": max_ram_mb
            },
            "limits": {
                "max_concurrent_runs": plan_limits.get("max_concurrent_runs", 1),
                "max_ram_gb": max_ram_gb,
                "max_actor_build_mins": plan_limits.get("max_actor_build_mins", 10),
                "data_retention_days": plan_limits.get("data_retention_days", 7),
                "max_schedules": plan_limits.get("max_schedules", 0),
                "max_actors": plan_limits.get("max_actors", 10 if plan_name == "free" else 500),
                "max_tasks": plan_limits.get("max_tasks", 100 if plan_name == "free" else 5000)
            },
            "currentUsage": {
                "actors": current_actors_count,
                "schedules": current_schedules_count,
                "tasks": current_tasks_count,
                "running_concurrently": await db.runs.count_documents({
                    "user_id" if workspace_type == "personal" else "organization_id": workspace_id,
                    "status": "running"
                })
            },
            "services": [
                { 
                    "name": 'Actors', 
                    "color": 'bg-green-500', 
                    "amount": actors_total_cost, 
                    "icon": '●',
                    "details": [
                        { "label": "Actor compute units", "value": f"{compute_units_used:.4f} CU", "cost": cu_cost },
                        { "label": "Pay per event", "is_header": True },
                        *actor_run_details[:10] # Top 10 recent runs
                    ]
                },
                { 
                    "name": 'Data transfer', 
                    "color": 'bg-purple-500', 
                    "amount": 0.0, 
                    "icon": '●',
                    "details": [
                        { "label": "Item", "usage": "0.00 GB", "price": "-", "cost": 0.0 }
                    ]
                },
                { 
                    "name": 'Proxy', 
                    "color": 'bg-orange-500', 
                    "amount": 0.0, 
                    "icon": '●',
                    "details": [
                        { "label": "Item", "usage": "0.00 GB", "price": "-", "cost": 0.0 }
                    ]
                },
                { 
                    "name": 'Storage', 
                    "color": 'bg-blue-500', 
                    "amount": storage_total_cost, 
                    "icon": '●',
                    "details": [
                        { "label": "Datasets", "is_header": True },
                        { "label": "Timed storage", "value": f"{(timed_storage_cost / 0.001):.5f} GB-hours", "price": "$0.0010 per GB-hour", "cost": timed_storage_cost },
                        { "label": "Reads", "value": f"{total_items * 2}", "price": "$0.0004 per 1k", "cost": read_ops_cost },
                        { "label": "Writes", "value": f"{total_items}", "price": "$0.0050 per 1k", "cost": write_ops_cost }
                    ]
                }
            ],
            "plan_period": workspace.get("billing_period", "monthly"),
            "expires_at": workspace.get("expires_at") or (datetime.now(timezone.utc) + timedelta(days=28)).isoformat(),
            "plan_name": plan_name,
            "plan": plan_name,
            "account_balance": workspace.get("account_balance", 0.0)
        }

    async def get_proration_discount(self, workspace_id: str, workspace_type: str) -> float:
        """Calculates unused plan value based on the lesser of time remaining or credits remaining."""
        try:
            summary = await self.get_billing_summary(workspace_id, workspace_type)
        except ValueError:
            return 0.0
            
        plan_name = summary.get("plan_name", "Free").lower()
        if plan_name == "free":
            return 0.0
            
        now = datetime.now(timezone.utc)
        expires_at_str = summary.get("expires_at")
        if not expires_at_str:
            return 0.0
            
        if isinstance(expires_at_str, str):
            expires_at = datetime.fromisoformat(expires_at_str.replace("Z", "+00:00"))
            if expires_at.tzinfo is None:
                expires_at = expires_at.replace(tzinfo=timezone.utc)
        else:
            expires_at = expires_at_str
            
        if now >= expires_at:
            return 0.0
            
        plan_period = summary.get("plan_period", "monthly")
        
        # Determine total cycle days based on period
        total_cycle_days = 365.0 if plan_period == "yearly" else 28.0
        
        # 1. Time Remaining Ratio
        delta = expires_at - now
        days_remaining = max(0.0, delta.total_seconds() / 86400.0)
        time_ratio = min(1.0, days_remaining / total_cycle_days)
        
        # 2. Credits Remaining Ratio
        consumption = summary.get("planConsumption", {})
        free_remaining = float(consumption.get("freeRemaining", 0.0))
        free_total = float(consumption.get("freeTotal", 0.0))
        credit_ratio = 1.0
        if free_total > 0:
            credit_ratio = min(1.0, free_remaining / free_total)
            
        # The actual ratio to use is the lesser of the two
        effective_ratio = min(time_ratio, credit_ratio)
        
        # Calculate historical price
        plan_data = self.PLAN_DATA.get(plan_name)
        if not plan_data: return 0.0
        base_price = plan_data.get("price", 0)
        if base_price is None: return 0.0
        
        if plan_period == "yearly":
            historical_price = round(base_price * 0.9) * 12
        else:
            historical_price = base_price
            
        discount = round(historical_price * effective_ratio, 2)
        return float(discount)

    async def get_historical_usage(self, workspace_id: str, workspace_type: str, month: int, year: int):
        """Generates historical usage data for the specified month and year"""
        db = get_db()
        
        # Calculate start and end of the specified month
        try:
            start_date = datetime(year, month, 1, tzinfo=timezone.utc)
            if month == 12:
                end_date = datetime(year + 1, 1, 1, tzinfo=timezone.utc)
            else:
                end_date = datetime(year, month + 1, 1, tzinfo=timezone.utc)
        except ValueError:
            raise ValueError("Invalid month or year")
            
        # Retrieve runs within the period
        query = {
            "user_id" if workspace_type == "personal" else "organization_id": workspace_id,
            "created_at": {"$gte": start_date.isoformat(), "$lt": end_date.isoformat()}
        }
        print(f"DEBUG Billing Query: {query}")
        runsCursor = db.runs.find(query)
        match_count = await db.runs.count_documents(query)
        print(f"DEBUG Billing Match Count: {match_count}")
        
        daily_usage = {}
        actor_usage = {}
        hist_cu_total = 0.0
        hist_storage_timed = 0.0
        total_event_fees = 0.0
        now = datetime.now(timezone.utc)
        
        # We need to estimate storage for this month
        # Since we don't have historical item_count snapshots, we use current datasets
        # and check if they existed during the requested period.
        total_items_in_period = 0
        dataset_cursor = db.datasets.find({
            "user_id" if workspace_type == "personal" else "organization_id": workspace_id,
            "created_at": {"$lt": end_date.isoformat()}
        })
        
        async for ds in dataset_cursor:
            created_at_str = ds.get("created_at")
            if not created_at_str: continue
            ds_created_at = datetime.fromisoformat(created_at_str.replace("Z", "+00:00"))
            if ds_created_at.tzinfo is None: ds_created_at = ds_created_at.replace(tzinfo=timezone.utc)
            
            # Intersection of dataset lifetime and requested month
            period_start = max(ds_created_at, start_date)
            # For current month, end at 'now'. For past months, end at 'end_date'.
            period_boundary = now if (month == now.month and year == now.year) else end_date
            period_end = min(period_boundary, now) # Cannot exceed current time
            
            if period_start < period_end:
                items = ds.get("item_count", 0)
                total_items_in_period += items
                hours_in_period = (period_end - period_start).total_seconds() / 3600
                ds_size_gb = (items * 0.5) / (1024 * 1024)
                
                # Accumulate actual cost during the loop for parity with get_billing_summary
                cost = ds_size_gb * hours_in_period * 0.0010
                hist_storage_timed += cost
                
        # Define current period boundary for reconstructing missing run durations
        period_boundary = now if (month == now.month and year == now.year) else end_date
        
        daily_usage = {}
        
        # Pre-fill daily_usage with all days of the month to 0
        current_date = start_date
        while current_date < end_date:
            day_str = current_date.strftime("%Y-%m-%d")
            daily_usage[day_str] = {
                "date": day_str,
                "formattedDate": current_date.strftime("%b %d"),
                "Actor compute units": 0.0,
                "Actors - paid for events": 0.0,
                "Dataset timed storage": 0.0,
                "Dataset reads": 0.0,
                "Dataset writes": 0.0,
                "Proxy SERPs": 0.0,
                "Proxy residential data transfer": 0.0,
                "Data transfer internal": 0.0,
                "Data transfer external": 0.0,
                "total_usage": 0.0
            }
            if current_date.month == 12 and current_date.day == 31:
                break
            # Add one day
            try:
                current_date = current_date.replace(day=current_date.day + 1)
            except ValueError:
                if current_date.month == 12:
                    current_date = current_date.replace(year=current_date.year + 1, month=1, day=1)
                else:
                    current_date = current_date.replace(month=current_date.month + 1, day=1)

        # 1. Aggregate Terminated Runs by Day
        daily_pipeline = [
            {"$match": query},
            {"$group": {
                "_id": { "$substr": ["$created_at", 0, 10] },
                "cu_cost": {"$sum": { "$multiply": ["$compute_units_used", 0.50] }},
                "event_cost": {"$sum": "$event_cost"},
                "cu_used": {"$sum": "$compute_units_used"},
                "run_count": {"$sum": 1}
            }}
        ]
        
        daily_terminated = await db.runs.aggregate(daily_pipeline).to_list(length=None)
        
        # 2. Aggregate Terminated Runs by Actor
        actor_pipeline = [
            {"$match": query},
            {"$group": {
                "_id": "$actor_id",
                "actor_name": {"$first": "$actor_name"},
                "actor_icon": {"$first": "$actor_icon"},
                "event_cost": {"$sum": "$event_cost"},
                "total_runs": {"$sum": 1}
            }}
        ]
        
        actor_terminated = await db.runs.aggregate(actor_pipeline).to_list(length=None)

        # Consistent zeroing of proxy/data for historical parity
        total_proxy_cost = 0.0
        total_data_cost = 0.0
        
        # Calculate consistency metrics
        total_runs_count = await db.runs.count_documents(query)
        hist_storage_writes = (total_items_in_period / 1000) * 0.005
        hist_storage_reads = (total_items_in_period * 2 / 1000) * 0.0004
        hist_storage_total = hist_storage_timed + hist_storage_writes + hist_storage_reads
        
        per_run_reads = hist_storage_reads / max(1, total_runs_count)
        per_run_writes = hist_storage_writes / max(1, total_runs_count)
        
        hist_cu_total = 0.0
        total_event_fees = 0.0
        
        # Populate daily_usage from aggregation results
        for day_data in daily_terminated:
            day_str = day_data["_id"]
            if day_str in daily_usage:
                cu_cost = day_data["cu_cost"]
                start_fee = day_data["event_cost"]
                run_count = day_data["run_count"]
                
                daily_usage[day_str]["Actor compute units"] = float(cu_cost)
                daily_usage[day_str]["Actors - paid for events"] = float(start_fee)
                
                # Distribute storage items for THIS day's runs
                day_reads = per_run_reads * run_count
                day_writes = per_run_writes * run_count
                daily_usage[day_str]["Dataset reads"] = float(day_reads)
                daily_usage[day_str]["Dataset writes"] = float(day_writes)
                
                daily_usage[day_str]["total_usage"] = float(cu_cost + start_fee + day_reads + day_writes)
                
                hist_cu_total += day_data["cu_used"]
                total_event_fees += start_fee

        # Populate actor_usage from aggregation results
        for actor_data in actor_terminated:
            actor_id = actor_data["_id"]
            raw_actor_name = actor_data["actor_name"] or "Unknown Actor"
            display_actor_name = f"scrapi/{raw_actor_name}"
            
            actor_usage[display_actor_name] = {
                "actor_name": display_actor_name,
                "actor_id": actor_id,
                "actor_icon": actor_data.get("actor_icon"),
                "total_usage": float(actor_data["event_cost"]),
                "units": actor_data["total_runs"]
            }

        # Distribute timed storage evenly
        if daily_usage:
            timed_share = hist_storage_timed / len(daily_usage)
            for day in daily_usage:
                daily_usage[day]["Dataset timed storage"] = timed_share
                daily_usage[day]["total_usage"] += timed_share

        # Final Calculation for Parity
        total_event_cost = total_event_fees
        total_cu_cost = hist_cu_total * 0.50
        
        # Grand total summation (Matches get_billing_summary logic)
        total_actors_total = total_event_cost + total_cu_cost
        grand_total = float(total_actors_total + hist_storage_total + total_proxy_cost + total_data_cost)

        return {
            "daily_usage": list(daily_usage.values()),
            "actor_usage": list(actor_usage.values()),
            "compute_units_cost": float(total_cu_cost),
            "storage_usage": {
                "timed_storage": float(hist_storage_timed),
                "reads": float(hist_storage_reads),
                "writes": float(hist_storage_writes),
                "total": float(hist_storage_total)
            },
            "total_cost": grand_total,
            "period": { "month": month, "year": year }
        }

    async def is_usage_limit_reached(self, workspace_id: str, workspace_type: str) -> bool:
        """Check if current usage exceeds plan credits to block new runs"""
        summary = await self.get_billing_summary(workspace_id, workspace_type)
        consumption = summary.get("planConsumption", {})
        free_remaining = float(consumption.get("freeRemaining", 0.0))
        
        # If no credits left and it's a paid plan that isn't overage-enabled
        return free_remaining <= 0

    def calculate_compute_units(self, duration_seconds: int, ram_mb: int) -> float:
        """
        Calculates compute units based on Scrapi formula:
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
            
        duration = run.get("duration_seconds") or 0
        started_at = parse_datetime_safe(run.get("started_at"))
        finished_at = parse_datetime_safe(run.get("finished_at"))
        
        if not duration and started_at and finished_at:
            duration = int((finished_at - started_at).total_seconds())
        
        ram_mb = run.get("ram_mb", 1024)
        status = run.get("status", "succeeded")
        
        cu_used = self.calculate_compute_units(duration, ram_mb)
        cu_cost = cu_used * 0.50  # 1 CU = $0.50
        
        # Actor Start fee: $0.008 (standard), $0.004 (aborted), $0.0 (failed)
        if status == "failed":
            event_fee = 0.0
        elif status == "aborted":
            event_fee = 0.004
        else:
            event_fee = 0.008
        total_cost = cu_cost + event_fee
        
        # update run
        await db.runs.update_one(
            {"id": run_id}, 
            {
                "$set": {
                    "compute_units_used": cu_used, 
                    "cost": total_cost, 
                    "duration_seconds": duration,
                    "event_cost": event_fee
                }
            }
        )

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

    # ── PayPal Integration ───────────────────────────────────────────────────

    async def get_paypal_access_token(self):
        """Retrieves an OAuth2 access token from PayPal"""
        import httpx
        client_id = os.getenv("PAYPAL_CLIENT_ID", "fake_client_id")
        secret = os.getenv("PAYPAL_CLIENT_SECRET", "fake_secret")
        mode = os.getenv("PAYPAL_MODE", "sandbox")
        
        base_url = "https://api-m.sandbox.paypal.com" if mode == "sandbox" else "https://api-m.paypal.com"
        
        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/v1/oauth2/token",
                auth=(client_id, secret),
                data={"grant_type": "client_credentials"}
            )
            response.raise_for_status()
            return response.json()["access_token"]

    async def get_plans_data(self):
        """Returns the master plan and addon configuration"""
        return {
            "plans": self.PLAN_DATA,
            "addons": self.ADDON_DATA
        }

    async def create_paypal_order(self, amount: float, currency: str = "USD"):
        """Creates a PayPal order and returns the approval link"""
        import httpx
        token = await self.get_paypal_access_token()
        mode = os.getenv("PAYPAL_MODE", "sandbox")
        base_url = "https://api-m.sandbox.paypal.com" if mode == "sandbox" else "https://api-m.paypal.com"
        
        frontend_url = os.getenv("FRONTEND_URL", "http://localhost:3000")

        payload = {
            "intent": "CAPTURE",
            "purchase_units": [
                {
                    "amount": {
                        "currency_code": currency,
                        "value": f"{amount:.2f}"
                    },
                    "description": "Scrapi Subscription Upgrade"
                }
            ],
            "application_context": {
                "return_url": f"{frontend_url}/payment-success?provider=paypal",
                "cancel_url": f"{frontend_url}/upgrade-checkout",
                "brand_name": "Scrapi",
                "user_action": "PAY_NOW"
            }
        }

        async with httpx.AsyncClient() as client:
            response = await client.post(
                f"{base_url}/v2/checkout/orders",
                headers={
                    "Authorization": f"Bearer {token}",
                    "Content-Type": "application/json"
                },
                json=payload
            )
            response.raise_for_status()
            data = response.json()
            
            # Find the approval link
            approval_link = next(link["href"] for link in data["links"] if link["rel"] == "approve")
            return {
                "order_id": data["id"],
                "approval_url": approval_link
            }

    async def capture_paypal_order(
        self, 
        order_id: str, 
        user_id: str, 
        workspace_id: str, 
        workspace_type: str, 
        plan_data: dict,
        billing_details: dict = None
    ):
        """Captures the payment for a given PayPal order ID and updates the subscription in DB"""
        import httpx
        token = await self.get_paypal_access_token()
        mode = os.getenv("PAYPAL_MODE", "sandbox")
        base_url = "https://api-m.sandbox.paypal.com" if mode == "sandbox" else "https://api-m.paypal.com"
        
        import logging
        logger = logging.getLogger(__name__)
        
        async with httpx.AsyncClient() as client:
            auth_header = {"Authorization": f"Bearer {token}", "Content-Type": "application/json"}

            # ── Pre-flight: check the order status before capturing ──────────────────
            # This is the industry-standard approach to make captures idempotent.
            # It prevents 422 errors from double-captures (React StrictMode, page refresh).
            order_check_resp = await client.get(
                f"{base_url}/v2/checkout/orders/{order_id}",
                headers={"Authorization": f"Bearer {token}"}
            )
            if order_check_resp.status_code == 200:
                order_status = order_check_resp.json().get("status", "")
                logger.info(f"PayPal order {order_id} pre-check status: {order_status}")

                if order_status == "COMPLETED":
                    # The order was already captured (e.g. double-fire from StrictMode / refresh)
                    db = get_db()
                    existing_invoice = await db.invoices.find_one({"paypal_order_id": order_id})
                    if existing_invoice:
                        logger.info(f"Existing invoice found for {order_id}. Returning COMPLETED.")
                        return {"status": "COMPLETED", "already_captured": True}
                    # Invoice missing but PayPal says COMPLETED — fall through to create invoice
                    logger.warning(f"Order {order_id} is COMPLETED in PayPal but invoice missing in DB — re-creating.")
                    capture_data = order_check_resp.json()
                elif order_status not in ("APPROVED",):
                    raise ValueError(
                        f"Cannot capture PayPal order {order_id}: status is '{order_status}'. "
                        f"The order may have expired or been cancelled. Please start a new checkout."
                    )
                else:
                    # Status is APPROVED — proceed with capture
                    response = await client.post(
                        f"{base_url}/v2/checkout/orders/{order_id}/capture",
                        headers=auth_header
                    )
                    if response.status_code == 422:
                        error_body = {}
                        try: error_body = response.json()
                        except Exception: pass
                        issue = ""
                        try: issue = error_body.get("details", [{}])[0].get("issue", "")
                        except Exception: pass
                        logger.warning(f"PayPal 422 for {order_id}. issue='{issue}' body={error_body}")

                        if issue in ("ORDER_ALREADY_CAPTURED", ""):
                            db = get_db()
                            existing_invoice = await db.invoices.find_one({"paypal_order_id": order_id})
                            if existing_invoice:
                                return {"status": "COMPLETED", "already_captured": True}

                        if issue == "INSTRUMENT_DECLINED":
                            # Extract the PayPal retry URL so the frontend can redirect the user back
                            retry_url = None
                            try:
                                for link in error_body.get("links", []):
                                    if link.get("rel") == "redirect":
                                        retry_url = link.get("href")
                                        break
                            except Exception:
                                pass
                            raise ValueError(f"INSTRUMENT_DECLINED|{retry_url or ''}")

                        error_msg = error_body.get("message") or issue or "PayPal rejected this capture"
                        raise ValueError(f"PayPal capture rejected: {error_msg}")

                    response.raise_for_status()
                    capture_data = response.json()
            else:
                # Could not check pre-flight — attempt capture directly
                logger.warning(f"Pre-flight check failed ({order_check_resp.status_code}), attempting capture directly.")
                response = await client.post(
                    f"{base_url}/v2/checkout/orders/{order_id}/capture",
                    headers=auth_header
                )
                response.raise_for_status()
                capture_data = response.json()

            logger.info(f"PayPal capture result for {order_id}: status={capture_data.get('status')}")
            
            # If successful capture, update the database
            if capture_data.get("status") == "COMPLETED":
                db = get_db()
                purchase_units = capture_data.get("purchase_units", [])
                if not purchase_units:
                    logger.error("No purchase units in capture data")
                    raise ValueError("Incomplete capture data from PayPal")
                
                # Generate a unique invoice number
                import uuid
                invoice_no = f"INV-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
                
                # Calculate amount (resilient extraction — both fresh capture and GET-order shapes)
                try:
                    purchase_unit = purchase_units[0]
                    # Try capture payments first (standard capture response)
                    captures = purchase_unit.get("payments", {}).get("captures", [])
                    if captures:
                        amount_val = captures[0].get("amount", {}).get("value", "0")
                    else:
                        # Fallback: use the purchase unit amount directly
                        amount_val = purchase_unit.get("amount", {}).get("value", "0")
                    amount = float(amount_val)
                except (IndexError, KeyError, TypeError, ValueError) as e:
                    logger.error(f"Failed to extract amount from PayPal response: {e}. Data: {capture_data}")
                    amount = 0.0  # Safe fallback
                tax_rate = 0.0
                subtotal = amount
                tax_amount = 0.0

                # ── Save/Update billing details if provided (persist for future) ──
                if billing_details:
                    # Normalize keys to match DB schema (camelCase -> snake_case)
                    payload = {
                        "full_name": billing_details.get("fullName"),
                        "company": billing_details.get("company"),
                        "tax_id": billing_details.get("taxId"),
                        "registration_no": billing_details.get("registrationNo"),
                        "billing_contact": billing_details.get("billingContact"),
                        "street_address": billing_details.get("streetAddress"),
                        "city": billing_details.get("city"),
                        "postal_code": billing_details.get("postalCode"),
                        "country": billing_details.get("country"),
                        "billing_email": billing_details.get("billingEmail"),
                        "custom_address_text": billing_details.get("customAddressText"),
                        "custom_goods_text": billing_details.get("customGoodsText"),
                        "user_id": user_id,
                        "workspace_id": workspace_id,
                        "workspace_type": workspace_type,
                        "updated_at": datetime.now(timezone.utc)
                    }
                    payload = {k: v for k, v in payload.items() if v is not None}
                    match_filter = {"user_id": user_id, "workspace_id": workspace_id, "workspace_type": workspace_type}
                    await db.billing_details.update_one(match_filter, {"$set": payload}, upsert=True)
                    bd = payload
                else:
                    # Fetch saved billing details (pre-existing)
                    billing_details_doc = await db.billing_details.find_one(
                        {"user_id": user_id, "workspace_id": workspace_id, "workspace_type": workspace_type},
                        {"_id": 0, "user_id": 0, "updated_at": 0}
                    )
                    if not billing_details_doc:
                        billing_details_doc = await db.billing_details.find_one(
                            {"user_id": user_id},
                            {"_id": 0, "user_id": 0, "updated_at": 0}
                        )
                    bd = billing_details_doc or {}

                # ── Extract PayPal payer info from capture response (always available) ──
                payer = capture_data.get("payer", {})
                payer_name = payer.get("name", {})
                payer_given = payer_name.get("given_name", "")
                payer_surname = payer_name.get("surname", "")
                payer_full_name = f"{payer_given} {payer_surname}".strip() or None
                payer_email = payer.get("email_address") or None
                payer_address = payer.get("address", {})
                payer_country = payer_address.get("country_code") or None

                # Retrieve user's account email for the invoice document
                user_doc = await db.users.find_one({"id": user_id}, {"email": 1})
                account_email = (user_doc or {}).get("email")

                # Use manual billing data first; fallback to Scrapi account email, then PayPal payer info
                invoice_billing_name = bd.get("full_name") or payer_full_name
                invoice_billing_email = bd.get("billing_email") or account_email or payer_email
                invoice_billing_country = bd.get("country") or payer_country

                # Calculate total addon cost
                total_addon_cost = 0.0
                is_annual = plan_data.get("is_annual")
                invoice_addons = plan_data.get("addons", {})
                for aid, qty in invoice_addons.items():
                    if aid in self.ADDON_DATA:
                        price = self.ADDON_DATA[aid]["price"]
                        total_addon_cost += qty * price

                # Extract proration discount and account balance used
                proration_discount = float(plan_data.get("proration_discount", 0.0))
                account_balance_used = float(plan_data.get("account_balance_used", 0.0))
                total_available_credit = proration_discount + account_balance_used

                plan_price_monthly = self.PLAN_PRICES.get(plan_data.get("plan", "free"), 0.0)
                base_plan_cost = plan_price_monthly * 12 * 0.9 if is_annual else plan_price_monthly
                total_expected_cost = base_plan_cost + total_addon_cost
                
                # Check for proration overflow to credit to account_balance
                overflow = max(0.0, total_available_credit - total_expected_cost)
                
                collection = db.organizations if workspace_type == "organization" else db.users
                if overflow > 0:
                    # If we overpaid somehow, set balance to the overflow
                    await collection.update_one(
                        {"id": workspace_id},
                        {"$set": {"account_balance": overflow}}
                    )
                elif account_balance_used > 0:
                    # If we used balance and didn't overflow, the balance is now zero
                    await collection.update_one(
                        {"id": workspace_id},
                        {"$set": {"account_balance": 0.0}}
                    )

                # Subtotal is always the true base cost of the plan
                subtotal = base_plan_cost
                tax_amount = 0.0

                invoice_payload = {
                    "invoice_no": invoice_no,
                    "user_id": user_id,
                    "account_email": account_email,
                    "workspace_id": workspace_id,
                    "workspace_type": workspace_type,
                    "plan": plan_data.get("plan"),
                    "is_annual": plan_data.get("is_annual"),
                    "amount": amount,
                    "subtotal": subtotal,
                    "tax_amount": tax_amount,
                    "currency": "USD",
                    "status": "paid",
                    "payment_method": "paypal",
                    "paypal_order_id": order_id,
                    "created_at": datetime.now(timezone.utc),
                    "addons": invoice_addons,
                    "total_addon_cost": total_addon_cost,
                    "proration_discount": proration_discount,
                    "account_balance_used": account_balance_used,
                    "overflow_credited": overflow,
                    # Billing details (manual entry takes priority; PayPal payer info as fallback)
                    "billing_full_name": invoice_billing_name,
                    "billing_company": bd.get("company"),
                    "billing_tax_id": bd.get("tax_id"),
                    "billing_registration_no": bd.get("registration_no"),
                    "billing_contact": bd.get("billing_contact"),
                    "billing_street_address": bd.get("street_address"),
                    "billing_city": bd.get("city"),
                    "billing_postal_code": bd.get("postal_code"),
                    "billing_country": invoice_billing_country,
                    "billing_email": invoice_billing_email,
                    "billing_custom_address_text": bd.get("custom_address_text"),
                    "billing_custom_goods_text": bd.get("custom_goods_text"),
                    # PayPal payer info stored separately for reference
                    "paypal_payer_name": payer_full_name,
                    "paypal_payer_email": payer_email,
                    "paypal_payer_country": payer_country,
                }
                
                await db.invoices.insert_one(invoice_payload)

                # ── Generate & Send payment confirmation email (Mocking now handled by EmailService) ──
                try:
                    from services.email_service import get_email_service
                    email_svc = get_email_service()

                    # Generate professional PDF attachment
                    try:
                        pdf_content = await self.generate_invoice_pdf(invoice_payload)
                    except Exception as pdf_err:
                        logger.error(f"PDF attachment generation failed: {pdf_err}")
                        pdf_content = None

                    # Retrieve user's account email
                    user_doc = await db.users.find_one({"id": user_id}, {"email": 1})
                    user_email = (user_doc or {}).get("email")
                    billing_email_addr = bd.get("billing_email")
                    
                    org_billing_email = None
                    if workspace_type == "organization":
                        org_doc = await db.organizations.find_one({"id": workspace_id}, {"billing_email": 1})
                        org_billing_email = (org_doc or {}).get("billing_email")

                    # Collect unique, valid recipients (purchaser account email + provided billing email + org billing email)
                    recipients = list({e for e in [user_email, billing_email_addr, org_billing_email] if e})
                    if not recipients:
                         logger.warning(f"No recipeints found for invoice {invoice_no}, cannot send email.")

                    billing_cycle_label = "Annual" if plan_data.get("is_annual") else "Monthly"
                    issued_str = datetime.now(timezone.utc).strftime("%B %d, %Y")
                    
                    invoice_id_str = str(invoice_payload.get("_id", ""))

                    await email_svc.send_payment_confirmation(
                        to_emails=recipients,
                        invoice_no=invoice_no,
                        invoice_id=invoice_id_str,
                        plan=plan_data.get("plan", ""),
                        billing_cycle=billing_cycle_label,
                        amount=amount,
                        subtotal=subtotal,
                        tax_amount=tax_amount,
                        payment_method="paypal",
                        issued_date=issued_str,
                        billing_name=bd.get("full_name") or bd.get("company"),
                        proration_discount=proration_discount,
                        account_balance_used=account_balance_used,
                        total_addon_cost=total_addon_cost,
                        overflow_credited=overflow,
                        pdf_content=pdf_content,
                        invoice_filename=f"invoice_{invoice_no}.pdf"
                    )
                except Exception as email_err:
                    # Never block the capture flow due to email failure
                    logger.error(f"Payment email failed: {email_err}")
                
                subscription_payload = {
                    "user_id": user_id,
                    "workspace_id": workspace_id,
                    "workspace_type": workspace_type,
                    "plan": plan_data.get("plan"),
                    "is_annual": plan_data.get("is_annual"),
                    "payment_method": "paypal",
                    "paypal_order_id": order_id,
                    "confirmed_at": datetime.now(timezone.utc)
                }
                match_filter = {"user_id": user_id, "workspace_id": workspace_id, "workspace_type": workspace_type}
                await db.billing_subscriptions.update_one(match_filter, {"$set": subscription_payload}, upsert=True)
                
                # ── Update Workspace Plan, Credits, and Limits ──
                plan_name_lower = str(plan_data.get("plan", "free")).lower()
                
                # Base limits per plan
                base_limits = {
                    "free": {"max_concurrent_runs": 1, "max_ram_gb": 8, "max_actor_build_mins": 10, "data_retention_days": 7, "max_schedules": 0},
                    "starter": {"max_concurrent_runs": 10, "max_ram_gb": 32, "max_actor_build_mins": 30, "data_retention_days": 30, "max_schedules": 5},
                    "growth": {"max_concurrent_runs": 50, "max_ram_gb": 64, "max_actor_build_mins": 60, "data_retention_days": 90, "max_schedules": 25},
                    "scale": {"max_concurrent_runs": 200, "max_ram_gb": 128, "max_actor_build_mins": 120, "data_retention_days": 180, "max_schedules": 9999},
                    "enterprise": {"max_concurrent_runs": 9999, "max_ram_gb": 9999, "max_actor_build_mins": 240, "data_retention_days": 365, "max_schedules": 9999}
                }
                
                # Base platform credits per plan
                base_credits = {
                    "free": 5.0,
                    "starter": 29.0,
                    "growth": 99.0,
                    "scale": 299.0,
                    "enterprise": 999.0
                }
                
                ws_limits = base_limits.get(plan_name_lower, base_limits["free"]).copy()
                is_annual = plan_data.get("is_annual", False)
                
                # Base platform credits per plan (monthly allotment)
                base_monthly_credits = {
                    "free": 5.0,
                    "starter": 29.0,
                    "growth": 99.0,
                    "scale": 299.0,
                    "enterprise": 999.0
                }
                
                monthly_credits = base_monthly_credits.get(plan_name_lower, 5.0)
                # Credits map exactly to a rolling 30-day window, regardless of annual/monthly
                ws_credits = float(monthly_credits + 5.0)
                
                # Process Addons
                for aid, qty in invoice_addons.items():
                    if aid == "concurrent_runs":
                        ws_limits["max_concurrent_runs"] += qty
                    elif aid == "actor_memory":
                        ws_limits["max_ram_gb"] += qty
                    
                    # Addons affect limits (concurrent runs, memory), not platform credits
                    # Credits are derived solely from the base plan selection
                    pass
                
                # Process Promo Code / Attached Offers
                promo_code = plan_data.get("promo_code")
                if promo_code:
                    promo_code = promo_code.strip().upper()
                    affiliate = await db.affiliate_links.find_one({"code": promo_code})
                    if affiliate:
                        # Validate expiry
                        expiry = affiliate.get("expiry_date")
                        if expiry:
                            try:
                                if datetime.now(timezone.utc) > datetime.fromisoformat(expiry):
                                    logger.warning(f"Promo code {promo_code} is expired. Skipping.")
                                    affiliate = None 
                            except ValueError:
                                pass
                                
                        # Validate applicable plans
                        allowed_plans = affiliate.get("applicable_plans", []) if affiliate else []
                        if affiliate and allowed_plans and len(allowed_plans) > 0:
                            target_plan = plan_data.get("plan", "").lower()
                            if target_plan not in [p.lower() for p in allowed_plans]:
                                logger.warning(f"Promo code {promo_code} is not applicable for plan {target_plan}. Skipping.")
                                affiliate = None
                                
                    if affiliate:
                        # Inject attached offers directly into workspace limits & credits
                        for offer in affiliate.get("attached_offers", []):
                            offer_type = offer.get("type")
                            offer_id = offer.get("id")
                            qty = offer.get("qty", 0)
                            
                            if offer_type == "limit":
                                if offer_id in ws_limits:
                                    ws_limits[offer_id] += qty
                                else:
                                    ws_limits[offer_id] = qty
                            elif offer_type == "addon":
                                if offer_id == "concurrent_runs":
                                    ws_limits["max_concurrent_runs"] += qty
                                elif offer_id == "actor_memory":
                                    ws_limits["max_ram_gb"] += qty
                                elif offer_id == "platform_credits":
                                    ws_credits += qty
                                    
                        # Track conversions on affiliate link
                        await db.affiliate_links.update_one(
                            {"code": promo_code},
                            {"$inc": {"conversions": 1}}
                        )
                        
                        # Generate referral receipt for accrual payouts
                        comm_rate = affiliate.get("commission_rate", 0)
                        referral_doc = {
                            "referral_code": promo_code,
                            "referred_user_id": user_id,
                            "referred_workspace_id": workspace_id,
                            "owner_user_id": affiliate.get("owner_user_id"),
                            "commission_rate": comm_rate,
                            "commission_earned": round(amount * comm_rate, 2),
                            "paypal_order_id": order_id,
                            "created_at": datetime.now(timezone.utc).isoformat(),
                            "active_until": (datetime.now(timezone.utc) + timedelta(days=365)).isoformat() # Scrapi Lifetime tracking simplified to 1yr active
                        }
                        await db.referral_tracking.insert_one(referral_doc)
                
                # Calculate expiration date
                now = datetime.now(timezone.utc)
                if is_annual:
                    expires_at = now + timedelta(days=365)
                else:
                    expires_at = now + timedelta(days=28)
                
                update_ws_payload = {
                    "plan": plan_data.get("plan"),
                    "platform_credits": ws_credits,
                    "limits": ws_limits,
                    "expires_at": expires_at.isoformat() if isinstance(expires_at, datetime) else expires_at,
                    "billing_period": "yearly" if is_annual else "monthly",
                    "expiry_reminder_sent": {"5d": False, "2d": False, "0d": False}
                }
                
                if workspace_type == "organization":
                    await db.organizations.update_one({"id": workspace_id}, {"$set": update_ws_payload})
                else:
                    await db.users.update_one({"id": workspace_id}, {"$set": update_ws_payload})

                
                # Add Scrapi-specific IDs and full transaction data to the response for the frontend
                capture_data["invoice_id"] = str(invoice_payload.get("_id", ""))
                capture_data["invoice_no"] = invoice_no
                capture_data["amount"] = amount
                capture_data["subtotal"] = subtotal
                capture_data["payment_method"] = "paypal"
                capture_data["tax_amount"] = tax_amount
                capture_data["plan"] = plan_data.get("plan")
                capture_data["is_annual"] = plan_data.get("is_annual")
                capture_data["addons"] = invoice_addons
                capture_data["account_email"] = account_email
                capture_data["paypal_order_id"] = order_id
                capture_data["workspace_name"] = bd.get("company") or bd.get("full_name") or payer_full_name
                capture_data["proration_discount"] = proration_discount
                capture_data["account_balance_used"] = account_balance_used
                capture_data["overflow_credited"] = overflow
                
            return capture_data

    async def generate_invoice_pdf(self, invoice: dict) -> bytes:
        """Generates a professional PDF version of the invoice using fpdf2"""
        from fpdf import FPDF
        import io

        pdf = FPDF()
        pdf.add_page()
        pdf.set_auto_page_break(auto=True, margin=15)

        # ─── Colors and Assets ───────────────────────────
        # Scrapi Blue: #2563eb (37, 99, 235)
        # Dark Text: #0f172a (15, 23, 42)
        # Muted Text: #64748b (100, 116, 139)
        
        # ─── Header ─────────────────────────────────────
        # Brand Logo
        logo_path = os.path.join(os.path.dirname(__file__), "..", "assets", "logo.png")
        if os.path.exists(logo_path):
            pdf.image(logo_path, 10, 10, 12, 12)
        else:
            pdf.set_fill_color(37, 99, 235)
            pdf.rect(10, 10, 12, 12, 'F')
            pdf.set_text_color(255, 255, 255)
            pdf.set_font('helvetica', 'B', 10)
            pdf.text(14, 18.2, 'S')
        
        # Brand Name
        pdf.set_text_color(15, 23, 42)
        pdf.set_font('helvetica', 'B', 16)
        pdf.text(25, 17, 'Scrapi')
        pdf.set_text_color(100, 116, 139)
        pdf.set_font('helvetica', 'B', 8)
        pdf.text(25, 21, 'CONSOLE')

        # Invoice label
        pdf.set_text_color(15, 23, 42)
        pdf.set_font('helvetica', 'B', 24)
        pdf.cell(0, 12, 'INVOICE', ln=True, align='R')
        pdf.set_font('helvetica', '', 10)
        pdf.cell(0, 5, f"#{invoice.get('invoice_no')}", ln=True, align='R')
        pdf.ln(10)

        # ─── From / To ──────────────────────────────────
        from_lines = [
            'Scrapi Technologies Pvt. Ltd.',
            'Chennai, Tamil Nadu',
            'India - 600001',
            'billing@scrapi.io'
        ]

        # Prepare To lines (Manual Billing + Account Email)
        to_lines = []
        billed_name = invoice.get('billing_full_name')
        if billed_name:
            to_lines.append(billed_name)
            if invoice.get('billing_company'): to_lines.append(invoice.get('billing_company'))
            if invoice.get('billing_street_address'): to_lines.append(invoice.get('billing_street_address'))
            city_zip = f"{invoice.get('billing_city', '')} {invoice.get('billing_postal_code', '')}".strip()
            if city_zip: to_lines.append(city_zip)
            if invoice.get('billing_country'): to_lines.append(invoice.get('billing_country'))
        
        acc_email = invoice.get('account_email')
        bill_email = invoice.get('billing_email')
        if acc_email:
            to_lines.append(f"Account: {acc_email}")
        if bill_email and bill_email != acc_email and bill_email != invoice.get('paypal_payer_email'):
             to_lines.append(f"Contact: {bill_email}")
        
        # Add custom billing fields to "BILLED TO"
        if invoice.get('billing_tax_id'): to_lines.append(f"Tax ID: {invoice['billing_tax_id']}")
        if invoice.get('billing_registration_no'): to_lines.append(f"Reg No: {invoice['billing_registration_no']}")
        if invoice.get('billing_custom_address_text'): to_lines.append(invoice['billing_custom_address_text'])
        
        if not to_lines: to_lines = ["Valued Customer"]

        # Prepare Payment Source lines (Secondary/Reference)
        pp_lines = []
        payment_method = invoice.get("payment_method", "paypal")
        if payment_method == "paypal":
            if invoice.get('paypal_payer_name'):
                 pp_lines.append(f"Payer: {invoice.get('paypal_payer_name')}")
                 if invoice.get('paypal_payer_email') and invoice.get('paypal_payer_email') != acc_email:
                     pp_lines.append(invoice.get('paypal_payer_email'))
                 if invoice.get('paypal_payer_country'):
                     pp_lines.append(f"Country: {invoice.get('paypal_payer_country')}")
        elif payment_method == "credit_balance":
            pp_lines.append("Source: Account Credits")
            pp_lines.append(f"Workspace: {invoice.get('workspace_id', 'Unknown')}")
            pp_lines.append("Type: Internal Transfer")

        # Draw Headers
        pdf.set_font('helvetica', 'B', 10)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(95, 7, 'FROM', ln=False)
        pdf.cell(95, 7, 'BILLED TO', ln=True)

        # Draw Content
        pdf.set_font('helvetica', '', 9)
        pdf.set_text_color(71, 85, 105)
        
        all_right_lines = to_lines + ([""] if to_lines and pp_lines else []) + pp_lines
        max_lines = max(len(from_lines), len(all_right_lines))
        for i in range(max_lines):
            left = from_lines[i] if i < len(from_lines) else ''
            right = all_right_lines[i] if i < len(all_right_lines) else ''
            pdf.cell(95, 5, left, ln=False)
            pdf.cell(95, 5, right, ln=True)
        
        pdf.ln(10)

        # ─── Order Information ──────────────────────────
        pdf.set_fill_color(248, 250, 252)
        pdf.set_draw_color(226, 232, 240)
        pdf.rect(10, pdf.get_y(), 190, 32, 'FD') # Increased height for more fields
        
        pdf.set_font('helvetica', 'B', 8)
        pdf.set_text_color(100, 116, 139)
        pdf.cell(47.5, 9, ' ISSUED DATE', align='L')
        pdf.cell(47.5, 9, 'PAYMENT METHOD', align='L')
        pdf.cell(47.5, 9, 'STATUS', align='L')
        
        # Dynamic Transaction ID Header
        if payment_method == "paypal":
            trans_label = 'PAYPAL TRANS ID'
        elif payment_method == "credit_balance":
            trans_label = 'INTERNAL REF ID'
        else:
            trans_label = 'TRANSACTION ID'
            
        pdf.cell(47.5, 9, trans_label, ln=True, align='L')
        
        pdf.set_font('helvetica', 'B', 9)
        pdf.set_text_color(15, 23, 42)
        
        issued_date = invoice.get('created_at')
        if issued_date:
            if isinstance(issued_date, str): issued_str = issued_date[:10]
            else: issued_str = issued_date.strftime('%Y-%m-%d')
        else: issued_str = datetime.now().strftime('%Y-%m-%d')
            
        pdf.cell(47.5, 7, f" {issued_str}", align='L')
        pdf.cell(47.5, 7, payment_method.replace('_', ' ').upper(), align='L')
        pdf.set_text_color(5, 150, 105) # Green for paid
        pdf.cell(47.5, 7, invoice.get('status', 'PAID').upper(), align='L')
        pdf.set_text_color(15, 23, 42)
        pdf.set_font('helvetica', 'B', 8)
        
        # Dynamic Transaction ID Value
        if payment_method == "paypal":
            trans_value = str(invoice.get('paypal_order_id') or invoice.get('paypal_payer_id') or 'N/A')
        elif payment_method == "credit_balance":
            trans_value = f"INT-{str(invoice.get('_id', ''))[:8].upper()}"
        else:
            trans_value = "N/A"
            
        pdf.cell(47.5, 7, trans_value, ln=True, align='L')
        
        # New row for Workspace/Account info
        pdf.ln(2)
        pdf.set_font('helvetica', 'B', 8)
        pdf.set_text_color(100, 116, 139)
        pdf.cell(95, 6, ' WORKSPACE ID', align='L')
        pdf.cell(95, 6, 'ACCOUNT EMAIL', ln=True, align='L')
        
        pdf.set_font('helvetica', '', 8)
        pdf.set_text_color(15, 23, 42)
        pdf.cell(95, 5, f" {invoice.get('workspace_id', 'N/A')}", align='L')
        pdf.cell(95, 5, f"{invoice.get('account_email', 'N/A')}", ln=True, align='L')
        
        pdf.ln(12)

        # ─── Table ──────────────────────────────────────
        pdf.set_fill_color(15, 23, 42)
        pdf.set_text_color(255, 255, 255)
        pdf.set_font('helvetica', 'B', 10)
        
        pdf.cell(110, 10, '  SERVICE DESCRIPTION', fill=True)
        pdf.cell(40, 10, 'PLAN', fill=True, align='C')
        pdf.cell(40, 10, 'AMOUNT', ln=True, fill=True, align='R')
        
        pdf.set_text_color(15, 23, 42)
        pdf.set_font('helvetica', '', 10)
        
        plan_name = invoice.get('plan', 'Starter').capitalize()
        cycle = 'Annual' if invoice.get('is_annual') else 'Monthly'
        pdf.cell(110, 12, f"  Scrapi {plan_name} Subscription ({cycle})", border='B')
        pdf.cell(40, 12, f"{plan_name}", border='B', align='C')
        pdf.cell(40, 12, f"${invoice.get('subtotal', 0):.2f}", border='B', ln=True, align='R')
        
        addons = invoice.get('addons', {})
        for addon_id, qty in addons.items():
            if qty > 0:
                addon_info = self.ADDON_DATA.get(addon_id, {})
                name = addon_info.get("label", addon_id.replace('_', ' ').capitalize())
                price_each = addon_info.get("price", 0)
                total_addon = qty * price_each
                
                pdf.cell(110, 10, f"  + {name} (Qty: {qty}{' ' + addon_info['unit'] if addon_info.get('unit') else ''})", border='B')
                pdf.cell(40, 10, 'Add-on', border='B', align='C')
                pdf.cell(40, 10, f"${total_addon:.2f} (incl.)", border='B', ln=True, align='R')

        # Add proration discount if present
        proration = invoice.get("proration_discount", 0)
        if proration > 0:
            pdf.set_text_color(5, 150, 105) # Green for discount
            pdf.cell(110, 10, f"  - Unused plan credit", border='B')
            pdf.cell(40, 10, 'Discount', border='B', align='C')
            pdf.cell(40, 10, f"-${proration:.2f}", border='B', ln=True, align='R')
            pdf.set_text_color(15, 23, 42)

        account_balance_used = invoice.get("account_balance_used", 0)
        if account_balance_used > 0:
            pdf.set_text_color(37, 99, 235) # Blue
            pdf.cell(110, 10, f"  - Credit Balance Applied", border='B')
            pdf.cell(40, 10, 'Credit', border='B', align='C')
            pdf.cell(40, 10, f"-${account_balance_used:.2f}", border='B', ln=True, align='R')
            pdf.set_text_color(15, 23, 42)

        overflow = invoice.get("overflow_credited", 0)
        if overflow > 0:
            pdf.set_text_color(37, 99, 235) # Blue for credit balance
            pdf.cell(110, 10, f"  + Credit Balance Saved", border='B')
            pdf.cell(40, 10, 'Credit', border='B', align='C')
            pdf.cell(40, 10, f"+${overflow:.2f}", border='B', ln=True, align='R')
            pdf.set_text_color(15, 23, 42)

        # Add custom goods text if present
        if invoice.get('billing_custom_goods_text'):
             pdf.set_font('helvetica', 'I', 8)
             pdf.set_text_color(100, 116, 139)
             pdf.cell(190, 8, f"  Note: {invoice['billing_custom_goods_text']}", ln=True)
             pdf.set_font('helvetica', '', 10)
             pdf.set_text_color(15, 23, 42)

        pdf.ln(10)

        # ─── Totals ─────────────────────────────────────
        pdf.set_x(120)
        pdf.set_font('helvetica', '', 10)
        pdf.set_text_color(100, 116, 139)
        pdf.cell(40, 7, 'Plan Subtotal:', align='R')
        pdf.set_text_color(15, 23, 42)
        pdf.cell(40, 7, f"${invoice.get('subtotal', 0):.2f}", ln=True, align='R')
        
        pdf.set_x(120)
        pdf.set_font('helvetica', '', 10)
        pdf.set_text_color(100, 116, 139)
        pdf.cell(40, 7, 'Subtotal (Add-ons):', align='R')
        pdf.set_text_color(15, 23, 42)
        pdf.cell(40, 7, f"${invoice.get('total_addon_cost', 0):.2f}", ln=True, align='R')
        
        pdf.ln(2)
        pdf.set_x(120)
        pdf.set_font('helvetica', 'B', 12)
        pdf.set_fill_color(240, 247, 255)
        pdf.cell(80, 12, f"TOTAL PAID:  ${invoice.get('amount', 0):.2f} USD ", fill=True, align='R')
        
        # ─── Footer ─────────────────────────────────────
        pdf.set_y(-30)
        pdf.set_font('helvetica', 'I', 8)
        pdf.set_text_color(148, 163, 184)
        pdf.cell(0, 5, 'Thank you for choosing Scrapi.', ln=True, align='C')
        pdf.cell(0, 5, 'For support, contact billing@scrapi.io', ln=True, align='C')
        pdf.cell(0, 5, 'Generated automatically on scrapi.io', ln=True, align='C')

        return pdf.output()

    async def get_invoices(self, workspace_id: str, workspace_type: str, page: int = 1, limit: int = 10, search: str = None):
        """Fetch paginated and searchable invoices for a workspace"""
        db = get_db()
        query = {
            "workspace_id": workspace_id,
            "workspace_type": workspace_type
        }
        
        if search:
            query["$or"] = [
                {"invoice_no": {"$regex": search, "$options": "i"}},
                {"plan": {"$regex": search, "$options": "i"}}
            ]
        
        # Get total count
        total = await db.invoices.count_documents(query)
        
        # Skip and limit for pagination
        skip = (page - 1) * limit
        cursor = db.invoices.find(query).sort("created_at", -1).skip(skip).limit(limit)
        
        invoices = []
        async for doc in cursor:
            doc["_id"] = str(doc["_id"])
            if "created_at" in doc and isinstance(doc["created_at"], datetime):
                doc["created_at"] = doc["created_at"].isoformat()
            invoices.append(doc)
            
        return {
            "invoices": invoices,
            "total": total
        }

    async def get_invoice_by_id(self, invoice_id: str):
        """Fetch a single invoice by its ID"""
        from bson import ObjectId
        from bson.errors import InvalidId
        try:
            db = get_db()
            doc = await db.invoices.find_one({"_id": ObjectId(invoice_id)})
            if doc:
                doc["_id"] = str(doc["_id"])
                if "created_at" in doc and isinstance(doc["created_at"], datetime):
                    doc["created_at"] = doc["created_at"].isoformat()
            return doc
        except InvalidId:
            return None

    async def apply_zero_dollar_upgrade(self, user_id: str, workspace_id: str, workspace_type: str, plan_data: dict):
        """Processes an upgrade when the proration discount fully covers the cost, applying leftover to account_balance."""
        db = get_db()
        
        is_annual = plan_data.get("is_annual", False)
        invoice_addons = plan_data.get("addons", {})
        total_addon_cost = 0.0
        
        for aid, qty in invoice_addons.items():
            if aid in self.ADDON_DATA:
                price = self.ADDON_DATA[aid]["price"]
                total_addon_cost += qty * price

        plan_price_monthly = self.PLAN_PRICES.get(plan_data.get("plan", "free"), 0.0)
        base_plan_cost = plan_price_monthly * 12 * 0.9 if is_annual else plan_price_monthly
        total_expected_cost = base_plan_cost + total_addon_cost
        
        proration_discount = float(plan_data.get("proration_discount", 0.0))
        account_balance_used = float(plan_data.get("account_balance_used", 0.0))
        total_available_credit = proration_discount + account_balance_used
        
        if total_expected_cost > total_available_credit:
             raise ValueError("Insufficient proration discount and account balance to cover a zero-dollar upgrade.")
             
        # Overflow is the extra credit remaining after paying for this specific upgrade
        overflow = round(total_available_credit - total_expected_cost, 2)
        
        # We must zero out their exsting account_balance and insert only the leftover overflow
        collection = db.organizations if workspace_type == "organization" else db.users
        await collection.update_one(
            {"id": workspace_id},
            {"$set": {"account_balance": overflow}}
        )
            
        plan_name_lower = str(plan_data.get("plan", "free")).lower()
        base_limits = {
            "free": {"max_concurrent_runs": 1, "max_ram_gb": 8, "max_actor_build_mins": 10, "data_retention_days": 7, "max_schedules": 0},
            "starter": {"max_concurrent_runs": 10, "max_ram_gb": 32, "max_actor_build_mins": 30, "data_retention_days": 30, "max_schedules": 5},
            "growth": {"max_concurrent_runs": 50, "max_ram_gb": 64, "max_actor_build_mins": 60, "data_retention_days": 90, "max_schedules": 25},
            "scale": {"max_concurrent_runs": 200, "max_ram_gb": 128, "max_actor_build_mins": 120, "data_retention_days": 180, "max_schedules": 9999},
            "enterprise": {"max_concurrent_runs": 9999, "max_ram_gb": 9999, "max_actor_build_mins": 240, "data_retention_days": 365, "max_schedules": 9999}
        }
        ws_limits = base_limits.get(plan_name_lower, base_limits["free"]).copy()
        
        base_monthly_credits = {
            "free": 5.0,
            "starter": 29.0,
            "growth": 99.0,
            "scale": 299.0,
            "enterprise": 999.0
        }
        
        monthly_credits = base_monthly_credits.get(plan_name_lower, 5.0)
        # Credits map exactly to a rolling 30-day window, regardless of annual/monthly
        ws_credits = float(monthly_credits + 5.0)
            
        for aid, qty in invoice_addons.items():
            if aid == "concurrent_runs":
                ws_limits["max_concurrent_runs"] += qty
            elif aid == "actor_memory":
                ws_limits["max_ram_gb"] += qty
                
        now = datetime.now(timezone.utc)
        expires_at = now + timedelta(days=365) if is_annual else now + timedelta(days=28)
        
        update_ws_payload = {
            "plan": plan_data.get("plan"),
            "platform_credits": ws_credits,
            "limits": ws_limits,
            "expires_at": expires_at.isoformat(),
            "billing_period": "yearly" if is_annual else "monthly",
            "expiry_reminder_sent": {"5d": False, "2d": False, "0d": False}
        }
        
        collection = db.organizations if workspace_type == "organization" else db.users
        await collection.update_one({"id": workspace_id}, {"$set": update_ws_payload})
        
        subscription_payload = {
            "user_id": user_id,
            "workspace_id": workspace_id,
            "workspace_type": workspace_type,
            "plan": plan_data.get("plan"),
            "is_annual": is_annual,
            "payment_method": "credit_balance",
            "confirmed_at": datetime.now(timezone.utc)
        }
        match_filter = {"user_id": user_id, "workspace_id": workspace_id, "workspace_type": workspace_type}
        await db.billing_subscriptions.update_one(match_filter, {"$set": subscription_payload}, upsert=True)
        import uuid
        import logging
        logger = logging.getLogger(__name__)
        
        invoice_no = f"INV-{datetime.now().strftime('%Y%m%d')}-{str(uuid.uuid4())[:8].upper()}"
        
        # User details for email
        user_doc = await db.users.find_one({"id": user_id}, {"email": 1, "username": 1})
        user_email = (user_doc or {}).get("email")
        
        org_billing_email = None
        if workspace_type == "organization":
            org_doc = await db.organizations.find_one({"id": workspace_id}, {"billing_email": 1})
            org_billing_email = (org_doc or {}).get("billing_email")
            
        bd = plan_data.get("billing_details", {}) or {}

        invoice_payload = {
            "invoice_no": invoice_no,
            "user_id": user_id,
            "account_email": user_email,
            "workspace_id": workspace_id,
            "workspace_type": workspace_type,
            "plan": plan_data.get("plan"),
            "is_annual": is_annual,
            "amount": 0.0,
            "subtotal": base_plan_cost,
            "tax_amount": 0.0,
            "currency": "USD",
            "status": "paid",
            "payment_method": "credit_balance",
            "created_at": datetime.now(timezone.utc),
            "addons": invoice_addons,
            "total_addon_cost": total_addon_cost,
            "proration_discount": proration_discount,
            "account_balance_used": account_balance_used,
            "overflow_credited": overflow,
            "billing_full_name": bd.get("full_name") or bd.get("fullName"),
            "billing_company": bd.get("company"),
            "billing_tax_id": bd.get("tax_id"),
            "billing_registration_no": bd.get("registration_no"),
            "billing_contact": bd.get("billing_contact"),
            "billing_street_address": bd.get("street_address") or bd.get("streetAddress"),
            "billing_city": bd.get("city"),
            "billing_postal_code": bd.get("postal_code") or bd.get("postalCode"),
            "billing_country": bd.get("country"),
            "billing_email": bd.get("billing_email") or bd.get("billingEmail"),
            "billing_custom_address_text": bd.get("custom_address_text"),
            "billing_custom_goods_text": bd.get("custom_goods_text")
        }
        
        await db.invoices.insert_one(invoice_payload)
        
        try:
            from services.email_service import get_email_service
            email_svc = get_email_service()

            try:
                pdf_content = await self.generate_invoice_pdf(invoice_payload)
            except Exception as pdf_err:
                logger.error(f"PDF attachment generation failed: {pdf_err}")
                pdf_content = None

            raw_emails = [
                user_email,
                bd.get("billing_email") or bd.get("billingEmail"),
                org_billing_email
            ]
            
            valid_emails = list({e for e in raw_emails if e and "@" in e})
            billing_cycle_label = "Annual" if plan_data.get("is_annual") else "Monthly"
            issued_str = datetime.now(timezone.utc).strftime("%B %d, %Y")
            invoice_id_str = str(invoice_payload.get("_id", ""))
            
            await email_svc.send_payment_confirmation(
                to_emails=valid_emails,
                invoice_no=invoice_no,
                invoice_id=invoice_id_str,
                plan=plan_data.get("plan", "Unknown").capitalize(),
                billing_cycle=billing_cycle_label,
                amount=0.0,
                subtotal=base_plan_cost,
                tax_amount=0.0,
                payment_method="credit_balance",
                issued_date=issued_str,
                billing_name=bd.get("full_name") or bd.get("company") or (user_doc or {}).get("username", "Customer"),
                proration_discount=proration_discount,
                account_balance_used=account_balance_used,
                total_addon_cost=total_addon_cost,
                overflow_credited=overflow,
                pdf_content=pdf_content,
                invoice_filename=f"invoice_{invoice_no}.pdf"
            )
        except Exception as email_err:
            logger.error(f"Failed to send email receipt for zero-dollar upgrade {invoice_no}: {email_err}")
            
        return {
            "status": "COMPLETED",
            "invoice_id": str(invoice_payload.get("_id", "")),
            "invoice_no": invoice_no,
            "plan": plan_data.get("plan"),
            "is_annual": is_annual,
            "amount": 0.0,
            "subtotal": base_plan_cost,
            "tax_amount": 0.0,
            "payment_method": "credit_balance",
            "addons": invoice_addons,
            "total_addon_cost": total_addon_cost,
            "account_email": user_email,
            "proration_discount": proration_discount,
            "account_balance_used": account_balance_used,
            "overflow_credited": overflow
        }

    async def backfill_historical_costs(self, workspace_id: str = None):
        """
        One-time migration to populate 'cost', 'compute_units_used', and 'event_cost' 
        for existing historical runs.
        """
        db = get_db()
        query = {}
        if workspace_id:
            query = {"$or": [{"user_id": workspace_id}, {"organization_id": workspace_id}]}
        
        # Only backfill runs that lack the new 'event_cost' field
        query["event_cost"] = {"$exists": False}
        query["status"] = {"$in": ["succeeded", "aborted", "failed"]}
        
        cursor = db.runs.find(query)
        count = 0
        async for run in cursor:
            await self.record_run_usage(run["id"])
            count += 1
        
        logger.info(f"Backfilled {count} runs with historical cost data.")
        return count

billing_service = BillingService()
