/**
 * AppExQuant Markets Global - Serverless OAuth Callback Route
 * Handles Deriv OAuth 2.0 PKCE Authorization Code Exchange & Session Establishment
 */

import type { VercelRequest, VercelResponse } from '@vercel/node';
import crypto from 'crypto';
import { handleDerivOAuthCallback } from '../../../src/services/deriv/oauthServerService.js';

export default async function handler(req: VercelRequest, res: VercelResponse) {
  const isHttps =
    req.headers['x-forwarded-proto'] === 'https' ||
    Boolean((req as any).socket?.encrypted) ||
    process.env.NODE_ENV === 'production';
  const secureFlag = isHttps ? '; Secure' : '';

  try {
    const code = req.query.code as string | undefined;
    const state = req.query.state as string | undefined;
    const error = req.query.error as string | undefined;
    const errorDescription = req.query.error_description as string | undefined;

    // Parse cookies from request headers
    const cookieHeader = req.headers.cookie || '';
    const cookies: Record<string, string> = {};
    cookieHeader.split(';').forEach((cookie) => {
      const parts = cookie.trim().split('=');
      if (parts.length === 2) {
        cookies[parts[0]] = decodeURIComponent(parts[1]);
      }
    });

    const cookieState = cookies['deriv_oauth_state'];
    const requestHost = req.headers.host || 'localhost:3000';
    const requestProtocol = isHttps ? 'https' : 'http';

    // Execute server-side OAuth callback verification, PKCE code exchange, and user synchronization
    const result = await handleDerivOAuthCallback({
      code,
      state,
      cookieState,
      error,
      errorDescription: errorDescription || (error ? 'Authentication failed' : undefined),
      requestHost,
      requestProtocol,
    });

    // Clear temporary OAuth state cookie regardless of outcome
    res.setHeader('Set-Cookie', [
      `deriv_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`,
    ]);

    if (!result.success) {
      const errorMessage = result.errorMessage || 'Authentication failed';
      if (req.headers.accept?.includes('application/json')) {
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

    // Establish secure session token
    const rawAcct = result.rawAccountDetails?.derivAccountId || result.userId || 'CR-TRADER';
    const accountType = result.rawAccountDetails?.accountType || (rawAcct.startsWith('VR') ? 'demo' : 'real');
    const currency = result.rawAccountDetails?.currency || 'USD';
    const csrfToken = crypto.randomBytes(32).toString('hex');

    const sessionPayload = {
      userId: rawAcct,
      email: `${rawAcct.toLowerCase()}@deriv.trader`,
      role: rawAcct.toLowerCase().includes('admin') ? 'ADMIN' : 'USER',
      isElevated: false,
      elevatedUntil: null,
      csrfToken,
      derivAccountId: rawAcct,
      accountType,
      currency,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    };

    // Simple HMAC signature for session token
    const sessionPayloadJson = JSON.stringify(sessionPayload);
    const sessionSecret = process.env.SESSION_SECRET || process.env.JWT_SECRET || 'appexquant-session-secret-2026';
    const signature = crypto.createHmac('sha256', sessionSecret).update(sessionPayloadJson).digest('base64url');
    const sessionToken = `${Buffer.from(sessionPayloadJson).toString('base64url')}.${signature}`;

    // Set session cookie (HttpOnly, Lax/None, Secure)
    res.setHeader('Set-Cookie', [
      `session_token=${sessionToken}; Path=/; HttpOnly; SameSite=Lax; Max-Age=604800${secureFlag}`,
      `deriv_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`,
    ]);

    if (req.headers.accept?.includes('application/json')) {
      return res.status(200).json({
        success: true,
        data: {
          sessionToken,
          user: {
            userId: rawAcct,
            derivAccountId: rawAcct,
            accountType,
            currency,
            email: sessionPayload.email,
            role: sessionPayload.role,
          },
          csrfToken,
          destination: result.destination || '/dashboard',
        },
      });
    }

    const safeDestination = result.destination && result.destination.startsWith('/') ? result.destination : '/dashboard';
    return res.redirect(safeDestination);
  } catch (err: any) {
    res.setHeader('Set-Cookie', `deriv_oauth_state=; Path=/; HttpOnly; SameSite=Lax; Max-Age=0${secureFlag}`);
    const genericMessage = 'Authentication failed';
    if (req.headers.accept?.includes('application/json')) {
      return res.status(500).json({
        success: false,
        error: {
          message: genericMessage,
          code: 'AUTH_FAILED',
        },
      });
    }
    return res.redirect(`/?auth_error=1&message=${encodeURIComponent(genericMessage)}`);
  }
}
