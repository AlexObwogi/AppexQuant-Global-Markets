# AppexQuant - Root Cause Analysis & Fixes

## Summary
Your application has **2 critical issues**:
1. **DerivWebSocket socket errors → 422 responses** (REPEATING)
2. **Prisma client not initialized** (REPEATING)

---

## Issue #1: DerivWebSocket Socket Errors (422 HTTP Responses)

### Root Cause
The error appears in logs:
```
[DerivWebSocket] Socket onerror: ErrorEvent {
  type: 'error',
  defaultPrevented: false,
  cancelable: false,
  timeStamp: 55416.479379
}
```

**This happens because:**

1. **`attemptFetchProfileWithUrl()` doesn't catch/log the actual error**
   - Line 197-199 in `oauthServerService.ts`:
   ```typescript
   ws.onerror = (err: any) => {
     console.warn('[DerivWebSocket] Socket onerror:', err);  // ← logs the ErrorEvent object, not the message
     finish(null);
   };
   ```
   - The error object itself is empty/generic. **You need to extract the real cause**.

2. **WebSocket connection fails silently → returns null → sync fails → 422 response**
   - Line 82 in `route.ts` calls `syncUserDerivAsync(userId, accessToken)`
   - Inside `hydrateDerivAccount()` (line 734), it calls `fetchDerivAccountProfile()` which returns `null`
   - Line 855-966 uses fallback logic, but if no valid account ID is found → returns `SYNC_FAILED`
   - This triggers the 422 on line 98 of `route.ts`

3. **Likely root causes:**
   - **Invalid/expired Deriv access token** (most likely)
   - **Deriv WebSocket endpoint unreachable** (network issue)
   - **CORS/TLS handshake failure** (unlikely but possible)
   - **App ID misconfiguration** (check `VITE_DERIV_APP_ID` or `DERIV_APP_ID`)

### How to Debug & Fix

#### Fix 1: Improve error logging (FAST)
```typescript
// File: src/services/deriv/oauthServerService.ts, line 197-199
ws.onerror = (err: any) => {
  // Extract meaningful error info
  const errorMsg = err?.message || err?.code || err?.reason || String(err);
  const errorCode = (err as any).code;
  console.warn('[DerivWebSocket] Socket onerror:', {
    message: errorMsg,
    code: errorCode,
    event: err?.type,
    wsUrl
  });
  finish(null);
};
```

#### Fix 2: Add retry with exponential backoff
```typescript
// File: src/services/deriv/oauthServerService.ts, line 94-128
export async function fetchDerivAccountProfile(
  token: string,
  appId: string = '1089',
  retries: number = 3
): Promise<DerivAccountProfileData | null> {
  // ... existing code ...
  
  for (let attempt = 1; attempt <= retries; attempt++) {
    for (const wsUrl of candidateEndpoints) {
      try {
        const profile = await attemptFetchProfileWithUrl(cleanToken, wsUrl);
        if (profile && profile.loginid) {
          return profile;
        }
      } catch (err: any) {
        console.warn(`[DerivOAuth] Profile fetch attempt ${attempt} on ${wsUrl} failed:`, {
          message: err?.message,
          url: wsUrl
        });
      }
    }
    if (attempt < retries) {
      // EXPONENTIAL BACKOFF: 500ms, 1000ms, 1500ms
      const delayMs = attempt * 500;
      console.log(`[DerivOAuth] Retrying in ${delayMs}ms...`);
      await new Promise((r) => setTimeout(r, delayMs));
    }
  }
  
  return null;
}
```

#### Fix 3: Validate access token before attempting sync (CRITICAL)
```typescript
// File: api/auth/deriv/sync/route.ts, line 80-82
// ADD BEFORE calling syncUserDerivAsync:

if (!accessToken || accessToken.trim().length === 0) {
  return jsonResponse(
    {
      success: false,
      error: 'Access token is empty or invalid',
      code: 'INVALID_TOKEN_FORMAT',
    },
    401
  );
}

// Add logging to track token validity
logger.info('[DerivSync] Attempting sync with token', { 
  userId, 
  tokenLength: accessToken.length,
  tokenPrefix: accessToken.substring(0, 10) + '***'
});

const metadata = await syncUserDerivAsync(userId, accessToken);
```

