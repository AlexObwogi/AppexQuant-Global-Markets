/**
 * AppExQuant Markets Global - Serverless OAuth Callback Route (JavaScript Version)
 */

import crypto from 'crypto';
import { handleDerivOAuthCallback } from '../../../services/deriv/oauthServerService';

export default async function handler(req, res) {
  const isHttps =
    req.headers['x-forwarded-proto'] === 'https' ||
    Boolean(req.socket?.encrypted) ||
    process.env.APP_ENV === 'production';
  const secureFlag = isHttps ? '; Secure' : '';

  try {
    const code = req.query.code;
    const state = req.query.state;
    const error = req.query.error;
    const errorDescription = req.query.error_description;

    const cookieHeader = req.headers.cookie || '';
    const cookies = {};
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.trim().split('=');
      if (parts.length === 2) {
        cookies[parts[0]] = decodeURIComponent(parts[1]);
      }
    });

    const cookieState = cookies['deriv_oauth_state'];
    const requestHost = req.headers.host || 'localhost:3000';
    const requestProtocol = isHttps ? 'https' : 'http';

    const result = await handleDerivOAuthCallback({
      code,
      state,
      cookieState,
      error,
      errorDescription: errorDescription || (error ? 'Authentication failed' : undefined),
      requestHost,
      requestProtocol,
    });

    res.setHeader('Set-Cookie', [
      `deriv_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`,
    ]);

    if (!result.success) {
      const errorMessage = result.errorMessage || 'Authentication failed';
      if ((req.headers.accept || '').includes('application/json')) {
        return res.status(400).json({
          success: false,
          error: {
            message: errorMessage,
            code: 'AUTH_FAILED',
          },
        });
      }
      return res.redirect(`/?auth_error=1&message=${encodeURIComponent(errorMessage)}`);
    }

    const rawAcct = result.rawAccountDetails?.derivAccountId || result.userId;
    if (!rawAcct) {
      throw new Error('Deriv account identifier could not be resolved from callback.');
    }
    const accountType = result.rawAccountDetails?.accountType || (rawAcct.startsWith('VR') ? 'demo' : 'real');
    const currency = result.rawAccountDetails?.currency || 'USD';
    const realEmail = result.rawAccountDetails?.email || result.connectionRecord?.email || '';
    const fullName = result.rawAccountDetails?.fullName || result.connectionRecord?.fullName;
    const balance = result.rawAccountDetails?.balance ?? result.connectionRecord?.balance ?? 0;
    const csrfToken = crypto.randomBytes(32).toString('hex');

    const sessionPayload = {
      userId: rawAcct,
      email: realEmail,
      fullName,
      balance,
      role: (realEmail === 'obwogialex728@gmail.com' || rawAcct.toLowerCase().includes('admin')) ? 'ADMIN' : 'USER',
      isElevated: false,
      elevatedUntil: null,
      csrfToken,
      derivAccountId: rawAcct,
      accountType,
      currency,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    const sessionPayloadJson = JSON.stringify(sessionPayload);
    const sessionSecret = process.env.SESSION_SECRET;
    if (!sessionSecret) throw new Error('SESSION_SECRET environment variable is missing');
    const signature = crypto.createHmac('sha256', sessionSecret).update(sessionPayloadJson).digest('base64url');
    const sessionToken = `${Buffer.from(sessionPayloadJson).toString('base64url')}.${signature}`;

    res.setHeader('Set-Cookie', [
      `deriv_session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${secureFlag}`,
      `deriv_user_loginid=${rawAcct}; Path=/; SameSite=Lax; Max-Age=${7 * 24 * 60 * 60}${secureFlag}`,
    ]);

    if ((req.headers.accept || '').includes('application/json') || req.query.json === 'true') {
      return res.status(200).json({
        success: true,
        data: {
          sessionToken,
          user: sessionPayload,
        },
      });
    }

    return res.redirect(`/dashboard?auth=success&account=${rawAcct}`);
  } catch (err) {
    const errorMsg = err?.message || 'OAuth callback processing failed';
    console.error('[DERIV_OAUTH_SERVERLESS_CALLBACK_ERROR]', {
      message: errorMsg,
      timestamp: new Date().toISOString(),
    });

    return res.redirect(`/?auth_error=1&message=${encodeURIComponent(`OAuth Callback Error: ${errorMsg}`)}`);
  }
}
