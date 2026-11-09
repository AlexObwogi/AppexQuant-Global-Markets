/**
 * AppexQuant Markets Global - Environment Build Guard
 * Exits 1 if any configured VITE_DERIV_*_URL contains query string, hash, token, otp, verif, or session.
 * Never prints variable values.
 */

const varsToCheck = [
  'VITE_DERIV_DEPOSIT_URL',
  'VITE_DERIV_WITHDRAW_URL',
  'VITE_DERIV_TRANSFER_URL',
  'VITE_DERIV_P2P_URL',
];

let hasError = false;

for (const varName of varsToCheck) {
  const val = process.env[varName];
  if (val && typeof val === 'string') {
    const trimmed = val.trim();
    if (trimmed !== '') {
      if (
        trimmed.includes('?') ||
        trimmed.includes('#') ||
        /token|otp|verif|session/i.test(trimmed)
      ) {
        console.error(`[BuildGuard] Error: Environment variable ${varName} contains forbidden query strings, hashes, or sensitive substrings.`);
        hasError = true;
      }
    }
  }
}

if (hasError) {
  console.error('[BuildGuard] Build aborted due to environment security policy violation.');
  process.exit(1);
} else {
  console.log('[BuildGuard] Environment cashier URLs validated successfully.');
}
