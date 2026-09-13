/**
 * AppexQuant Markets Global - Environment Injection & Mapping Utility
 * Ensures all required production environment variables (DATABASE_URL, SUPABASE_URL,
 * SUPABASE_KEY, SUPABASE_ANON_KEY) are correctly mapped and normalized before server startup.
 */

import fs from 'fs';
import path from 'path';

export function injectEnvironment() {
  // 1. Optionally parse local .env file if process.env values are missing
  try {
    const envPath = path.join(process.cwd(), '.env');
    if (fs.existsSync(envPath)) {
      const envContent = fs.readFileSync(envPath, 'utf8');
      envContent.split('\n').forEach((line) => {
        const trimmed = line.trim();
        if (trimmed && !trimmed.startsWith('#')) {
          const eqIdx = trimmed.indexOf('=');
          if (eqIdx > 0) {
            const key = trimmed.substring(0, eqIdx).trim();
            let val = trimmed.substring(eqIdx + 1).trim();
            if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
              val = val.substring(1, val.length - 1);
            }
            if (!process.env[key] && val) {
              process.env[key] = val;
            }
          }
        }
      });
    }
  } catch (err) {
    // Non-blocking .env parse notice
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL ? '[CONFIGURED]' : undefined,
  };
}

// Auto-run injection on module import
injectEnvironment();
