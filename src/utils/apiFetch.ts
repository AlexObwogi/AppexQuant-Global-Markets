import { useGlobalState } from '../state/GlobalStateContext.tsx';

let globalCsrfToken: string | null = null;

export function setGlobalCsrfToken(token: string | null) {
  globalCsrfToken = token;
}

export function getGlobalCsrfToken() {
  return globalCsrfToken;
}

export async function ensureCsrfToken(): Promise<string | null> {
  if (globalCsrfToken) return globalCsrfToken;
  try {
    const authMeRes = await fetch('/api/auth/me', { credentials: 'include' });
    const tokenHeader = authMeRes.headers.get('x-csrf-token');
    if (tokenHeader) {
      setGlobalCsrfToken(tokenHeader);
      return tokenHeader;
    } else if (authMeRes.ok) {
      const authJson = await authMeRes.json().catch(() => null);
      if (authJson && authJson.data && authJson.data.csrfToken) {
        setGlobalCsrfToken(authJson.data.csrfToken);
        return authJson.data.csrfToken;
      }
    }
  } catch {
    // Ignore background auth fetch errors
  }
  return globalCsrfToken;
}

/**
 * Universal apiFetch utility for making secure /api/* calls.
 * Automatically injects session credentials, RBAC headers, and X-CSRF-Token headers.
 */
export async function apiFetch(
  input: RequestInfo | URL,
  init?: RequestInit,
  userState?: { id?: string; email?: string; role?: string; isElevated?: boolean }
): Promise<Response> {
  const urlString = typeof input === 'string' ? input : (input instanceof URL ? input.toString() : (input as Request).url);
  const method = (init?.method || 'GET').toUpperCase();

  // Only inject headers for local API endpoints
  if (urlString.startsWith('/api/')) {
    // If performing a write operation and globalCsrfToken is not yet populated, fetch session token first
    if (['POST', 'PUT', 'DELETE', 'PATCH'].includes(method) && !globalCsrfToken) {
      await ensureCsrfToken();
    }

    const customHeaders: Record<string, string> = {
      'x-user-role': userState?.role || 'USER',
      'x-user-id': userState?.id || 'usr-default-001',
      'x-user-email': userState?.email || 'trader@appexquant.global',
      'x-session-elevated': userState?.isElevated ? 'true' : 'false',
    };

    if (globalCsrfToken) {
      customHeaders['x-csrf-token'] = globalCsrfToken;
    }

    let newInit: RequestInit = {
      ...init,
      credentials: 'include', // Ensure session cookies are always sent securely
    };

    if (init?.headers) {
      if (init.headers instanceof Headers) {
        const h = new Headers(init.headers);
        Object.entries(customHeaders).forEach(([k, v]) => h.set(k, v));
        newInit.headers = h;
      } else if (Array.isArray(init.headers)) {
        const h = [...init.headers];
        Object.entries(customHeaders).forEach(([k, v]) => h.push([k, v]));
        newInit.headers = h;
      } else {
        newInit.headers = {
          ...init.headers,
          ...customHeaders,
        } as Record<string, string>;
      }
    } else {
      newInit.headers = customHeaders;
    }

    let res: Response;
    try {
      res = await fetch(input, newInit);
    } catch (networkErr: any) {
      const errorResponseBody = JSON.stringify({
        success: false,
        error: `Network request to ${urlString} unavailable (${networkErr?.message || 'Failed to fetch'}).`,
        code: 'NETWORK_FETCH_FAILED',
      });
      return new Response(errorResponseBody, {
        status: 503,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    // 1. Capture CSRF token from response headers if present
    const headerCsrf = res.headers.get('x-csrf-token');
    if (headerCsrf) {
      setGlobalCsrfToken(headerCsrf);
    }

    // 2. Safely capture CSRF token from JSON body if present
    if (res.ok) {
      try {
        const clonedRes = res.clone();
        const json = await clonedRes.json();
        if (json && json.success && json.csrfToken) {
          setGlobalCsrfToken(json.csrfToken);
        } else if (json && json.success && json.data && json.data.csrfToken) {
          setGlobalCsrfToken(json.data.csrfToken);
        }
      } catch {
        // Response was not JSON, ignore
      }
    }

    // 3. Prevent HTML responses (e.g. 404/500 Vite fallback pages) from causing JSON syntax errors
    const contentType = res.headers.get('content-type') || '';
    if (!contentType.includes('application/json') && !res.ok) {
      const errorResponseBody = JSON.stringify({
        success: false,
        error: `Server endpoint returned non-JSON response (HTTP ${res.status}). Operation failed cleanly.`,
        code: 'SERVER_NON_JSON_RESPONSE',
      });
      return new Response(errorResponseBody, {
        status: res.status,
        headers: { 'Content-Type': 'application/json' },
      });
    }

    return res;
  }

  try {
    return await fetch(input, init);
  } catch (networkErr: any) {
    const errorResponseBody = JSON.stringify({
      success: false,
      error: `Network request failed (${networkErr?.message || 'Failed to fetch'}).`,
      code: 'NETWORK_FETCH_FAILED',
    });
    return new Response(errorResponseBody, {
      status: 503,
      headers: { 'Content-Type': 'application/json' },
    });
  }
}

/**
 * Custom React Hook that intercepts fetch calls to local API endpoints (/api/*)
 * and automatically injects authentication and RBAC state headers.
 */
export function useApiFetch() {
  const { state } = useGlobalState();

  return (input: RequestInfo | URL, init?: RequestInit): Promise<Response> => {
    return apiFetch(input, init, {
      id: state.user?.id,
      email: state.user?.email,
      role: state.user?.role,
      isElevated: state.session?.isElevated,
    });
  };
}
