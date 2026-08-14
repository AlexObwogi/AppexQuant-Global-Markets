# 13. Deriv Broker Integration

AppExQuant integrates natively with Deriv via OAuth 2.0 PKCE and WebSocket market data feeds.

## Authentication Flow (OAuth 2.0 PKCE)

1. **User Initiation**: User clicks "Connect Deriv" in `AuthGate.tsx`.
2. **Server Login Route**: `/api/auth/deriv/login` generates cryptographic `code_verifier`, `code_challenge`, and `state`, storing state in an HttpOnly cookie and redirecting to Deriv OAuth.
3. **Authorization Callback**: `/api/auth/deriv/callback` validates the state, exchanges the authorization code via server-to-server POST request for access tokens, and establishes the application session token (`session_token`).

```mermaid
sequenceDiagram
    participant User
    participant AppClient as AppClient (AuthGate)
    participant Server as Express Server (/api/auth/deriv)
    participant Deriv as Deriv OAuth & API

    User->>AppClient: Click Connect Deriv
    AppClient->>Server: GET /api/auth/deriv/login
    Server->>Server: Generate PKCE & State Cookie
    Server-->>AppClient: Redirect to Deriv OAuth Auth URL
    AppClient->>Deriv: User authorizes App ID 1089
    Deriv-->>Server: GET /api/auth/deriv/callback?code=...&state=...
    Server->>Server: Validate state cookie & retrieve code_verifier
    Server->>Deriv: POST token exchange with code & code_verifier
    Deriv-->>Server: Access token & account details
    Server->>Server: Issue signed session cookie (HttpOnly)
    Server-->>AppClient: Redirect to /dashboard
```
