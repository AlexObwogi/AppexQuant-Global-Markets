import { disconnectUserDeriv, getDerivConnectionRecord } from '../../../../src/services/deriv/oauthServerService.ts';
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

export async function POST(request: Request): Promise<Response> {
  try {
    const cookieHeader = request.headers.get('cookie');
    const cookies = parseCookieHeader(cookieHeader);
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const cookieUserId = cookies['deriv_session_user_id'];
    const bodyUserId = body?.userId || body?.accountId;
    const headerUserId = request.headers.get('x-user-id');
    const userId = cookieUserId || bodyUserId || headerUserId;

    if (!userId) {
      return new Response(
        JSON.stringify({ success: false, error: 'Authentication required to disconnect.' }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const record = getDerivConnectionRecord(userId);
    const realAccountId = record?.derivAccountId || (isValidDerivAccountId(userId) ? userId : undefined);

    const success = disconnectUserDeriv(userId);

    logAuditEvent(
      'ACCOUNT_DISCONNECTED',
      userId,
      { event: 'DERIV_ACCOUNT_DISCONNECTED', accountId: realAccountId },
      realAccountId
    );
    logger.info('[DerivDisconnect] Disconnected Deriv account', { userId, accountId: realAccountId });

    const headers = new Headers({ 'Content-Type': 'application/json' });
    const cookiesToClear = [
      'session_token=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0',
      'deriv_oauth_state=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0',
      'deriv_oauth_token=; Path=/; SameSite=None; Secure; Max-Age=0',
      'deriv_access_token=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0',
      'deriv_session_user_id=; Path=/; HttpOnly; SameSite=None; Secure; Max-Age=0',
    ];
    cookiesToClear.forEach((c) => headers.append('Set-Cookie', c));

    return new Response(
      JSON.stringify({
        success: true,
        disconnected: success,
        accountId: realAccountId,
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    logger.error('[DerivDisconnectRoute] Disconnect error:', { error: err?.message || String(err) });
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Failed to disconnect account' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
