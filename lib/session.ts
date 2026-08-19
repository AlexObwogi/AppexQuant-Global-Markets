import crypto from 'crypto';

export interface AppexUser {
  id: string;
  email: string;
  displayName: string;
  role: 'admin' | 'user';
  createdAt: string;
}

const SESSION_SECRET = process.env.SESSION_SECRET || 'appex_quant_secure_fallback_secret_7721';

/**
 * Signs user data into a cryptographically secure, tamper-proof opaque session token.
 */
export function encryptSessionToken(user: AppexUser): string {
  const payload = JSON.stringify(user);
  const key = crypto.scryptSync(SESSION_SECRET, 'salt', 32);
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  
  let encrypted = cipher.update(payload, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');
  
  // Return composite token containing payload data, encryption block, validation tag, and iv
  return Buffer.from(JSON.stringify({ 
    e: encrypted, 
    t: tag,
    iv: iv.toString('hex')
  }), 'utf8').toString('base64url');
}

/**
 * Decrypts and validates the opaque session token. Returns null if signatures mismatch.
 */
export function decryptSessionToken(token: string): AppexUser | null {
  try {
    const raw = Buffer.from(token, 'base64url').toString('utf8');
    const { e, t, iv } = JSON.parse(raw);
    
    const key = crypto.scryptSync(SESSION_SECRET, 'salt', 32);
    const decipher = crypto.createDecipheriv('aes-256-gcm', key, Buffer.from(iv, 'hex'));
    
    decipher.setAuthTag(Buffer.from(t, 'hex'));
    let decrypted = decipher.update(e, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    
    return JSON.parse(decrypted) as AppexUser;
  } catch (err) {
    console.warn('[SESSION_DECRYPT_WARNING] Failed to parse or validate opaque session token.');
    return null;
  }
}
