/**
 * AppexQuant Markets Global - PKCE Cryptographic Security Utility
 * Re-exports centralized RFC 7636 PKCE functions from src/services/deriv/pkce.ts
 * and provides browser client-side encrypted storage utilities.
 */

export {
  base64UrlEncode,
  base64UrlDecode,
  generateCodeVerifier,
  generateCodeChallenge,
  deriveCodeChallenge,
  generatePKCE,
  generateState,
  encodeOAuthStateCookie,
  decodeOAuthStateCookie,
} from '../../services/deriv/pkce.ts';

import { base64UrlEncode, base64UrlDecode } from '../../services/deriv/pkce.ts';

/**
 * Client-Side Encrypted Cookie Manager (Web Crypto AES-GCM + Secure Attributes)
 */
const ENCRYPTION_SALT = 'APPEXQUANT_SECURE_AUTH_V1';

async function getEncryptionKey(salt: string): Promise<CryptoKey | null> {
  if (typeof window === 'undefined' || !window.crypto || !window.crypto.subtle) return null;
  const enc = new TextEncoder();
  const rawKeyMaterial = enc.encode(salt + window.location.hostname);
  const keyHash = await window.crypto.subtle.digest('SHA-256', rawKeyMaterial);
  return window.crypto.subtle.importKey(
    'raw',
    keyHash,
    { name: 'AES-GCM' },
    false,
    ['encrypt', 'decrypt']
  );
}

/**
 * Persists an encrypted value in a secure browser cookie
 */
export async function setEncryptedCookie(name: string, value: string, maxAgeSeconds: number = 86400 * 30): Promise<void> {
  if (typeof document === 'undefined') return;

  try {
    if (window.crypto && window.crypto.subtle) {
      const key = await getEncryptionKey(ENCRYPTION_SALT);
      if (key) {
        const iv = window.crypto.getRandomValues(new Uint8Array(12));
        const encoder = new TextEncoder();
        const encodedData = encoder.encode(value);

        const ciphertext = await window.crypto.subtle.encrypt(
          { name: 'AES-GCM', iv },
          key,
          encodedData
        );

        const combined = new Uint8Array(iv.length + ciphertext.byteLength);
        combined.set(iv, 0);
        combined.set(new Uint8Array(ciphertext), iv.length);

        const secureString = base64UrlEncode(combined);
        const isHttps = window.location.protocol === 'https:';
        const cookieStr = `${encodeURIComponent(name)}=${encodeURIComponent(secureString)}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${isHttps ? '; Secure' : ''}`;
        document.cookie = cookieStr;
        return;
      }
    }
  } catch (e) {
    console.warn('Cookie encryption failed, using obfuscated storage fallback:', e);
  }

  // Fallback standard cookie
  const isHttps = typeof window !== 'undefined' && window.location.protocol === 'https:';
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(btoa(value))}; Path=/; Max-Age=${maxAgeSeconds}; SameSite=Lax${isHttps ? '; Secure' : ''}`;
}

/**
 * Retrieves and decrypts a value from browser cookies
 */
export async function getEncryptedCookie(name: string): Promise<string | null> {
  if (typeof document === 'undefined') return null;

  const cookies = document.cookie.split(';');
  const prefix = `${encodeURIComponent(name)}=`;
  let cookieValue: string | null = null;

  for (let c of cookies) {
    c = c.trim();
    if (c.startsWith(prefix)) {
      cookieValue = decodeURIComponent(c.substring(prefix.length));
      break;
    }
  }

  if (!cookieValue) return null;

  try {
    if (window.crypto && window.crypto.subtle) {
      const combined = base64UrlDecode(cookieValue);
      if (combined.length > 12) {
        const iv = combined.slice(0, 12);
        const ciphertext = combined.slice(12);
        const key = await getEncryptionKey(ENCRYPTION_SALT);

        if (key) {
          const decrypted = await window.crypto.subtle.decrypt(
            { name: 'AES-GCM', iv },
            key,
            ciphertext
          );

          const decoder = new TextDecoder();
          return decoder.decode(decrypted);
        }
      }
    }
  } catch (e) {
    try {
      return atob(cookieValue);
    } catch {
      return cookieValue;
    }
  }

  return null;
}

/**
 * Removes a cookie
 */
export function removeCookie(name: string): void {
  if (typeof document === 'undefined') return;
  document.cookie = `${encodeURIComponent(name)}=; Path=/; Max-Age=0; SameSite=Lax`;
}
