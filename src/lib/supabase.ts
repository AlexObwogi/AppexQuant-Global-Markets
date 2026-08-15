/**
 * AppexQuant Markets Global - Supabase Server-Side Client & Persistence Module
 * Provides unified, secure database persistence for user identity, Deriv OAuth sessions,
 * and application telemetry. Never exposes service role credentials to the client.
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { logger } from '../observability/logger.ts';

let supabaseClient: SupabaseClient | null = null;

export function getSupabaseClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const supabaseUrl = process.env.SUPABASE_URL;
  // Prefer service role key for backend operations if present, otherwise anon key
  const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    return null;
  }

  try {
    supabaseClient = createClient(supabaseUrl, supabaseKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    logger.info('Supabase database client initialized successfully for production persistence.');
  } catch (err: any) {
    logger.warn('Failed to initialize Supabase client:', { error: err.message });
  }

  return supabaseClient;
}

export interface SupabaseUserRecord {
  id: string;
  email: string;
  username: string;
  deriv_account_id?: string;
  account_type?: string;
  role: string;
  status: string;
  last_login_at: string;
  updated_at: string;
}

export interface SupabaseDerivConnection {
  user_id: string;
  deriv_account_id: string;
  account_type: string;
  currency: string;
  connection_status: string;
  scopes: string[];
  access_token?: string;
  refresh_token?: string;
  token_expiry?: string | null;
  last_synced_at: string;
  updated_at: string;
}

/**
 * Upsert user profile in Supabase on successful authentication
 */
export async function syncUserToSupabase(user: {
  id: string;
  email: string;
  username?: string;
  derivAccountId?: string;
  accountType?: string;
  role?: string;
}): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const record: SupabaseUserRecord = {
      id: user.id,
      email: user.email,
      username: user.username || user.derivAccountId || user.id,
      deriv_account_id: user.derivAccountId,
      account_type: user.accountType || 'real',
      role: user.role || 'USER',
      status: 'ACTIVE',
      last_login_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('users')
      .upsert(record, { onConflict: 'id' });

    if (error) {
      logger.warn('Supabase user upsert non-blocking notice:', { error: error.message });
      return false;
    }
    return true;
  } catch (err: any) {
    logger.warn('Supabase user sync caught error:', { error: err.message });
    return false;
  }
}

/**
 * Save / Update Deriv Connection record in Supabase
 */
export async function syncDerivConnectionToSupabase(conn: {
  userId: string;
  derivAccountId: string;
  accountType: 'demo' | 'real';
  currency: string;
  connectionStatus: string;
  scopes: string[];
  accessToken: string;
  refreshToken?: string;
  tokenExpiry?: string | null;
}): Promise<boolean> {
  const supabase = getSupabaseClient();
  if (!supabase) return false;

  try {
    const record: SupabaseDerivConnection = {
      user_id: conn.userId,
      deriv_account_id: conn.derivAccountId,
      account_type: conn.accountType,
      currency: conn.currency,
      connection_status: conn.connectionStatus,
      scopes: conn.scopes,
      access_token: conn.accessToken,
      refresh_token: conn.refreshToken,
      token_expiry: conn.tokenExpiry,
      last_synced_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('deriv_connections')
      .upsert(record, { onConflict: 'user_id' });

    if (error) {
      logger.warn('Supabase deriv_connections upsert non-blocking notice:', { error: error.message });
      return false;
    }
    return true;
  } catch (err: any) {
    logger.warn('Supabase connection sync caught error:', { error: err.message });
    return false;
  }
}
