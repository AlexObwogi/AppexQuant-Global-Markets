# AppexQuant Markets Global - Production Database Architecture Documentation

## Overview
The AppexQuant Markets Global database architecture is a robust, production-grade relational PostgreSQL database designed for secure multi-tenant trading operations, real-time market synchronization, OAuth 2.0 broker integration, AI signal processing, and comprehensive mastery/academy analytics.

## Table List & Relationship Map
1. **Users, Profiles & Auth**: `users`, `user_profiles`, `user_preferences`, `roles`, `permissions`, `role_permissions`, `user_roles`
2. **Deriv Integration**: `deriv_integrations`, `deriv_accounts`, `deriv_authorizations`, `deriv_sessions`, `deriv_account_snapshots`, `deriv_sync_events`
3. **Trading & Markets**: `instruments`, `market_sessions`, `market_quotes`, `market_candles`, `watchlists`, `watchlist_items`, `orders`, `positions`, `position_events`, `portfolios`, `portfolio_snapshots`
4. **Risk Management**: `risk_profiles`, `risk_events`
5. **Strategies & Combinations**: `strategies`, `strategy_rules`, `strategy_combinations`, `strategy_combination_items`
6. **Academy & Mastery**: `academy_courses`, `academy_modules`, `academy_lessons`, `user_lesson_progress`, `mastery_tracking`, `practice_sessions`, `replay_sessions`, `quizzes`, `quiz_attempts`, `certificates`, `learning_streaks`
7. **AI, Signals & News**: `ai_learning_profiles`, `signals`, `news_articles`, `forecasts`
8. **Bots & EA System**: `bots`, `ea_products`, `marketplace_products`
9. **Analytics & Admin**: `performance_snapshots`, `notifications`, `audit_logs`, `security_events`, `feature_flags`

## Security Model
- All sensitive credentials (OAuth access/refresh tokens) are encrypted at rest using AES-256-GCM.
- Role-based access control (RBAC) enforced server-side.
- Zero client-side privilege trust.

## Indexing & Performance Strategy
- B-Tree indexes on high-frequency lookup columns (`users.email`, `orders.user_id`, `orders.created_at`, `positions.status`, `market_candles(instrument_id, timeframe, candle_timestamp)`).

## Backup & Data Retention
- Automated daily snapshots and WAL archiving for point-in-time recovery (PITR).
- High-volume market tick/quote logs partitioned and purged on a 30-day retention window, while transactional orders, positions, audit logs, and certificates are retained indefinitely.
