-- VaultZero Complete PostgreSQL Schema
-- Apply on a fresh PostgreSQL database

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  alternate_email VARCHAR(255),
  last_login TIMESTAMP,
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_token VARCHAR(255),
  verification_token_expires TIMESTAMP,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vaults (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  vault_type VARCHAR(20) NOT NULL CHECK (vault_type IN ('eternal', 'destroy', 'release')),
  encrypted_blob TEXT NOT NULL,
  iv TEXT NOT NULL,
  salt TEXT NOT NULL,
  hmac_signature VARCHAR(64) NOT NULL,
  trigger_days INTEGER,
  release_email VARCHAR(255),
  status VARCHAR(20) NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'destroyed', 'released', 'deleted')),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS vault_events (
  id SERIAL PRIMARY KEY,
  vault_id INTEGER NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
  event_type VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45),
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS security_questions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  question_text VARCHAR(500) NOT NULL,
  answer_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS release_tokens (
  id SERIAL PRIMARY KEY,
  vault_id INTEGER NOT NULL REFERENCES vaults(id) ON DELETE CASCADE,
  token_hash VARCHAR(64) NOT NULL,
  question_id INTEGER REFERENCES security_questions(id),
  verification_passed BOOLEAN NOT NULL DEFAULT FALSE,
  failed_attempts INTEGER NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at TIMESTAMP NOT NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vault_user ON vaults(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_status ON vaults(status);
CREATE INDEX IF NOT EXISTS idx_event_vault ON vault_events(vault_id);
CREATE INDEX IF NOT EXISTS idx_event_user ON vault_events(user_id);
CREATE INDEX IF NOT EXISTS idx_sq_user ON security_questions(user_id);
CREATE INDEX IF NOT EXISTS idx_release_token ON release_tokens(token_hash);
CREATE INDEX IF NOT EXISTS idx_release_vault ON release_tokens(vault_id);
