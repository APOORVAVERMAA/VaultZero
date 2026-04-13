-- VaultZero Security Hardening — PostgreSQL migration
-- Run this BEFORE starting the patched server.

-- 1. Rename plaintext token column to token_hash (if old column exists)
ALTER TABLE release_tokens RENAME COLUMN token TO token_hash;

-- 2. Add indexes for performance
CREATE INDEX IF NOT EXISTS idx_vault_user ON vaults(user_id);
CREATE INDEX IF NOT EXISTS idx_vault_status ON vaults(status);
CREATE INDEX IF NOT EXISTS idx_release_token ON release_tokens(token_hash);
