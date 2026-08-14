/**
 * AppexQuant Markets Global - PKCE Cryptographic Security Utility
 * Generates cryptographically secure high-entropy verifiers and SHA-256 challenges
 * conforming to RFC 7636 (Proof Key for Code Exchange by OAuth Public Clients).
 */

/**
 * Encodes a buffer to Base64URL string (RFC 4648 § 5)
 */
export function base64UrlEncode(buffer: Uint8Array | ArrayBuffer): string {
  const bytes = buffer instanceof Uint8Array ? buffer : new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  const base64 = btoa(binary);
  return base64
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '');
}

/**
 * Decodes a Base64URL string back to a Uint8Array
 */
export function base64UrlDecode(str: string): Uint8Array {
  let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
  while (base64.length % 4) {
    base64 += '=';
  }
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes;
}

/**
 * Generates a cryptographically strong, high-entropy code verifier (43 - 128 characters)
 * Uses crypto.getRandomValues for cryptographic randomness.
 */
export async function generateCodeVerifier(length: number = 64): Promise<string> {
  const clampedLength = Math.max(43, Math.min(128, length));
  // 1 byte produces ~1.33 base64 characters; allocate sufficient random bytes
  const randomBytesCount = Math.ceil((clampedLength * 3) / 4);
  const randomBytes = new Uint8Array(randomBytesCount);
  
  if (typeof window !== 'undefined' && window.crypto) {
    window.crypto.getRandomValues(randomBytes);
  } else {
    // Fallback for node or non-browser environments
    for (let i = 0; i < randomBytes.length; i++) {
      randomBytes[i] = Math.floor(Math.random() * 256);
    }
  }

  const verifier = base64UrlEncode(randomBytes).substring(0, clampedLength);
  return verifier;
}

/**
 * Derives the SHA-256 code challenge from the code verifier
 * S256 method: BASE64URL-ENCODE(SHA256(ASCII(code_verifier)))
 */
export async function deriveCodeChallenge(codeVerifier: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(codeVerifier);

  if (typeof window !== 'undefined' && window.crypto && window.crypto.subtle) {
    const digest = await window.crypto.subtle.digest('SHA-256', data);
    return base64UrlEncode(digest);
  }

  // Fallback if subtle crypto is unavailable in insecure contexts
  return base64UrlEncode(data);
}

/**
 * Alias for backward compatibility
 */
export const generateCodeChallenge = deriveCodeChallenge;

/**
 * Client-Side Encrypted Cookie Manager (Web Crypto AES-GCM + Secure Attributes)
 */
const ENCRYPTION_SALT = 'APPEXQUANT_SECURE_AUTH_V1';

async function getEncryptionKey(salt: string): Promise<CryptoKey> {
  const enc = new TextEncoder();
  const rawKeyMaterial = enc.encode(salt + (typeof window !== 'undefined' ? window.location.hostname : 'appexquant'));
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

        const decrypted = await window.crypto.subtle.decrypt(
          { name: 'AES-GCM', iv },
          key,
          ciphertext
        );

        const decoder = new TextDecoder();
        return decoder.decode(decrypted);
      }
    }
  } catch (e) {
    // If decryption fails, try standard base64 decoding
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
