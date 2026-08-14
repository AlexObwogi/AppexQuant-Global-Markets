/**
 * AppExQuant Markets Global - Server-Side OAuth PKCE & CSRF Utilities
 * Implementation using standard Web Crypto API (SubtleCrypto)
 * RFC 7636 PKCE compliant
 */

/**
 * Base64URL encode a buffer / Uint8Array according to RFC 7636 / RFC 4648
 */
export function base64UrlEncode(buffer: ArrayBuffer | Uint8Array): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  
  // Convert binary string to standard base64 then transform to base64url
  const base64 = typeof btoa === 'function' 
    ? btoa(binary) 
    : Buffer.from(bytes).toString('base64');

  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Safely get the Web Crypto SubtleCrypto instance in Node, Edge, or Browser runtimes
 */
function getSubtleCrypto(): SubtleCrypto {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.subtle) {
    return globalThis.crypto.subtle;
  }
  
  // Fallback for older Node environments
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cryptoModule = require('crypto');
    if (cryptoModule.webcrypto?.subtle) {
      return cryptoModule.webcrypto.subtle;
    }
  } catch {
    // ignore
  }

  throw new Error('SubtleCrypto is not available in the current runtime environment.');
}

/**
 * Safely get getRandomValues from Web Crypto
 */
function getRandomValues(array: Uint8Array): Uint8Array {
  if (typeof globalThis !== 'undefined' && globalThis.crypto?.getRandomValues) {
    return globalThis.crypto.getRandomValues(array);
  }
  
  try {
    // eslint-disable-next-line @typescript-eslint/no-var-requires
    const cryptoModule = require('crypto');
    if (cryptoModule.randomFillSync) {
      return cryptoModule.randomFillSync(array);
    }
  } catch {
    // ignore
  }

  throw new Error('Web Crypto getRandomValues is not available in the current runtime environment.');
}

/**
 * Generate a cryptographically secure PKCE Code Verifier string (RFC 7636)
 * @param byteLength Number of random bytes (default: 32 bytes -> 43 characters base64url)
 */
export function generateCodeVerifier(byteLength: number = 32): string {
  // Clamped to ensure valid length between 43 and 128 characters
  const safeByteLength = Math.max(32, Math.min(byteLength, 96));
  const randomBytes = new Uint8Array(safeByteLength);
  getRandomValues(randomBytes);
  return base64UrlEncode(randomBytes);
}

/**
 * Generate a PKCE S256 Code Challenge from a Code Verifier using subtle-crypto
 * @param verifier The PKCE code verifier string
 */
export async function generateCodeChallenge(verifier: string): Promise<string> {
  const subtle = getSubtleCrypto();
  const encoder = new TextEncoder();
  const data = encoder.encode(verifier);
  const digest = await subtle.digest('SHA-256', data);
  return base64UrlEncode(digest);
}

/**
 * Generate a complete PKCE keypair (codeVerifier, codeChallenge, and method)
 */
export async function generatePKCE(byteLength: number = 32): Promise<{
  codeVerifier: string;
  codeChallenge: string;
  codeChallengeMethod: 'S256';
}> {
  const codeVerifier = generateCodeVerifier(byteLength);
  const codeChallenge = await generateCodeChallenge(codeVerifier);
  return {
    codeVerifier,
    codeChallenge,
    codeChallengeMethod: 'S256',
  };
}

/**
 * Generate a cryptographically secure random state string for OAuth CSRF protection
 * @param byteLength Number of random bytes (default: 24 bytes -> 32 characters base64url)
 */
export function generateState(byteLength: number = 24): string {
  const randomBytes = new Uint8Array(byteLength);
  getRandomValues(randomBytes);
  return base64UrlEncode(randomBytes);
}
