import { NextResponse } from 'next/server';
import { syncUserDerivAsync, isValidDerivAccountId } from '../../../../src/services/deriv/oauthServerService.ts';
import { logAuditEvent } from '../../../../src/observability/audit.ts';

function parseCookieHeader(cookieHeader) {
  const cookies = {};
  if (!cookieHeader) return cookies;
  cookieHeader.split(';').forEach(c => {
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

export async function POST(request) {
  try {
    const cookieHeader = request.headers.get('cookie');
    const cookies = parseCookieHeader(cookieHeader);

    let accessToken = cookies['deriv_access_token'];

    let body = {};
    try {
      body = await request.json();
    } catch {}

    if (!accessToken && body) {
      accessToken = body.apiToken || body.token || body.deriv_access_token;
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

      return NextResponse.json(
        {
          success: false,
          error: 'Missing Deriv access token. Please re-authenticate.',
          code: 'MISSING_TOKEN',
        },
        { status: 422 }
      );
    }

    const metadata = await syncUserDerivAsync(userId, accessToken);

    if (!metadata.connected || !metadata.derivAccountId || !isValidDerivAccountId(metadata.derivAccountId)) {
      logAuditEvent('DERIV_SYNC_FAILED', userId, {
        event: 'DERIV_SYNC_FAILED',
        status: metadata.connectionStatus || 'SYNC_FAILED',
        userId,
      });

      return NextResponse.json(
        {
          success: false,
          error: 'Deriv account synchronization failed: unable to discover or verify active trading account.',
          code: 'SYNC_FAILED',
          metadata,
        },
        { status: 422 }
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

    return NextResponse.json({
      success: true,
      accountId,
      balance,
      currency,
      accountType,
      connectionStatus: metadata.connectionStatus,
    });
  } catch (err) {
    console.error('[DERIV_SYNC_ROUTE_ERROR]', err);
    return NextResponse.json(
      { success: false, error: err?.message || 'Failed to sync Deriv connection' },
      { status: 500 }
    );
  }
}

export async function GET(request) {
  return POST(request);
}
