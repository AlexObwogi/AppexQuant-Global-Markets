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

  // 2. Map DATABASE_URL from alternative environment variables
  if (!process.env.DATABASE_URL || !process.env.DATABASE_URL.trim()) {
    const fallbackDbUrl =
      process.env.POSTGRES_URL ||
      process.env.SUPABASE_DATABASE_URL ||
      process.env.DIRECT_URL ||
      process.env.PG_CONNECTION_STRING;
    if (fallbackDbUrl) {
      process.env.DATABASE_URL = fallbackDbUrl;
    }
  }

  // 3. Map SUPABASE_URL from alternative environment variables
  if (!process.env.SUPABASE_URL || !process.env.SUPABASE_URL.trim()) {
    const fallbackSupabaseUrl =
      process.env.VITE_SUPABASE_URL ||
      process.env.NEXT_PUBLIC_SUPABASE_URL ||
      process.env.REACT_APP_SUPABASE_URL;
    if (fallbackSupabaseUrl) {
      process.env.SUPABASE_URL = fallbackSupabaseUrl;
    }
  }

  // 4. Map SUPABASE_KEY from alternative environment variables
  if (!process.env.SUPABASE_KEY || !process.env.SUPABASE_KEY.trim()) {
    const fallbackSupabaseKey =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.SUPABASE_ANON_KEY ||
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    if (fallbackSupabaseKey) {
      process.env.SUPABASE_KEY = fallbackSupabaseKey;
    }
  }

  // 5. Map SUPABASE_ANON_KEY from alternative environment variables
  if (!process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_ANON_KEY.trim()) {
    const fallbackAnonKey =
      process.env.VITE_SUPABASE_ANON_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
      process.env.SUPABASE_KEY ||
      process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (fallbackAnonKey) {
      process.env.SUPABASE_ANON_KEY = fallbackAnonKey;
    }
  }

  return {
    DATABASE_URL: process.env.DATABASE_URL ? '[CONFIGURED]' : undefined,
    SUPABASE_URL: process.env.SUPABASE_URL,
    SUPABASE_KEY: process.env.SUPABASE_KEY ? '[CONFIGURED]' : undefined,
    SUPABASE_ANON_KEY: process.env.SUPABASE_ANON_KEY ? '[CONFIGURED]' : undefined,
  };
}

// Auto-run injection on module import
injectEnvironment();
