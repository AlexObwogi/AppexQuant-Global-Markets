import { syncUserDerivAsync } from '../../../../src/services/deriv/oauthServerService.ts';
import { isValidDerivAccountId } from '../../../../src/services/deriv/syncStateMachine.ts';
import { logAuditEvent } from '../../../../src/observability/audit.ts';
import { logger } from '../../../../src/observability/logger.ts';

function parseCookieHeader(cookieHeader: string | null): Record<string, string> {
  const cookies: Record<string, string> = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach((c) => {
    const parts = c.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const rawVal = parts.slice(1).join('=').trim();
      try {
        cookies[key] = decodeURIComponent(rawVal);
      } catch {
        cookies[key] = rawVal;
      }
    }
  });
  return cookies;
}

function jsonResponse(data: any, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

export async function POST(request: Request): Promise<Response> {
  try {
    const cookieHeader = request.headers.get('cookie');
    const cookies = parseCookieHeader(cookieHeader);

    let accessToken = cookies['deriv_access_token'];
    if (accessToken && accessToken.startsWith('usr-')) {
      accessToken = undefined;
    }

    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    if (!accessToken && body) {
      const candidate = body.apiToken || body.token || body.deriv_access_token;
      if (candidate && !candidate.startsWith('usr-')) {
        accessToken = candidate;
      }
    }

    const cookieUserId = cookies['deriv_session_user_id'];
    const bodyUserId = body.userId || body.loginid || body.accountId;
    const headerUserId = request.headers.get('x-user-id');
    const userId = cookieUserId || bodyUserId || headerUserId || 'usr-sync-session';

    if (!accessToken) {
      logAuditEvent('ACCOUNT_CONNECTION_FAILED', userId, {
        reason: 'MISSING_DERIV_ACCESS_TOKEN',
        endpoint: '/api/auth/deriv/sync',
      });

      return jsonResponse(
        {
          success: false,
          error: 'Missing Deriv access token in cookies or request. Please re-authenticate.',
          code: 'MISSING_TOKEN',
        },
        401
      );
    }

    // Synchronize account against Deriv API and upsert into database via Prisma
    const metadata = await syncUserDerivAsync(userId, accessToken);

    if (!metadata.connected || !metadata.derivAccountId || !isValidDerivAccountId(metadata.derivAccountId)) {
      logAuditEvent('DERIV_SYNC_FAILED', userId, {
        event: 'DERIV_SYNC_FAILED',
        status: metadata.connectionStatus || 'SYNC_FAILED',
        userId,
      });

      return jsonResponse(
        {
          success: false,
          error: 'Deriv account synchronization failed: unable to discover or verify active trading account from Deriv API.',
          code: 'SYNC_FAILED',
          metadata,
        },
        422
      );
    }

    const accountId = metadata.derivAccountId;
    const balance = metadata.balance ?? 0;
    const currency = metadata.currency || 'USD';
    const accountType = metadata.accountType || (accountId.startsWith('VR') ? 'demo' : 'real');

    logAuditEvent(
      'ACCOUNT_CONNECTED',
      userId,
      {
        event: 'DERIV_ACCOUNT_SYNCED',
        derivAccountId: accountId,
        balance,
        currency,
        accountType,
        status: metadata.connectionStatus,
      },
      accountId
    );

    logger.info('[DerivSyncAPI] Successfully synced and upserted account', { userId, accountId });

    return jsonResponse({
      success: true,
      accountId,
      balance,
      currency,
      accountType,
      connectionStatus: metadata.connectionStatus,
      data: metadata,
    });
  } catch (err: any) {
    logger.error('[DERIV_SYNC_ROUTE_ERROR]', { error: err?.message || String(err) });
    return jsonResponse(
      { success: false, error: err?.message || 'Failed to sync Deriv connection' },
      500
    );
  }
}

export async function GET(request: Request): Promise<Response> {
  return POST(request);
}
