import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('[LOGOUT_ENDPOINT] Processing logout request...');

  const response = NextResponse.redirect(new URL('/', request.url));

  // Delete the session token cookie
  response.cookies.delete('appex_session_token');

  console.log('[LOGOUT_ENDPOINT] Session token cleared. User redirected to root.');
  return response;
}
