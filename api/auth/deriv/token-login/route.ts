import { syncUserDerivAsync } from '../../../../src/services/deriv/oauthServerService.ts';
import { isValidDerivAccountId } from '../../../../src/services/deriv/syncStateMachine.ts';
import { logAuditEvent } from '../../../../src/observability/audit.ts';
import { logger } from '../../../../src/observability/logger.ts';
import crypto from 'crypto';

export async function POST(request: Request): Promise<Response> {
  try {
    let body: any = {};
    try {
      body = await request.json();
    } catch {}

    const apiToken = body?.apiToken || body?.token;
    if (!apiToken || typeof apiToken !== 'string') {
      return new Response(
        JSON.stringify({ success: false, error: 'A valid Deriv API token is required.' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const sessionUserId = `usr-${crypto.randomBytes(6).toString('hex')}`;
    const metadata = await syncUserDerivAsync(sessionUserId, apiToken.trim());

    if (!metadata.connected || !metadata.derivAccountId || !isValidDerivAccountId(metadata.derivAccountId)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Invalid or expired Deriv API token. Could not authorize account.',
        }),
        { status: 401, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const accountId = metadata.derivAccountId;
    const balance = metadata.balance ?? 0;
    const currency = metadata.currency || 'USD';
    const accountType = metadata.accountType || (accountId.startsWith('VR') ? 'demo' : 'real');

    logAuditEvent(
      'ACCOUNT_CONNECTED',
      accountId,
      { event: 'TOKEN_LOGIN_SUCCESS', derivAccountId: accountId, balance, currency, accountType },
      accountId
    );

    const headers = new Headers({ 'Content-Type': 'application/json' });
    const isHttps = request.url.startsWith('https');
    const cookieSameSite = isHttps ? 'None' : 'Lax';
    const secureFlag = isHttps || process.env.NODE_ENV === 'production' ? '; Secure' : '';

    const cookies = [
      `deriv_access_token=${encodeURIComponent(apiToken.trim())}; Path=/; HttpOnly; SameSite=${cookieSameSite}${secureFlag}; Max-Age=86400`,
      `deriv_session_user_id=${encodeURIComponent(accountId)}; Path=/; HttpOnly; SameSite=${cookieSameSite}${secureFlag}; Max-Age=86400`,
    ];
    cookies.forEach((c) => headers.append('Set-Cookie', c));

    return new Response(
      JSON.stringify({
        success: true,
        data: {
          connected: true,
          derivAccountId: accountId,
          accountId,
          balance,
          currency,
          accountType,
          connectionStatus: 'CONNECTED',
          scopes: ['read', 'trade'],
        },
      }),
      { status: 200, headers }
    );
  } catch (err: any) {
    logger.error('[DerivTokenLoginRoute] Error:', { error: err?.message || String(err) });
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Token login failed' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
