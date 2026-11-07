/**
 * AppexQuant Markets Global - Deriv Link Configuration & Handoff Validator
 * Validates allowed cashier destination URLs over HTTPS strictly targeting deriv.com subdomains.
 * Strips query strings, hashes, and rejects user-specific or sensitive paths.
 */

const warnTracker = new Set<string>();

export function validateDerivUrl(rawUrl: string | undefined, kind: string): string | null {
  if (!rawUrl || typeof rawUrl !== 'string' || !rawUrl.trim()) {
    if (!warnTracker.has(kind)) {
      warnTracker.add(kind);
      console.warn(`[DerivLinks] VITE_DERIV_${kind.toUpperCase()}_URL is unset. Falling back to default Deriv portal.`);
    }
    return null;
  }

  try {
    const parsed = new URL(rawUrl.trim());
    const isHttps = parsed.protocol === 'https:';
    const isDerivHost = parsed.hostname === 'deriv.com' || parsed.hostname.endsWith('.deriv.com');

    if (!isHttps || !isDerivHost) {
      if (!warnTracker.has(`${kind}-host`)) {
        warnTracker.add(`${kind}-host`);
        console.warn(`[DerivLinks] Refusing disallowed or non-HTTPS Deriv URL.`);
      }
      return null;
    }

    // ALWAYS drop query string and hash
    parsed.search = '';
    parsed.hash = '';

    // Inspect path segments
    const segments = parsed.pathname.split('/').filter(Boolean);
    for (const seg of segments) {
      if (
        /[0-9a-f]{16,}/i.test(seg) ||
        seg.length > 24 ||
        /(token|otp|verif|session|code)/i.test(seg)
      ) {
        if (!warnTracker.has(`${kind}-path`)) {
          warnTracker.add(`${kind}-path`);
          console.warn(`[DerivLinks] Refusing URL with sensitive or user-specific path segment.`);
        }
        return null;
      }
    }

    return parsed.toString();
  } catch (err) {
    if (!warnTracker.has(`${kind}-parse`)) {
      warnTracker.add(`${kind}-parse`);
      console.warn(`[DerivLinks] Invalid URL format encountered.`);
    }
    return null;
  }
}

export function getCashierUrl(kind: 'deposit' | 'withdraw' | 'transfer' | 'p2p' | 'home' = 'home'): string {
  if (kind === 'home') {
    return 'https://home.deriv.com';
  }

  const envMap: Record<string, string | undefined> = {
    deposit: (import.meta as any).env?.VITE_DERIV_DEPOSIT_URL,
    withdraw: (import.meta as any).env?.VITE_DERIV_WITHDRAW_URL,
    transfer: (import.meta as any).env?.VITE_DERIV_TRANSFER_URL,
    p2p: (import.meta as any).env?.VITE_DERIV_P2P_URL,
  };

  const rawEnv = envMap[kind];
  const validated = validateDerivUrl(rawEnv, kind);

  if (validated) {
    return validated;
  }

  return 'https://home.deriv.com';
}
