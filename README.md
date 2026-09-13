# AppexQuant Markets Global

> **Institutional Quantitative Trading, Risk-Mirroring, Cryptographic Audit Ledger & Developer API Gateway.**

[![Build Status](https://img.shields.io/badge/build-passing-brightgreen.svg)]()
[![TypeScript](https://img.shields.io/badge/TypeScript-5.x-blue.svg)](https://www.typescriptlang.org/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688.svg)](https://fastapi.tiangolo.com/)
[![OpenAPI 3.0](https://img.shields.io/badge/OpenAPI-3.0.3-green.svg)](/api/v1/openapi.json)
[![Security](https://img.shields.io/badge/security-HMAC--SHA256%20%7C%20Audit%20Ledger-cyan.svg)](#security)
[![License](https://img.shields.io/badge/license-Institutional%20v1.0-gold.svg)](#license)

---

## 🏛️ Executive Overview

**AppexQuant Markets Global** is an institutional-grade algorithmic execution, risk orchestration, and quantitative trading platform. Designed for professional trading desks, prop firm competitors, and algorithmic quants, AppexQuant unifies real-time market data streaming (Deriv WebSocket, Binance Feed, MT5/cTrader bridge), cryptographic trade verification, automated anti-tilt risk circuit breakers, prop firm risk-mirroring engines, creator revenue split ledgers, social automation dispatchers, and an enterprise public developer API gateway.

---

## 🚀 Module Architecture & Progress Metrics

```mermaid
flowchart TD
    subgraph Core Pipeline
        A[Market Feeds / Deriv WS] --> B[Smart Money Concepts Engine]
        B --> C[Risk Guardrails & Anti-Tilt Circuit Breaker]
        C -->|Passed| D[Execution Engine & Broker Gateway]
        C -->|Breached| E[Automated Lockout & Failsafe Guard]
        D --> F[Cryptographic Audit Trail SHA-256]
    end

    subgraph Expansion Ecosystem
        D --> G[Prop Firm Risk Mirroring Engine]
        D --> H[Creator Revenue Split Ledger]
        F --> I[Social Automation Hub & Webhook Inspector]
        F --> J[Public Developer API & OpenAPI Gateway]
    end
```

### Enterprise Module Implementation Status

| Module | Subsystem | Implementation Details | Status |
| :--- | :--- | :--- | :---: |
| **Module 1** | **Cryptographic Trade Audit Trail** | SHA-256 immutable block generation, merkle root verification, tamper detection, QR verification certificate generation. | ✅ **100% Production** |
| **Module 2** | **Anti-Tilt & Failsafe Risk Guardrails** | Automated intraday drawdown tracking, consecutive loss limiters, dynamic cooldown locks, PIN-protected admin override. | ✅ **100% Production** |
| **Module 3** | **Prop Firm Risk-Mirroring Engine** | Normalized equity scaling across 7 prop firm rulesets (FTMO, FundedNext, Deriv, MFF), asset tick valuation, slippage bounds. | ✅ **100% Production** |
| **Module 4** | **Creator Revenue Split Ledger** | Subscriptions & copy-trading revenue allocation, automated high-watermark fee calculations, instant USDT/crypto payout requests. | ✅ **100% Production** |
| **Module 5** | **Public Developer API & Documentation** | FastAPI (`app/modules/api_gateway/`) + Express Gateway, SHA-256 API key hashing, sliding-window rate limiting, Swagger UI (`/docs`) & ReDoc (`/redoc`). | ✅ **100% Production** |
| **Module 6** | **Social Automation & Webhook Inspector** | Omni-channel signal broadcast (Telegram, Discord, TikTok, Meta), real-time payload logging, live replay sandbox, JSON schema diffing. | ✅ **100% Production** |

---

## 🌐 Public Developer API & Documentation Guide

AppexQuant provides an institutional REST & WebSocket API secured with **SHA-256 hashed API Keys** and **HMAC-SHA256 request signing**.

### Interactive API Explorers
- 📖 **Interactive Swagger UI**: [`http://localhost:3000/docs`](http://localhost:3000/docs)
- 📑 **ReDoc Clean Documentation**: [`http://localhost:3000/redoc`](http://localhost:3000/redoc)
- ⚙️ **OpenAPI 3.0.3 Specification**: [`http://localhost:3000/api/v1/openapi.json`](/api/v1/openapi.json)

---

### Core API Endpoints

#### 1. Live Market Status & Latency
- **Endpoint**: `GET /api/v1/market/status`
- **Scope**: None (Public)
- **Rate Limit**: 2,400 req/min
- **Response**:
```json
{
  "system": "AppexQuant Core Engine",
  "timestamp": "2026-09-13T12:00:00Z",
  "websocket_gateway": "Connected (Deriv WS & Binance Feed)",
  "active_symbols": ["XAU/USD", "EUR/USD", "BTC/USD", "Volatility 75 Index"],
  "latency_ms": 14.2,
  "uptime_percentage": 99.98
}
```

#### 2. Cryptographic Proof Verification
- **Endpoint**: `POST /api/v1/audit/verify`
- **Scope**: `read:audit`
- **Rate Limit**: 2,400 req/min
- **Payload**:
```json
{
  "certificate_hash": "7e8d2c49b1a03f84c982e5b10d7a6e43f1190bc28192a47291048bca12093812"
}
```
- **Response**:
```json
{
  "status": "VALID_VERIFIED",
  "verified_at": "2026-09-13T12:00:00Z",
  "owner": "Alex N. Obwogi (OMERTA Verified)",
  "asset": "XAU/USD (Gold Scalp)",
  "execution_price": 2345.60,
  "pnl_percentage": 4.85,
  "immutable_ledger_match": true,
  "block_index": 89214,
  "merkle_root": "5a7b3c2e1f8d90a4b2c3d4e5f6a7b8c9d0e1f2a3b4c5d6e7f8a9b0c1d2e3f4a5"
}
```

#### 3. Trader Analytics & Risk State
- **Endpoint**: `GET /api/v1/analytics/user`
- **Scope**: `read:analytics`
- **Authentication**: `Authorization: Bearer <aq_live_...>`
- **Response**:
```json
{
  "user_id": "usr_alex_001",
  "tier": "Enterprise",
  "metrics": {
    "total_trades": 142,
    "win_rate_percent": 68.3,
    "profit_factor": 2.41,
    "anti_tilt_lock_status": "DISENGAGED",
    "current_drawdown_percent": 1.12,
    "sharpe_ratio": 2.18,
    "max_consecutive_wins": 9
  }
}
```

#### 4. Omni-Channel Social Automation Dispatch
- **Endpoint**: `POST /api/v1/automation/trigger`
- **Scope**: `write:automation`
- **Authentication**: `Authorization: Bearer <aq_live_...>`
- **Payload**:
```json
{
  "channels": ["telegram", "discord", "tiktok"],
  "message_payload": "⚡ [AI Signal Alert] Gold XAU/USD Momentum Breakout at $2,514.80. Target 1:3.2 RR.",
  "media_url": "https://cdn.appexquant.markets/charts/xauusd_4h_breakout.png"
}
```
- **Response**:
```json
{
  "dispatch_status": "SUCCESS",
  "target_channels": ["telegram", "discord", "tiktok"],
  "dispatched_at": "2026-09-13T12:00:00Z",
  "delivery_receipt_ids": ["msg_telegram_178921_0", "msg_discord_178921_1", "msg_tiktok_178921_2"]
}
```

---

## 💻 Developer Code Examples

### cURL
```bash
# 1. Check Live Market Core Health
curl -X GET "http://localhost:3000/api/v1/market/status"

# 2. Cryptographically Verify Audit Proof
curl -X POST "http://localhost:3000/api/v1/audit/verify" \
  -H "Content-Type: application/json" \
  -d '{"certificate_hash": "e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855"}'

# 3. Query Trader Risk & Metrics
curl -X GET "http://localhost:3000/api/v1/analytics/user" \
  -H "Authorization: Bearer aq_live_998877665544332211"

# 4. Trigger Social Automation Dispatch
curl -X POST "http://localhost:3000/api/v1/automation/trigger" \
  -H "Authorization: Bearer aq_live_998877665544332211" \
  -H "Content-Type: application/json" \
  -d '{
    "channels": ["telegram", "discord"],
    "message_payload": "🚀 Trade executed: Long XAU/USD @ 2,514.80 (OMERTA Certified)"
  }'
```

### Python
```python
import requests

API_URL = "http://localhost:3000/api/v1"
API_KEY = "aq_live_998877665544332211"

headers = {
    "Authorization": f"Bearer {API_KEY}",
    "Content-Type": "application/json"
}

# 1. Fetch User Trading Analytics
analytics_resp = requests.get(f"{API_URL}/analytics/user", headers=headers)
print("User Analytics:", analytics_resp.json())

# 2. Dispatch Automation Broadcast
payload = {
    "channels": ["telegram", "discord"],
    "message_payload": "🎯 ICT Silver Bullet setup triggered on EUR/USD NY Session Open."
}
dispatch_resp = requests.post(f"{API_URL}/automation/trigger", json=payload, headers=headers)
print("Dispatch Receipt:", dispatch_resp.json())
```

### TypeScript / JavaScript
```typescript
const API_URL = 'http://localhost:3000/api/v1';
const API_KEY = 'aq_live_998877665544332211';

async function verifyAuditProof(certificateHash: string) {
  const response = await fetch(`${API_URL}/audit/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ certificate_hash: certificateHash }),
  });
  const data = await response.json();
  console.log('Verification Proof:', data);
}

verifyAuditProof('e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855');
```

---

## 🔒 Security & Rate Limiting

AppexQuant enforces strict rate-limiting per API key with standard response headers:
- `X-RateLimit-Limit`: Maximum requests allowed per 60-second window.
- `X-RateLimit-Remaining`: Remaining request quota in the current window.
- `X-RateLimit-Reset`: Time in seconds until the quota window resets.

### Tier Limits
- **Starter**: 120 req/min
- **Professional**: 600 req/min
- **Enterprise**: 2,400 req/min

When limits are exceeded, the server returns an **HTTP 429 Too Many Requests** error with retry details.

---

## 🔑 Environment Variable Configuration

Create a `.env` file in the project root with the following configuration:

```env
# Application Environment
NODE_ENV=production
APP_ENV=production
PORT=3000

# Deriv OAuth & API Credentials
DERIV_APP_ID=61040
DERIV_APP_SECRET=your_deriv_app_secret_here
DERIV_OAUTH_SCOPE=read,trade,admin,payments # or space-separated: "read trade admin payments"
DERIV_WS_URL=wss://ws.derivws.com/websockets/v3

# Database & Storage
POSTGRES_CONNECTION_STRING=postgresql://postgres:password@localhost:5432/appexquant_prod

# Security & Tokens
SESSION_SECRET=your_32_byte_hex_session_secret_key_here
CRON_SECRET=your_cron_job_secret_token
```

---

## 🛠️ Project Monorepo Structure

```
├── app/
│   └── modules/
│       ├── api_gateway/              # FastAPI Python Public Gateway Module
│       │   ├── __init__.py
│       │   ├── main.py               # Gateway endpoints, docs & CORS
│       │   ├── models.py             # Pydantic data schemas
│       │   ├── rate_limiter.py       # Sliding window rate limiter
│       │   └── security.py           # SHA-256 API Key verification
│       └── social_automation/        # Social automation & Pillow image engine
├── src/
│   ├── components/
│   │   ├── automation/               # Webhook Inspector, Social Publisher
│   │   ├── developer/                # API Keys Manager, Sandbox, Docs UI
│   │   └── audit/                    # Cryptographic Certificate Verifier
│   ├── services/
│   │   ├── developerApiService.ts    # Key hashing, rate-limiter, OpenAPI 3.0 spec
│   │   ├── cryptographicAuditService.ts
│   │   ├── riskGuardrailsService.ts
│   │   ├── riskMirroringEngine.ts
│   │   ├── creatorRevenueService.ts
│   │   └── webhookInspectorService.ts
│   └── types/
│       ├── developerApi.ts
│       └── webhookInspector.ts
├── server.ts                         # Express server with /docs, /redoc & API routes
└── package.json
```

---

## ⚡ Getting Started

```bash
# 1. Install dependencies
npm install

# 2. Boot the full-stack server
npm run dev

# 3. Explore the API
Open http://localhost:3000/docs for Swagger UI
Open http://localhost:3000/redoc for ReDoc
```

---

## 📜 License

Proprietary Institutional License &copy; 2026 AppexQuant Markets Global. All rights reserved.
