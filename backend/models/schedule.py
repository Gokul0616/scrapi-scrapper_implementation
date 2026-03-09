from pydantic import BaseModel, Field, ConfigDict, field_validator
from typing import Optional, Dict, Any, List
from datetime import datetime, timezone
import uuid
from croniter import croniter

class Schedule(BaseModel):
    """Schedule model for cron-based actor runs."""
    model_config = ConfigDict(extra="ignore")
    
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    user_id: str
    actor_id: str
    actor_name: str
    name: str
    description: Optional[str] = None
    cron_expression: str  # e.g., "0 0 * * *" for daily at midnight
    timezone: str = "UTC"
    input_data: Dict[str, Any] = Field(default_factory=dict)
    is_enabled: bool = True
    is_paused: bool = False
    next_run: Optional[datetime] = None
    last_run: Optional[datetime] = None
    run_count: int = 0
    last_status: Optional[str] = None  # success, failed, missed
    last_run_id: Optional[str] = None
    success_count: int = 0
    failure_count: int = 0
    missed_count: int = 0
    misfire_grace_time: int = 3600  # Grace period for misfires in seconds
    max_retries: int = 3  # Maximum retries for failed runs
    retry_delay: int = 300  # Delay between retries in seconds
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
    
    @field_validator('cron_expression')
    @classmethod
    def validate_cron(cls, v: str) -> str:
        """Validate cron expression format."""
        try:
            # Test if cron expression is valid
            croniter(v)
            return v
        except Exception as e:
            raise ValueError(f"Invalid cron expression: {str(e)}")


class ScheduleCreate(BaseModel):
    """Schema for creating a new schedule."""
    actor_id: str
    name: str
    description: Optional[str] = None
    cron_expression: str
    timezone: str = "UTC"
    input_data: Dict[str, Any] = Field(default_factory=dict)
    is_enabled: bool = True
    
    @field_validator('cron_expression')
    @classmethod
    def validate_cron(cls, v: str) -> str:
        """Validate cron expression format."""
        try:
            croniter(v)
            return v
        except Exception as e:
            raise ValueError(f"Invalid cron expression: {str(e)}")


class ScheduleUpdate(BaseModel):
    """Schema for updating a schedule."""
    name: Optional[str] = None
    description: Optional[str] = None
    cron_expression: Optional[str] = None
    timezone: Optional[str] = None
    input_data: Optional[Dict[str, Any]] = None
    is_enabled: Optional[bool] = None
    
    @field_validator('cron_expression')
    @classmethod
    def validate_cron(cls, v: Optional[str]) -> Optional[str]:
        """Validate cron expression format if provided."""
        if v is not None:
            try:
                croniter(v)
                return v
            except Exception as e:
                raise ValueError(f"Invalid cron expression: {str(e)}")
        return v


class ScheduleResponse(BaseModel):
    """Schedule response with additional computed fields."""
    id: str
    user_id: str
    actor_id: str
    actor_name: str
    name: str
    description: Optional[str]
    cron_expression: str
    timezone: str
    input_data: Dict[str, Any]
    is_enabled: bool
    is_paused: bool
    next_run: Optional[datetime]
    last_run: Optional[datetime]
    run_count: int
    last_status: Optional[str]
    last_run_id: Optional[str]
    success_count: int
    failure_count: int
    missed_count: int
    created_at: datetime
    updated_at: datetime
    human_readable: Optional[str] = None  # Human-readable cron description


class ScheduleExecutionHistory(BaseModel):
    """Model for schedule execution history."""
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    schedule_id: str
    scheduled_time: datetime
    actual_time: Optional[datetime] = None
    status: str  # success, failed, missed, skipped
    run_id: Optional[str] = None
    error_message: Optional[str] = None
    retry_count: int = 0
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))
