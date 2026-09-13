"""Pydantic V2 schemas for Social Automation API requests and responses."""

from datetime import datetime, timezone, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, field_validator, ConfigDict
from .models import PlatformType, PostStatus


class ConnectedChannelBase(BaseModel):
    platform: PlatformType
    channel_name: str = Field(..., max_length=128)
    account_identifier: str = Field(..., max_length=255)
    is_active: bool = True
    settings_metadata: Dict[str, Any] = Field(default_factory=dict)


class ConnectedChannelCreate(ConnectedChannelBase):
    credentials: Dict[str, Any] = Field(
        ...,
        description="Plain credentials or tokens to be securely encrypted prior to storage"
    )
    token_expires_at: Optional[datetime] = None


class ConnectedChannelUpdate(BaseModel):
    channel_name: Optional[str] = Field(None, max_length=128)
    account_identifier: Optional[str] = Field(None, max_length=255)
    credentials: Optional[Dict[str, Any]] = None
    is_active: Optional[bool] = None
    settings_metadata: Optional[Dict[str, Any]] = None
    token_expires_at: Optional[datetime] = None


class ConnectedChannelResponse(ConnectedChannelBase):
    id: int
    user_id: str
    token_expires_at: Optional[datetime]
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScheduledPostCreate(BaseModel):
    target_channel_ids: List[int] = Field(..., min_length=1, description="List of channel IDs to post to")
    cleaned_copy: str = Field(..., min_length=1, description="Post text / caption")
    media_paths: List[str] = Field(default_factory=list, description="Array of media paths or URLs")
    media_metadata: Dict[str, Any] = Field(default_factory=dict)
    scheduled_time: datetime = Field(
        ...,
        description="Target UTC timestamp to publish (up to 90 days in the future)"
    )

    @field_validator("scheduled_time")
    @classmethod
    def validate_scheduling_window(cls, v: datetime) -> datetime:
        now = datetime.now(timezone.utc)
        target = v if v.tzinfo else v.replace(tzinfo=timezone.utc)

        # Allow slight clock leeway (e.g. up to 1 minute in the past for instant queues)
        if target < now - timedelta(minutes=2):
            raise ValueError("Scheduled time cannot be in the past.")

        max_allowed = now + timedelta(days=90)
        if target > max_allowed:
            raise ValueError("Content can be scheduled for a maximum of 90 days in advance.")

        return target


class ScheduledPostUpdate(BaseModel):
    target_channel_ids: Optional[List[int]] = None
    cleaned_copy: Optional[str] = None
    media_paths: Optional[List[str]] = None
    media_metadata: Optional[Dict[str, Any]] = None
    scheduled_time: Optional[datetime] = None
    status: Optional[PostStatus] = None


class PostExecutionLogResponse(BaseModel):
    id: int
    post_id: int
    channel_id: int
    platform: PlatformType
    status: str
    attempt_count: int
    platform_post_id: Optional[str]
    response_payload: Dict[str, Any]
    error_message: Optional[str]
    executed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class ScheduledPostResponse(BaseModel):
    id: int
    user_id: str
    target_channel_ids: List[int]
    raw_content: Optional[str]
    cleaned_copy: str
    media_paths: List[str]
    media_metadata: Dict[str, Any]
    scheduled_time: datetime
    published_at: Optional[datetime]
    status: PostStatus
    source_origin: str
    source_message_id: Optional[str]
    created_at: datetime
    updated_at: datetime
    execution_logs: List[PostExecutionLogResponse] = Field(default_factory=list)

    model_config = ConfigDict(from_attributes=True)


class ManualCrossPostRequest(BaseModel):
    target_channel_ids: List[int] = Field(..., min_length=1)
    content: str = Field(..., min_length=1)
    media_paths: List[str] = Field(default_factory=list)
    format_9_16: bool = Field(default=False, description="Whether to transform media into 9:16 vertical reels")


class TradingViewCaptureRequest(BaseModel):
    symbol: str = Field("BINANCE:BTCUSDT", description="TradingView ticker or symbol layout")
    timeframes: List[str] = Field(
        default=["15m", "1h", "4h", "1D"],
        description="Timeframes to cycle through: 1m, 5m, 15m, 30m, 1h, 4h, 1D"
    )
    format_vertical_9_16: bool = Field(
        default=True,
        description="Automatically frame horizontally captured chart inside AppexQuant 9:16 template"
    )
    caption_note: Optional[str] = None


class CalendarPostSummary(BaseModel):
    id: int
    scheduled_time: datetime
    status: PostStatus
    target_channel_ids: List[int]
    cleaned_copy: str
    media_count: int
    source_origin: str


class CalendarDayBucket(BaseModel):
    date: str  # YYYY-MM-DD
    total_posts: int
    pending_count: int
    published_count: int
    failed_count: int
    posts: List[CalendarPostSummary]


class CalendarViewResponse(BaseModel):
    start_date: str
    end_date: str
    total_scheduled: int
    days: List[CalendarDayBucket]


class QueueStatusResponse(BaseModel):
    total_in_queue: int
    pending_count: int
    processing_count: int
    retrying_count: int
    next_scheduled_post_at: Optional[datetime] = None
    oldest_pending_post_at: Optional[datetime] = None


class OAuthAuthorizeUrlResponse(BaseModel):
    platform: PlatformType
    authorization_url: str
    state: str
    instructions: str


class OAuthCallbackResponse(BaseModel):
    success: bool
    platform: PlatformType
    account_identifier: str
    channel_id: Optional[int] = None
    token_expires_at: Optional[datetime] = None
    message: str

