import { getUserDerivConnection, getDerivConnectionRecord } from '../../../../src/services/deriv/oauthServerService.ts';
import { isValidDerivAccountId } from '../../../../src/services/deriv/syncStateMachine.ts';

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

export async function GET(request: Request): Promise<Response> {
  try {
    const cookieHeader = request.headers.get('cookie');
    const cookies = parseCookieHeader(cookieHeader);
    const headerUserId = request.headers.get('x-user-id');
    const cookieUserId = cookies['deriv_session_user_id'];
    const userId = cookieUserId || headerUserId || 'usr-sync-session';

    const record = getUserDerivConnection(userId);
    const fullRecord = getDerivConnectionRecord(userId);
    if (!record || record.connectionStatus === 'DISCONNECTED') {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            authenticated: false,
            oauthAuthenticated: false,
            accountDiscovered: false,
            loginid: null,
            accountId: null,
            tokenValid: false,
            websocketConnected: false,
            synced: false,
            lastSync: null,
            lastError: null,
            connected: false,
            connectionStatus: 'DISCONNECTED',
            accountType: 'real',
            currency: 'USD',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const hasValidAcct = Boolean(record.derivAccountId && isValidDerivAccountId(record.derivAccountId));
    const tokenValid = Boolean(fullRecord?.accessToken && fullRecord.accessToken.length > 5);
    const connected = record.connectionStatus === 'CONNECTED' && hasValidAcct;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          authenticated: tokenValid,
          oauthAuthenticated: tokenValid,
          accountDiscovered: hasValidAcct,
          loginid: hasValidAcct ? record.derivAccountId : null,
          accountId: hasValidAcct ? record.derivAccountId : null,
          tokenValid,
          websocketConnected: connected,
          synced: Boolean(record.lastSyncedAt),
          lastSync: record.lastSyncedAt || null,
          lastError: record.connectionStatus === 'SYNC_FAILED' ? 'Account discovery failed' : null,
          connected,
          derivAccountId: hasValidAcct ? record.derivAccountId : undefined,
          accountType: record.accountType || (record.derivAccountId?.startsWith('VR') ? 'demo' : 'real'),
          currency: record.currency || 'USD',
          balance: record.balance ?? 0,
          connectionStatus: record.connectionStatus,
          scopes: record.scopes || ['trade', 'account_manage'],
          lastSyncedAt: record.lastSyncedAt,
        },
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to get status' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
