import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  console.log('[SESSION_ENDPOINT] Checking session status...');

  const token = request.cookies.get('appex_session_token')?.value;

  if (!token) {
    console.log('[SESSION_ENDPOINT] No session token found in cookies. Returning unauthenticated.');
    return NextResponse.json({
      success: true,
      data: {
        authenticated: false,
        user: null,
      }
    });
  }

  try {
    console.log('[SESSION_ENDPOINT] Validating session token...');
    
    // Placeholder for actual Deriv user data retrieval (e.g., calling Deriv's API or /userinfo endpoint)
    // Example:
    // const response = await fetch('https://api.deriv.com/userinfo', {
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    // const userData = await response.json();
    
    // For now, simulate real authenticated user data with the token reference
    const mockUser = {
      id: 'usr-deriv-998',
      email: 'verified.trader@deriv.com',
      name: 'Appex Quant Trader',
      role: 'trader',
      tokenPreview: `${token.substring(0, 6)}...`,
    };

    console.log('[SESSION_ENDPOINT] Session validated successfully.', { userId: mockUser.id });

    return NextResponse.json({
      success: true,
      data: {
        authenticated: true,
        user: mockUser,
      }
    });

  } catch (err: any) {
    console.error('[SESSION_ENDPOINT] Session validation failed:', err.message);
    return NextResponse.json({
      success: false,
      error: 'Session validation failed',
      data: {
        authenticated: false,
        user: null,
      }
    }, { status: 401 });
  }
}