#### Fix 4: Check your environment variables
```bash
# These MUST be set in your Vercel environment:
echo $DERIV_APP_ID        # Should be: 1089 (or your app ID)
echo $VITE_DERIV_APP_ID   # Should be: 1089
echo $DERIV_CLIENT_SECRET # Should be populated
```

If using 1089 (default), verify it's a **valid Deriv app ID** registered at https://account.deriv.com/

---

## Issue #2: Prisma Client Not Initialized

### Root Cause
The warning appears in logs:
```
[WARN] 2026-08-21T07:05:03.154Z - PrismaClient instantiation notice: {
  detail: '@prisma/client did not initialize yet. Please run "prisma generate" and try to import it again.'
}
```

**Why this happens:**
1. **Prisma client is instantiated BEFORE `prisma generate` runs**
2. In serverless environments (Vercel), the build doesn't run `prisma generate`
3. When code imports `@prisma/client`, the `.prisma/` folder doesn't exist yet

### Fix: Update package.json build script

```json
{
  "scripts": {
    "build": "prisma generate && vite build && esbuild server.ts..."
    //                    ^^^^^ ADD THIS
  }
}
```

**Or as a separate prebuilt step:**
```bash
npm run db:generate  # runs: prisma generate --schema=./src/lib/db/schema.prisma
npm run build
```

### Ensure .prisma folder is included in deployment
Add to `.gitignore` WHITELIST:
```bash
# .gitignore
!.prisma/  # Force include Prisma generated files
```

Or ensure the Vercel build process runs:
```toml
# vercel.json
{
  "buildCommand": "npm run db:generate && npm run build",
  "outputDirectory": "dist"
}
```

---

## Recommended Action Plan (Priority Order)

### IMMEDIATE (Next 15 minutes)
1. ✅ **Check environment variables:**
   - Go to Vercel Dashboard → Settings → Environment Variables
   - Verify `DERIV_APP_ID` is set to **1089** (or your registered app ID)
   - Verify `DERIV_CLIENT_SECRET` exists
   - Verify `OAUTH_REDIRECT_URI` points to your production URL

2. ✅ **Verify Deriv API credentials:**
   - Log into https://account.deriv.com
   - Navigate to API tokens section
   - Create a fresh API token if none exist
   - Test the token with: `curl -X GET "https://api.deriv.com/v3/authorize" -H "Authorization: Bearer YOUR_TOKEN"`

3. ✅ **Add `prisma generate` to build:**
   - Edit `package.json`
   - Change build script to include `prisma generate && ...` at the start
   - Redeploy

### SHORT TERM (Next 1 hour)
4. 🔧 **Implement the error logging fix (Fix #1)** - adds visibility to actual WebSocket errors
5. 🔧 **Add token validation (Fix #3)** - prevents invalid tokens from reaching the sync pipeline
6. 🔧 **Add retry logic (Fix #2)** - improves resilience to temporary network failures

### DIAGNOSTIC
Check Vercel logs in real-time:
```bash
# Tail logs from Vercel CLI:
vercel logs --follow
```

Look for patterns:
- Are token errors appearing? → Issue is **expired/invalid tokens**
- Are network errors appearing? → Issue is **Deriv endpoint unreachable**
- Are both appearing? → Issue is **intermittent connectivity**

---

## Files to Modify

1. **`package.json`** - Add `prisma generate` to build
2. **`src/services/deriv/oauthServerService.ts`** - Improve error logging (lines 197-199)
3. **`api/auth/deriv/sync/route.ts`** - Add token validation (before line 82)
4. **`vercel.json`** (create if missing) - Ensure build command includes Prisma

---

## Verification
After applying fixes, redeploy and check:
```bash
# 1. No more Prisma warnings ✓
# 2. WebSocket errors include actual error messages in logs ✓
# 3. /api/auth/deriv/sync returns 200 with account data ✓
```

