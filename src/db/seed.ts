/**
 * AppexQuant Markets Global - Development Seed Data
 * Seeds roles, permissions, default instruments, SMC/ICT strategies, academy courses, and feature flags.
 */

import { getDatabasePool } from './connection.js';
import { logger } from '../observability/logger.js';

export async function seedDatabase(): Promise<{ success: boolean; error?: string }> {
  const pool = getDatabasePool();
  try {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');

      // 1. Roles & Permissions
      await client.query(`
        INSERT INTO roles (id, name, description) VALUES
        ('USER', 'Standard Trader', 'Standard user with trading and learning access'),
        ('ADMIN', 'Platform Administrator', 'Full administrative and infrastructure control')
        ON CONFLICT (id) DO NOTHING;
      `);

      await client.query(`
        INSERT INTO permissions (id, name, description) VALUES
        ('VIEW_MARKETS', 'View Markets', 'Access market quotes and charts'),
        ('EXECUTE_MANUAL_ORDER', 'Execute Orders', 'Place manual orders in demo/live'),
        ('MANAGE_BROKERS', 'Manage Brokers', 'Configure Deriv OAuth and broker gateways'),
        ('MANAGE_SYSTEM', 'Manage System', 'Full system configuration and feature flags')
        ON CONFLICT (id) DO NOTHING;
      `);

      // 2. Default Instruments
      await client.query(`
        INSERT INTO instruments (id, symbol, display_name, market_type, base_currency, quote_currency, precision_digits) VALUES
        ('inst-eurusd', 'EURUSD', 'Euro vs US Dollar', 'FOREX', 'EUR', 'USD', 5),
        ('inst-gbpusd', 'GBPUSD', 'British Pound vs US Dollar', 'FOREX', 'GBP', 'USD', 5),
        ('inst-btcusd', 'BTCUSD', 'Bitcoin vs US Dollar', 'CRYPTO', 'BTC', 'USD', 2),
        ('inst-gold', 'XAUUSD', 'Gold vs US Dollar', 'COMMODITIES', 'XAU', 'USD', 2)
        ON CONFLICT (id) DO NOTHING;
      `);

      // 3. Strategies (SMC & ICT)
      await client.query(`
        INSERT INTO strategies (id, name, category, description, theory) VALUES
        ('strat-smc-ob', 'Smart Money Concepts: Order Block', 'SMC', 'Trading institutional order blocks formed prior to structural displacement.', 'Institutional accumulation zones that trigger high probability mitigation retests.'),
        ('strat-ict-sweep', 'ICT Liquidity Sweep & Judas Swing', 'ICT', 'Capitalizing on resting retail liquidity sweeps before session expansion.', 'Market makers hunt stop losses to fuel major directional displacement.')
        ON CONFLICT (id) DO NOTHING;
      `);

      // 4. Feature Flags
      await client.query(`
        INSERT INTO feature_flags (id, name, is_enabled, description) VALUES
        ('AI_SIGNALS', 'AI Signals Engine', TRUE, 'Real-time quant AI trade signals'),
        ('LIVE_TRADING', 'Live Trading Environment', TRUE, 'Real broker execution routing'),
        ('EA_MARKETPLACE', 'Expert Advisor Marketplace', TRUE, 'Community EA and bot marketplace'),
        ('NEWS_ENGINE', 'News & Sentiment Engine', TRUE, 'Real-time macroeconomic news feed'),
        ('COMMUNITY', 'Trader Community Hub', TRUE, 'Global trader social and verification feed')
        ON CONFLICT (id) DO NOTHING;
      `);

      await client.query('COMMIT');
      logger.info('Database seeding completed successfully.');
      return { success: true };
    } catch (err: any) {
      await client.query('ROLLBACK');
      logger.error('Database seeding transaction failed', { error: err.message });
      return { success: false, error: err.message };
    } finally {
      client.release();
    }
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}
