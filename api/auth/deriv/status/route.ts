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
    if (!record || record.connectionStatus === 'DISCONNECTED') {
      return new Response(
        JSON.stringify({
          success: true,
          data: {
            connected: false,
            connectionStatus: 'DISCONNECTED',
            accountType: 'real',
            currency: 'USD',
          },
        }),
        { status: 200, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const hasValidAcct = isValidDerivAccountId(record.derivAccountId);
    const connected = record.connectionStatus === 'CONNECTED' && hasValidAcct;

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          connected,
          derivAccountId: hasValidAcct ? record.derivAccountId : undefined,
          accountType: record.accountType || (record.derivAccountId?.startsWith('VR') ? 'demo' : 'real'),
          currency: record.currency || 'USD',
          balance: record.balance ?? 0,
          connectionStatus: record.connectionStatus,
          scopes: record.scopes || ['trade', 'read'],
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
