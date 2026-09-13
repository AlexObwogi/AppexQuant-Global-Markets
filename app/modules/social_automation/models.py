"""SQLAlchemy Database Models for Social Automation.

Defines schemas for connected platform accounts, scheduled publications,
and per-channel execution delivery audit logs.
"""

from datetime import datetime, timezone
import enum
from typing import List, Optional, Dict, Any
from sqlalchemy import (
    String,
    Text,
    Boolean,
    DateTime,
    Enum as SQLEnum,
    ForeignKey,
    Index,
    Integer,
)
from sqlalchemy.dialects.postgresql import JSONB
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    """Base model class if imported stand-alone; can be substituted with app.core.database.Base."""
    pass


class PlatformType(str, enum.Enum):
    """Supported social automation delivery platforms."""
    TELEGRAM_BOT = "TELEGRAM_BOT"
    TELEGRAM_USERBOT = "TELEGRAM_USERBOT"
    DISCORD_WEBHOOK = "DISCORD_WEBHOOK"
    META_INSTAGRAM = "META_INSTAGRAM"
    META_FACEBOOK = "META_FACEBOOK"
    TIKTOK = "TIKTOK"
    SNAPCHAT = "SNAPCHAT"
    WHATSAPP_BUSINESS = "WHATSAPP_BUSINESS"


class PostStatus(str, enum.Enum):
    """Publication life-cycle states."""
    PENDING = "PENDING"
    PROCESSING = "PROCESSING"
    PUBLISHED = "PUBLISHED"
    PARTIALLY_PUBLISHED = "PARTIALLY_PUBLISHED"
    FAILED = "FAILED"
    CANCELLED = "CANCELLED"


class ConnectedChannel(Base):
    """Stores connected user social channel credentials, OAuth tokens, and destination identifiers."""

    __tablename__ = "social_connected_channels"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    platform: Mapped[PlatformType] = mapped_column(
        SQLEnum(PlatformType, name="social_platform_type_enum"),
        nullable=False,
        index=True
    )
    channel_name: Mapped[str] = mapped_column(String(128), nullable=False)
    account_identifier: Mapped[str] = mapped_column(
        String(255),
        nullable=False,
        comment="Chat ID, Webhook URL, Page ID, IG Account ID, or Phone Number ID"
    )

    # Encrypted credentials or OAuth state (Tokens, refresh tokens, secrets, webhook URLs)
    encrypted_credentials: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        nullable=False,
        default=dict,
        comment="Encrypted payload storing access_token, refresh_token, secret_keys, or webhook_token"
    )
    token_expires_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)

    # Operational status
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    rate_limit_reset_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    settings_metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        comment="Platform specific preferences e.g. thread_id, default hashtags, template name"
    )

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    execution_logs: Mapped[List["PostExecutionLog"]] = relationship(
        "PostExecutionLog",
        back_populates="channel",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_user_platform_active", "user_id", "platform", "is_active"),
    )


class ScheduledPost(Base):
    """Represents a scheduled cross-platform broadcast with media and cleaned copy."""

    __tablename__ = "social_scheduled_posts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    user_id: Mapped[str] = mapped_column(String(64), nullable=False, index=True)

    # Target channels: array of ConnectedChannel IDs
    target_channel_ids: Mapped[List[int]] = mapped_column(
        JSONB,
        nullable=False,
        comment="List of ConnectedChannel primary keys to publish this post to"
    )

    # Content payload
    raw_content: Mapped[Optional[str]] = mapped_column(Text, nullable=True)
    cleaned_copy: Mapped[str] = mapped_column(Text, nullable=False)
    media_paths: Mapped[List[str]] = mapped_column(
        JSONB,
        nullable=False,
        default=list,
        comment="Ordered list of local paths or S3 URLs for attached images/videos"
    )
    media_metadata: Mapped[Dict[str, Any]] = mapped_column(
        JSONB,
        default=dict,
        comment="Resolution, aspect_ratio (e.g. 9:16), duration, and watermark status"
    )

    # Scheduling details
    scheduled_time: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        nullable=False,
        index=True,
        comment="Scheduled UTC timestamp up to 90 days in advance"
    )
    published_at: Mapped[Optional[datetime]] = mapped_column(DateTime(timezone=True), nullable=True)
    status: Mapped[PostStatus] = mapped_column(
        SQLEnum(PostStatus, name="social_post_status_enum"),
        default=PostStatus.PENDING,
        nullable=False,
        index=True
    )
    retry_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)

    # Provenance tracking
    source_origin: Mapped[str] = mapped_column(
        String(64),
        default="MANUAL",
        comment="TELEGRAM_SCRAPER, TRADINGVIEW_AUTOMATION, or MANUAL"
    )
    source_message_id: Mapped[Optional[str]] = mapped_column(String(128), nullable=True)

    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    execution_logs: Mapped[List["PostExecutionLog"]] = relationship(
        "PostExecutionLog",
        back_populates="post",
        cascade="all, delete-orphan"
    )

    __table_args__ = (
        Index("idx_scheduled_status_time", "status", "scheduled_time"),
    )


class PostExecutionLog(Base):
    """Audit and telemetry log capturing per-platform dispatch results."""

    __tablename__ = "social_post_execution_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    post_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("social_scheduled_posts.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )
    channel_id: Mapped[int] = mapped_column(
        Integer,
        ForeignKey("social_connected_channels.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    platform: Mapped[PlatformType] = mapped_column(
        SQLEnum(PlatformType, name="social_platform_type_enum"),
        nullable=False
    )
    status: Mapped[str] = mapped_column(
        String(32),
        nullable=False,
        comment="SUCCESS, RATE_LIMITED, FAILED, RETRYING"
    )
    attempt_count: Mapped[int] = mapped_column(Integer, default=1, nullable=False)
    platform_post_id: Mapped[Optional[str]] = mapped_column(
        String(255),
        nullable=True,
        comment="Remote platform post identifier returned upon successful creation"
    )
    response_payload: Mapped[Dict[str, Any]] = mapped_column(JSONB, default=dict)
    error_message: Mapped[Optional[str]] = mapped_column(Text, nullable=True)

    executed_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

    # Relationships
    post: Mapped["ScheduledPost"] = relationship("ScheduledPost", back_populates="execution_logs")
    channel: Mapped["ConnectedChannel"] = relationship("ConnectedChannel", back_populates="execution_logs")


# Model aliases matching various naming conventions
ConnectedChannels = ConnectedChannel
ScheduledPosts = ScheduledPost
PostExecutionLogs = PostExecutionLog
