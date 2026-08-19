import crypto from 'crypto';

/**
 * Generates a high-entropy cryptographically secure random string.
 * This is used for generating both the PKCE 'code_verifier' and the CSRF 'state'.
 * @param length The string length (minimum 43 characters for code verifiers)
 */
export function generateRandomString(length: number = 43): string {
  return crypto
    .randomBytes(length)
    .toString('base64url')
    .substring(0, length);
}

/**
 * Computes the SHA-256 hash of a code verifier and encodes it in base64url format.
 * This represents the 'code_challenge' parameter for PKCE S256 verification.
 * @param verifier The original high-entropy code_verifier
 */
export function generateCodeChallenge(verifier: string): string {
  return crypto
    .createHash('sha256')
    .update(verifier)
    .digest('base64url');
}
