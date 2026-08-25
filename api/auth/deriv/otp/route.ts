import { requestDerivOTP, getDerivConnectionRecord } from '../../../../src/services/deriv/oauthServerService.ts';
import { isValidDerivAccountId } from '../../../../src/services/deriv/syncStateMachine.ts';
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

    const cookieToken = cookies['deriv_access_token'] || cookies['deriv_oauth_token'];
    let token = body?.token || body?.apiToken || cookieToken;

    const cookieUserId = cookies['deriv_session_user_id'];
    const bodyUserId = body?.userId;
    const headerUserId = request.headers.get('x-user-id');
    const bodyAccountId = body?.accountId || body?.derivAccountId;

    const userId = bodyAccountId || cookieUserId || bodyUserId || headerUserId;

    if (!token && userId) {
      const record = getDerivConnectionRecord(userId);
      if (record?.accessToken) {
        token = record.accessToken;
      }
    }

    let accountId = bodyAccountId;
    if (!accountId && userId) {
      const record = getDerivConnectionRecord(userId);
      accountId = record?.derivAccountId || (isValidDerivAccountId(userId) ? userId : undefined);
    }

    if (!token || !accountId || !isValidDerivAccountId(accountId)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: 'Missing valid Deriv account ID or access token required for OTP generation.',
          code: 'INVALID_CREDENTIALS',
        }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    const otpResult = await requestDerivOTP(accountId, token);

    if (!otpResult.success || !otpResult.wsUrl) {
      return new Response(
        JSON.stringify({
          success: false,
          error: otpResult.error || 'Failed to acquire official Deriv WebSocket OTP URL.',
          code: 'OTP_FAILED',
        }),
        { status: 502, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        wsUrl: otpResult.wsUrl,
        accountId: otpResult.accountId,
        expiresInSeconds: otpResult.expiresInSeconds,
      }),
      { status: 200, headers: { 'Content-Type': 'application/json' } }
    );
  } catch (err: any) {
    logger.error('[DerivOTPRoute] Error:', { error: err?.message || String(err) });
    return new Response(
      JSON.stringify({ success: false, error: err?.message || 'Internal server error requesting OTP' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
