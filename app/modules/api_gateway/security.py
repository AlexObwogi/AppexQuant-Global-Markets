"""
AppexQuant Markets Global - API Gateway Security & Authentication Layer
Implements SHA-256 token hashing, Bearer validation, and Scope enforcement.
"""

import hashlib
from datetime import datetime
from typing import Dict, List, Optional
from fastapi import HTTPException, Security, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from .models import ApiKeyRecord, RateLimitTier, ApiKeyScope

security = HTTPBearer()

def hash_api_key(raw_key: str) -> str:
    """Computes a SHA-256 hash of the raw API key for secure storage."""
    return hashlib.sha256(raw_key.encode("utf-8")).hexdigest()

# Database / In-Memory Mock Store for Live Hashed Keys
# Keyed by SHA-256 hash
API_KEY_REGISTRY: Dict[str, ApiKeyRecord] = {}

# Default Enterprise Provisioned Key: aq_live_998877665544332211
_default_raw_key = "aq_live_998877665544332211"
_default_hash = hash_api_key(_default_raw_key)

API_KEY_REGISTRY[_default_hash] = ApiKeyRecord(
    id="key_ent_001",
    user_id="usr_alex_001",
    key_prefix="aq_live_9988...",
    key_hash=_default_hash,
    name="Primary Enterprise Production Node",
    tier=RateLimitTier.ENTERPRISE,
    scopes=[
        ApiKeyScope.READ_AUDIT,
        ApiKeyScope.READ_MARKET,
        ApiKeyScope.READ_ACCOUNTS,
        ApiKeyScope.READ_ANALYTICS,
        ApiKeyScope.WRITE_ORDERS,
        ApiKeyScope.WRITE_AUTOMATION,
        ApiKeyScope.MANAGE_WEBHOOKS,
    ],
    ip_whitelist=[],
    rate_limit_per_minute=2400,
    is_active=True,
    created_at=datetime.utcnow()
)

def verify_api_key(credentials: HTTPAuthorizationCredentials = Security(security)) -> ApiKeyRecord:
    """
    Validates API key provided in the Authorization: Bearer header.
    Performs constant-time SHA-256 hash lookup.
    """
    token = credentials.credentials.strip()
    if not (token.startswith("aq_live_") or token.startswith("apx_live_") or token.startswith("aq_test_")):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid token format. Bearer token must begin with 'aq_live_' or 'apx_live_'."
        )

    token_hash = hash_api_key(token)
    key_record = API_KEY_REGISTRY.get(token_hash)

    if not key_record or not key_record.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid, expired, or revoked API Key provided."
        )

    # Update last used timestamp
    key_record.last_used_at = datetime.utcnow()
    return key_record

def require_scope(required_scope: ApiKeyScope):
    """Dependency factory that checks if an API key has the necessary scope."""
    def scope_checker(key_record: ApiKeyRecord = Security(verify_api_key)) -> ApiKeyRecord:
        if required_scope not in key_record.scopes:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Forbidden: API Key lacks required scope '{required_scope.value}'."
            )
        return key_record
    return scope_checker
