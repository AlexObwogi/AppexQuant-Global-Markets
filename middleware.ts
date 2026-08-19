import { NextRequest, NextResponse } from 'next/server';

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  console.log(`[MIDDLEWARE] Intercepted routing request for: ${pathname}`);

  // 1. Exclude public static assets and auth flows
  const publicRoutes = [
    '/api/auth/deriv/login',
    '/api/auth/deriv/signup',
    '/api/auth/deriv/callback',
    '/api/auth/session',
  ];

  const isPublicRoute = publicRoutes.some((route) => pathname.startsWith(route));

  if (isPublicRoute) {
    console.log(`[MIDDLEWARE] Exempt public/auth route detected: ${pathname}. Bypassing authentication check.`);
    return NextResponse.next();
  }

  // 2. Validate active session token
  const sessionToken = request.cookies.get('appex_session_token')?.value;

  // 3. Protect all dynamic api endpoints and admin dashboards
  const isProtectedRoute = pathname.startsWith('/api/') || pathname.startsWith('/dashboard');

  if (isProtectedRoute && !sessionToken) {
    console.warn(`[MIDDLEWARE] Unauthenticated access attempt on protected path: ${pathname}. Redirecting.`);
    
    if (pathname.startsWith('/api/')) {
      return NextResponse.json({ success: false, error: 'Unauthorized session' }, { status: 401 });
    }
    
    // Redirect dashboard user to standard authorization trigger path
    return NextResponse.redirect(new URL('/api/auth/deriv/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Catch all routes excluding default favicon / static paths
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
