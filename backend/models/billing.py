from pydantic import BaseModel, Field, ConfigDict
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import uuid

class PlanLimit(BaseModel):
    max_concurrent_runs: int = 1
    max_ram_gb: int = 2
    max_actor_build_mins: int = 10
    platform_credits: float = 5.0  # e.g., $5 for Free plan
    compute_unit_price: float = 0.50  # per CU
    storage_gb_price: float = 0.20  # per GB-month
    data_retention_days: int = 7
    max_schedules: int = 0

class Plan(BaseModel):
    """Available Plans (Free, Starter, Scale)"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Free"
    stripe_product_id: Optional[str] = None
    stripe_price_id: Optional[str] = None
    monthly_price: float = 0.0
    limits: PlanLimit = Field(default_factory=PlanLimit)

class Subscription(BaseModel):
    """User or Organization's active subscription"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_type: str  # "personal" or "organization"
    workspace_id: str  # user_id or organization_id
    plan_name: str = "Free"
    stripe_customer_id: Optional[str] = None
    stripe_subscription_id: Optional[str] = None
    status: str = "active"  # "active", "past_due", "canceled", "incomplete"
    current_period_start: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    current_period_end: datetime = Field(default_factory=lambda: datetime.now(timezone.utc)) # Should be calculated +30 days usually
    cancel_at_period_end: bool = False
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))

class UsageRecord(BaseModel):
    """Tracks metered usage per billing cycle for a specific workspace"""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    workspace_id: str  # user_id or organization_id
    billing_period_start: datetime
    billing_period_end: datetime
    
    # Usage metrics
    compute_units_used: float = 0.0
    storage_bytes_used: int = 0
    proxy_usage_bytes: int = 0
    
    # Financial metrics
    compute_cost: float = 0.0
    storage_cost: float = 0.0
    proxy_cost: float = 0.0
    total_cost: float = 0.0
    
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
