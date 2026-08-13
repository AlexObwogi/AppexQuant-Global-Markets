/**
 * AppexQuant Markets Global - Production PostgreSQL DDL Schema
 * Covers authentication, user profiles, preferences, roles/permissions, Deriv integration,
 * multi-environment trading (DEMO/PAPER/LIVE), market data, orders, positions, portfolio,
 * risk management, strategies, strategy rules/combinations, academy courses/lessons/progress,
 * mastery engine, practice, replay, quizzes, certificates, streaks, AI tutor, AI signals,
 * news/sentiment, forecasts, bots, EA system, marketplace, performance metrics, notifications,
 * admin audit logs, security events, and feature flags.
 */

-- Enable UUID extension if available
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- 1. USERS & PROFILES & PREFERENCES
-- ============================================================================

CREATE TABLE IF NOT EXISTS roles (
    id VARCHAR(50) PRIMARY KEY,
    name VARCHAR(100) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS permissions (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS role_permissions (
    role_id VARCHAR(50) REFERENCES roles(id) ON DELETE CASCADE,
    permission_id VARCHAR(100) REFERENCES permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

CREATE TABLE IF NOT EXISTS users (
    id VARCHAR(64) PRIMARY KEY,
    email VARCHAR(255) NOT NULL UNIQUE,
    username VARCHAR(100) UNIQUE,
    display_name VARCHAR(150),
    avatar VARCHAR(512),
    role VARCHAR(50) NOT NULL DEFAULT 'USER' REFERENCES roles(id),
    status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE', -- ACTIVE, SUSPENDED, PENDING_VERIFICATION
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_login_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS user_profiles (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    bio TEXT,
    experience_level VARCHAR(30) DEFAULT 'BEGINNER',
    preferred_environment VARCHAR(20) DEFAULT 'DEMO',
    country VARCHAR(3),
    phone VARCHAR(30),
    kyc_status VARCHAR(30) DEFAULT 'UNVERIFIED',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_preferences (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    theme VARCHAR(20) DEFAULT 'dark',
    notifications_enabled BOOLEAN DEFAULT TRUE,
    timezone VARCHAR(50) DEFAULT 'UTC',
    language VARCHAR(10) DEFAULT 'en',
    default_market VARCHAR(50) DEFAULT 'EURUSD',
    default_timeframe VARCHAR(10) DEFAULT '15m',
    chart_preferences JSONB DEFAULT '{}',
    privacy_settings JSONB DEFAULT '{}',
    balance_visible_default BOOLEAN DEFAULT FALSE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_roles (
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    role_id VARCHAR(50) REFERENCES roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- ============================================================================
-- 2. DERIV INTEGRATION & AUTHENTICATION
-- ============================================================================

CREATE TABLE IF NOT EXISTS deriv_integrations (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    client_id VARCHAR(100) NOT NULL,
    redirect_uri VARCHAR(512) NOT NULL,
    environment VARCHAR(20) DEFAULT 'PRODUCTION',
    status VARCHAR(30) DEFAULT 'CONNECTED',
    scopes TEXT[],
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deriv_accounts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    deriv_account_id VARCHAR(100) NOT NULL UNIQUE,
    account_type VARCHAR(20) NOT NULL, -- demo or real
    currency VARCHAR(10) DEFAULT 'USD',
    status VARCHAR(30) DEFAULT 'ACTIVE',
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    last_synced_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS deriv_authorizations (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    encrypted_access_token TEXT NOT NULL,
    encrypted_refresh_token TEXT,
    token_expiry TIMESTAMP WITH TIME ZONE,
    scope VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deriv_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    session_token VARCHAR(255) NOT NULL UNIQUE,
    ip_address VARCHAR(64),
    user_agent TEXT,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deriv_account_snapshots (
    id SERIAL PRIMARY KEY,
    deriv_account_id VARCHAR(100) REFERENCES deriv_accounts(deriv_account_id) ON DELETE CASCADE,
    balance NUMERIC(18, 6) NOT NULL,
    equity NUMERIC(18, 6) NOT NULL,
    margin NUMERIC(18, 6) DEFAULT 0,
    free_margin NUMERIC(18, 6) DEFAULT 0,
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS deriv_sync_events (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    payload JSONB,
    status VARCHAR(30) DEFAULT 'SUCCESS',
    error_message TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 3. TRADING ENVIRONMENTS, INSTRUMENTS & MARKET DATA
-- ============================================================================

CREATE TABLE IF NOT EXISTS instruments (
    id VARCHAR(64) PRIMARY KEY,
    symbol VARCHAR(50) NOT NULL UNIQUE,
    display_name VARCHAR(150) NOT NULL,
    market_type VARCHAR(30) NOT NULL, -- FOREX, CRYPTO, INDICES, COMMODITIES, OPTIONS
    base_currency VARCHAR(10),
    quote_currency VARCHAR(10),
    exchange VARCHAR(50) DEFAULT 'Deriv',
    precision_digits INT DEFAULT 5,
    minimum_quantity NUMERIC(18, 6) DEFAULT 0.01,
    status VARCHAR(30) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS market_sessions (
    id SERIAL PRIMARY KEY,
    instrument_id VARCHAR(64) REFERENCES instruments(id) ON DELETE CASCADE,
    session_name VARCHAR(50),
    open_time TIME,
    close_time TIME,
    is_open BOOLEAN DEFAULT TRUE
);

CREATE TABLE IF NOT EXISTS market_quotes (
    id SERIAL PRIMARY KEY,
    instrument_id VARCHAR(64) REFERENCES instruments(id) ON DELETE CASCADE,
    bid NUMERIC(18, 6) NOT NULL,
    ask NUMERIC(18, 6) NOT NULL,
    last NUMERIC(18, 6) NOT NULL,
    volume NUMERIC(18, 6) DEFAULT 0,
    quoted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS market_candles (
    id SERIAL PRIMARY KEY,
    instrument_id VARCHAR(64) REFERENCES instruments(id) ON DELETE CASCADE,
    timeframe VARCHAR(10) NOT NULL, -- 1m, 5m, 15m, 1h, 4h, 1d
    open NUMERIC(18, 6) NOT NULL,
    high NUMERIC(18, 6) NOT NULL,
    low NUMERIC(18, 6) NOT NULL,
    close NUMERIC(18, 6) NOT NULL,
    volume NUMERIC(18, 6) DEFAULT 0,
    candle_timestamp TIMESTAMP WITH TIME ZONE NOT NULL,
    UNIQUE (instrument_id, timeframe, candle_timestamp)
);

-- ============================================================================
-- 4. WATCHLISTS, ORDERS & POSITIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS watchlists (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    is_default BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS watchlist_items (
    watchlist_id VARCHAR(64) REFERENCES watchlists(id) ON DELETE CASCADE,
    instrument_id VARCHAR(64) REFERENCES instruments(id) ON DELETE CASCADE,
    display_order INT DEFAULT 0,
    PRIMARY KEY (watchlist_id, instrument_id)
);

CREATE TABLE IF NOT EXISTS orders (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    environment VARCHAR(20) NOT NULL DEFAULT 'DEMO', -- DEMO, PAPER, LIVE
    instrument_id VARCHAR(64) REFERENCES instruments(id),
    provider VARCHAR(50) DEFAULT 'Deriv',
    external_order_id VARCHAR(100),
    order_type VARCHAR(30) NOT NULL, -- MARKET, LIMIT, STOP
    side VARCHAR(10) NOT NULL, -- BUY, SELL
    quantity NUMERIC(18, 6) NOT NULL,
    requested_price NUMERIC(18, 6),
    executed_price NUMERIC(18, 6),
    status VARCHAR(30) NOT NULL DEFAULT 'PENDING', -- PENDING, FILLED, CANCELLED, REJECTED
    stop_loss NUMERIC(18, 6),
    take_profit NUMERIC(18, 6),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    submitted_at TIMESTAMP WITH TIME ZONE,
    filled_at TIMESTAMP WITH TIME ZONE,
    cancelled_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS positions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    environment VARCHAR(20) NOT NULL DEFAULT 'DEMO',
    instrument_id VARCHAR(64) REFERENCES instruments(id),
    side VARCHAR(10) NOT NULL,
    quantity NUMERIC(18, 6) NOT NULL,
    entry_price NUMERIC(18, 6) NOT NULL,
    current_price NUMERIC(18, 6),
    stop_loss NUMERIC(18, 6),
    take_profit NUMERIC(18, 6),
    realized_pnl NUMERIC(18, 6) DEFAULT 0,
    unrealized_pnl NUMERIC(18, 6) DEFAULT 0,
    status VARCHAR(30) NOT NULL DEFAULT 'OPEN', -- OPEN, CLOSED
    opened_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    closed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS position_events (
    id SERIAL PRIMARY KEY,
    position_id VARCHAR(64) REFERENCES positions(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL, -- OPEN, INCREASE, DECREASE, PARTIAL_CLOSE, CLOSE
    delta_quantity NUMERIC(18, 6),
    execution_price NUMERIC(18, 6),
    realized_pnl NUMERIC(18, 6) DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolios (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    environment VARCHAR(20) NOT NULL DEFAULT 'DEMO',
    currency VARCHAR(10) DEFAULT 'USD',
    balance NUMERIC(18, 6) NOT NULL DEFAULT 10000.00,
    equity NUMERIC(18, 6) NOT NULL DEFAULT 10000.00,
    margin NUMERIC(18, 6) DEFAULT 0,
    free_margin NUMERIC(18, 6) DEFAULT 10000.00,
    drawdown NUMERIC(10, 4) DEFAULT 0,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS portfolio_snapshots (
    id SERIAL PRIMARY KEY,
    portfolio_id VARCHAR(64) REFERENCES portfolios(id) ON DELETE CASCADE,
    balance NUMERIC(18, 6) NOT NULL,
    equity NUMERIC(18, 6) NOT NULL,
    snapshot_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 5. RISK MANAGEMENT ENGINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS risk_profiles (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    max_risk_per_trade_pct NUMERIC(5, 2) DEFAULT 2.00,
    max_daily_drawdown_pct NUMERIC(5, 2) DEFAULT 5.00,
    max_concurrent_positions INT DEFAULT 5,
    require_stop_loss BOOLEAN DEFAULT TRUE,
    strict_mode BOOLEAN DEFAULT TRUE,
    version INT DEFAULT 1,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS risk_events (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    event_type VARCHAR(50) NOT NULL,
    severity VARCHAR(20) DEFAULT 'WARNING',
    details JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 6. STRATEGY LIBRARY & COMBINATION ENGINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS strategies (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    category VARCHAR(50) NOT NULL, -- SMC, ICT, CLASSIC, BREAKOUT, QUANT, COMBINATION
    description TEXT,
    theory TEXT,
    status VARCHAR(30) DEFAULT 'ACTIVE',
    version INT DEFAULT 1,
    author VARCHAR(150) DEFAULT 'AppexQuant Quant Core',
    risk_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS strategy_rules (
    id VARCHAR(64) PRIMARY KEY,
    strategy_id VARCHAR(64) REFERENCES strategies(id) ON DELETE CASCADE,
    rule_type VARCHAR(50) NOT NULL, -- CONDITION, TIMEFRAME, SESSION, INVALIDATION, CONFLUENCE
    rule_definition JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS strategy_combinations (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    logic_operator VARCHAR(10) DEFAULT 'AND', -- AND, OR, THEN
    is_system BOOLEAN DEFAULT FALSE,
    version INT DEFAULT 1,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS strategy_combination_items (
    combination_id VARCHAR(64) REFERENCES strategy_combinations(id) ON DELETE CASCADE,
    strategy_id VARCHAR(64) REFERENCES strategies(id) ON DELETE CASCADE,
    sequence_order INT DEFAULT 0,
    PRIMARY KEY (combination_id, strategy_id)
);

-- ============================================================================
-- 7. ACADEMY & MASTERY ENGINE
-- ============================================================================

CREATE TABLE IF NOT EXISTS academy_courses (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    level VARCHAR(30) NOT NULL, -- BEGINNER, INTERMEDIATE, ADVANCED, ELITE
    description TEXT,
    duration_hours NUMERIC(6, 2) DEFAULT 10.0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS academy_modules (
    id VARCHAR(64) PRIMARY KEY,
    course_id VARCHAR(64) REFERENCES academy_courses(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    sequence_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS academy_lessons (
    id VARCHAR(64) PRIMARY KEY,
    module_id VARCHAR(64) REFERENCES academy_modules(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    theory TEXT,
    objectives TEXT[],
    estimated_duration_mins INT DEFAULT 30,
    sequence_order INT DEFAULT 0
);

CREATE TABLE IF NOT EXISTS user_lesson_progress (
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    lesson_id VARCHAR(64) REFERENCES academy_lessons(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'NOT_STARTED', -- NOT_STARTED, IN_PROGRESS, COMPLETED
    mastery_score NUMERIC(5, 2) DEFAULT 0,
    time_spent_seconds INT DEFAULT 0,
    last_studied_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    PRIMARY KEY (user_id, lesson_id)
);

CREATE TABLE IF NOT EXISTS mastery_tracking (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    lesson_time_secs INT DEFAULT 0,
    chart_analysis_time_secs INT DEFAULT 0,
    practice_time_secs INT DEFAULT 0,
    replay_time_secs INT DEFAULT 0,
    quiz_time_secs INT DEFAULT 0,
    backtest_time_secs INT DEFAULT 0,
    review_time_secs INT DEFAULT 0,
    strategy_testing_time_secs INT DEFAULT 0,
    overall_mastery_level VARCHAR(30) DEFAULT 'LEARNING',
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 8. PRACTICE, REPLAY, QUIZZES & CERTIFICATES
-- ============================================================================

CREATE TABLE IF NOT EXISTS practice_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    strategy_id VARCHAR(64) REFERENCES strategies(id),
    score NUMERIC(5, 2) DEFAULT 0,
    status VARCHAR(30) DEFAULT 'COMPLETED',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS replay_sessions (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    instrument_id VARCHAR(64) REFERENCES instruments(id),
    timeframe VARCHAR(10) DEFAULT '15m',
    current_index INT DEFAULT 0,
    status VARCHAR(30) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quizzes (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(200) NOT NULL,
    level VARCHAR(30) DEFAULT 'INTERMEDIATE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS quiz_attempts (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    quiz_id VARCHAR(64) REFERENCES quizzes(id) ON DELETE CASCADE,
    score NUMERIC(5, 2) DEFAULT 0,
    passed BOOLEAN DEFAULT FALSE,
    attempted_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS certificates (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    course_id VARCHAR(64) REFERENCES academy_courses(id),
    level VARCHAR(30) NOT NULL,
    verification_code VARCHAR(64) NOT NULL UNIQUE,
    issued_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS learning_streaks (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    current_streak INT DEFAULT 0,
    longest_streak INT DEFAULT 0,
    last_activity_date DATE,
    forgiveness_available BOOLEAN DEFAULT TRUE,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 9. AI TUTOR, SIGNALS, NEWS & FORECASTS
-- ============================================================================

CREATE TABLE IF NOT EXISTS ai_learning_profiles (
    user_id VARCHAR(64) PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
    weak_concepts TEXT[],
    strong_concepts TEXT[],
    recommendations JSONB,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS signals (
    id VARCHAR(64) PRIMARY KEY,
    instrument_id VARCHAR(64) REFERENCES instruments(id),
    timeframe VARCHAR(10) DEFAULT '15m',
    strategy_id VARCHAR(64) REFERENCES strategies(id),
    confidence NUMERIC(5, 2) NOT NULL,
    sentiment VARCHAR(20) DEFAULT 'BULLISH',
    invalidation_price NUMERIC(18, 6),
    status VARCHAR(30) DEFAULT 'ACTIVE',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS news_articles (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    url VARCHAR(512),
    source VARCHAR(100),
    sentiment VARCHAR(20) DEFAULT 'NEUTRAL',
    published_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS forecasts (
    id VARCHAR(64) PRIMARY KEY,
    instrument_id VARCHAR(64) REFERENCES instruments(id),
    model_version VARCHAR(50) DEFAULT 'v2.4-quant',
    confidence_interval NUMERIC(5, 2),
    pattern_score NUMERIC(5, 2),
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 10. BOTS, EA SYSTEM & MARKETPLACE
-- ============================================================================

CREATE TABLE IF NOT EXISTS bots (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    name VARCHAR(150) NOT NULL,
    strategy_id VARCHAR(64) REFERENCES strategies(id),
    status VARCHAR(30) DEFAULT 'PAUSED', -- ACTIVE, PAUSED, STOPPED
    configuration JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS ea_products (
    id VARCHAR(64) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    platform VARCHAR(30) DEFAULT 'MT5',
    version VARCHAR(20) DEFAULT '1.0.0',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS marketplace_products (
    id VARCHAR(64) PRIMARY KEY,
    title VARCHAR(150) NOT NULL,
    category VARCHAR(50) DEFAULT 'EA',
    price_usd NUMERIC(10, 2) DEFAULT 0.00,
    is_free BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 11. PERFORMANCE ANALYTICS & NOTIFICATIONS
-- ============================================================================

CREATE TABLE IF NOT EXISTS performance_snapshots (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    win_rate NUMERIC(5, 2) DEFAULT 0,
    profit_factor NUMERIC(6, 2) DEFAULT 0,
    total_trades INT DEFAULT 0,
    snapshot_date DATE DEFAULT CURRENT_DATE
);

CREATE TABLE IF NOT EXISTS notifications (
    id VARCHAR(64) PRIMARY KEY,
    user_id VARCHAR(64) REFERENCES users(id) ON DELETE CASCADE,
    category VARCHAR(50) DEFAULT 'TRADING',
    title VARCHAR(200) NOT NULL,
    message TEXT NOT NULL,
    is_read BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 12. ADMIN, AUDIT LOGS & FEATURE FLAGS
-- ============================================================================

CREATE TABLE IF NOT EXISTS audit_logs (
    id SERIAL PRIMARY KEY,
    actor_id VARCHAR(64),
    action_type VARCHAR(100) NOT NULL,
    target VARCHAR(150),
    metadata JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_events (
    id SERIAL PRIMARY KEY,
    user_id VARCHAR(64),
    event_type VARCHAR(100) NOT NULL,
    severity VARCHAR(20) DEFAULT 'WARNING',
    ip_address VARCHAR(64),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS feature_flags (
    id VARCHAR(100) PRIMARY KEY,
    name VARCHAR(150) NOT NULL,
    is_enabled BOOLEAN DEFAULT FALSE,
    description TEXT,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- 13. INDEXING STRATEGY
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_created_at ON users(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_user_id ON orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);
CREATE INDEX IF NOT EXISTS idx_orders_instrument_id ON orders(instrument_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(status);
CREATE INDEX IF NOT EXISTS idx_positions_user_id ON positions(user_id);
CREATE INDEX IF NOT EXISTS idx_positions_instrument_id ON positions(instrument_id);
CREATE INDEX IF NOT EXISTS idx_positions_status ON positions(status);
CREATE INDEX IF NOT EXISTS idx_market_candles_lookup ON market_candles(instrument_id, timeframe, candle_timestamp);
CREATE INDEX IF NOT EXISTS idx_signals_lookup ON signals(instrument_id, timeframe, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created_at ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor_id ON audit_logs(actor_id);
CREATE INDEX IF NOT EXISTS idx_learning_activity_user ON learning_streaks(user_id);
