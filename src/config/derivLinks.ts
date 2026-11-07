/**
 * AppexQuant Markets Global - Deriv Link Configuration & Handoff Validator
 * Validates allowed cashier destination URLs over HTTPS strictly targeting deriv.com subdomains.
 */

const warnTracker = new Set<string>();

function validateDerivUrl(rawUrl: string | undefined, kind: string): string | null {
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

    if (isHttps && isDerivHost) {
      return parsed.toString();
    } else {
      console.error(`[DerivLinks] Refusing disallowed or non-HTTPS Deriv URL for ${kind}: ${rawUrl}`);
      return null;
    }
  } catch (err) {
    console.error(`[DerivLinks] Invalid URL format for ${kind}: ${rawUrl}`);
    return null;
  }
}

export function getCashierUrl(kind: 'deposit' | 'withdraw' | 'transfer' | 'p2p' | 'home' = 'home'): string {
  const envMap: Record<string, string | undefined> = {
    deposit: (import.meta as any).env?.VITE_DERIV_DEPOSIT_URL,
    withdraw: (import.meta as any).env?.VITE_DERIV_WITHDRAW_URL,
    transfer: (import.meta as any).env?.VITE_DERIV_TRANSFER_URL,
    p2p: (import.meta as any).env?.VITE_DERIV_P2P_URL,
    home: 'https://home.deriv.com',
  };

  if (kind === 'home') {
    return 'https://home.deriv.com';
  }

  const rawEnv = envMap[kind];
  const validated = validateDerivUrl(rawEnv, kind);

  if (validated) {
    return validated;
  }

  return 'https://home.deriv.com';
}
