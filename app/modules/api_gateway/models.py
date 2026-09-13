"""
AppexQuant Markets Global - API Gateway Models & Schemas
Pydantic schemas and database entity models for Public API Gateway.
"""

from datetime import datetime
from enum import Enum
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field


class RateLimitTier(str, Enum):
    STARTER = "Starter"
    PROFESSIONAL = "Professional"
    ENTERPRISE = "Enterprise"


class ApiKeyScope(str, Enum):
    READ_AUDIT = "read:audit"
    READ_MARKET = "read:market_data"
    READ_ACCOUNTS = "read:accounts"
    READ_ANALYTICS = "read:analytics"
    WRITE_ORDERS = "write:orders"
    WRITE_AUTOMATION = "write:automation"
    MANAGE_WEBHOOKS = "manage:webhooks"


class ApiKeyRecord(BaseModel):
    id: str = Field(..., description="Unique API key identifier")
    user_id: str = Field(..., description="Associated user ID")
    key_prefix: str = Field(..., description="Masked key prefix (e.g. aq_live_9988...)")
    key_hash: str = Field(..., description="SHA-256 hash of the complete API key token")
    name: str = Field(..., description="Descriptive label for this key token")
    tier: RateLimitTier = Field(default=RateLimitTier.PROFESSIONAL, description="Rate-limit tier allocation")
    scopes: List[ApiKeyScope] = Field(default_factory=list, description="Authorized access permission scopes")
    ip_whitelist: List[str] = Field(default_factory=list, description="Permitted IP addresses / CIDR ranges")
    rate_limit_per_minute: int = Field(default=600, description="Sliding window request ceiling per 60s")
    is_active: bool = Field(default=True, description="Active status flag")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    last_used_at: Optional[datetime] = None


class MarketStatusResponse(BaseModel):
    system: str = Field(..., example="AppexQuant Core Engine")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    websocket_gateway: str = Field(..., example="Connected (Deriv WS & Binance Feed)")
    active_symbols: List[str] = Field(..., example=["XAU/USD", "EUR/USD", "BTC/USD", "Volatility 75 Index"])
    latency_ms: float = Field(..., example=14.2)
    uptime_percentage: float = Field(default=99.98, example=99.98)


class AuditVerificationRequest(BaseModel):
    certificate_hash: str = Field(
        ...,
        min_length=10,
        description="SHA-256 cryptographic hash of the trade, challenge, or signal outcome."
    )


class AuditVerificationResponse(BaseModel):
    status: str = Field(..., example="VALID_VERIFIED")
    verified_at: datetime = Field(default_factory=datetime.utcnow)
    owner: str = Field(..., example="Alex N. Obwogi (OMERTA Verified)")
    asset: str = Field(..., example="XAU/USD (Gold Scalp)")
    execution_price: float = Field(..., example=2345.60)
    pnl_percentage: float = Field(..., example=4.85)
    immutable_ledger_match: bool = Field(..., example=True)
    block_index: int = Field(default=89214, example=89214)
    merkle_root: str = Field(
        default="5a7b3c2e1f8d90a4b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5",
        description="Root hash of the cryptographic batch block"
    )


class UserAnalyticsResponse(BaseModel):
    user_id: str = Field(..., example="usr_alex_001")
    tier: str = Field(..., example="Enterprise")
    metrics: Dict[str, Any] = Field(
        ...,
        example={
            "total_trades": 142,
            "win_rate_percent": 68.3,
            "profit_factor": 2.41,
            "anti_tilt_lock_status": "DISENGAGED",
            "current_drawdown_percent": 1.12
        }
    )


class AutomationTriggerRequest(BaseModel):
    channels: List[str] = Field(..., example=["telegram", "discord", "tiktok"])
    message_payload: str = Field(..., description="Formatted markdown text or signal description.")
    media_url: Optional[str] = Field(None, description="Optional hosted URL of the Pillow-branded 9:16 chart image.")


class AutomationTriggerResponse(BaseModel):
    dispatch_status: str = Field(..., example="SUCCESS")
    target_channels: List[str] = Field(..., example=["telegram", "discord", "tiktok"])
    dispatched_at: datetime = Field(default_factory=datetime.utcnow)
    delivery_receipt_ids: List[str] = Field(..., example=["msg_uuid_0", "msg_uuid_1", "msg_uuid_2"])
