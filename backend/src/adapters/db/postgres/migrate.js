const pool = require('./pool');
const logger = require('../../../infrastructure/logging/logger');

const SCHEMA = `
  CREATE TABLE IF NOT EXISTS users (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    microsoft_id VARCHAR(255) UNIQUE,
    access_token TEXT,
    refresh_token TEXT,
    token_expiry TIMESTAMPTZ,
    is_verified BOOLEAN DEFAULT false,
    is_demo BOOLEAN DEFAULT false,
    preferences JSONB DEFAULT '{}',
    sync_enabled BOOLEAN DEFAULT false,
    last_sync TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE TABLE IF NOT EXISTS transactions (
    id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message_id VARCHAR(500) UNIQUE NOT NULL,
    amount NUMERIC(12,2) NOT NULL,
    currency VARCHAR(3) DEFAULT 'PEN',
    type VARCHAR(20) NOT NULL CHECK (type IN ('debit','credit','transfer','payment','withdrawal','deposit')),
    category VARCHAR(30) DEFAULT 'other' CHECK (category IN ('food','transport','entertainment','shopping','healthcare','utilities','education','travel','investment','income','transfer','other')),
    subcategory VARCHAR(100),
    merchant VARCHAR(200),
    description TEXT NOT NULL,
    channel VARCHAR(20) DEFAULT 'other' CHECK (channel IN ('online','atm','pos','mobile','branch','other')),
    operation_number VARCHAR(100),
    card_number VARCHAR(50),
    date TIMESTAMPTZ NOT NULL,
    balance NUMERIC(12,2),
    location VARCHAR(200),
    raw_text TEXT NOT NULL,
    is_processed BOOLEAN DEFAULT false,
    ai_analysis JSONB,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
  );

  CREATE INDEX IF NOT EXISTS idx_transactions_user_date ON transactions(user_id, date DESC);
  CREATE INDEX IF NOT EXISTS idx_transactions_user_category ON transactions(user_id, category);
  CREATE INDEX IF NOT EXISTS idx_transactions_user_type ON transactions(user_id, type);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`;

async function migrate() {
  const client = await pool.connect();
  try {
    await client.query(SCHEMA);
    logger.info('PostgreSQL migration completed successfully');
  } catch (err) {
    logger.error('PostgreSQL migration failed', { error: err.message });
    throw err;
  } finally {
    client.release();
  }
}

module.exports = { migrate };
