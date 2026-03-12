-- VaultZero Security Hardening — Phase 2 Migration
-- Run this BEFORE starting the patched server.

-- 1. Rename plaintext token column to token_hash
ALTER TABLE release_tokens CHANGE COLUMN token token_hash VARCHAR(64) NOT NULL;

-- 2. Add indexes for performance
CREATE INDEX idx_vault_user ON vaults(user_id);
CREATE INDEX idx_vault_status ON vaults(status);
CREATE INDEX idx_release_token ON release_tokens(token_hash);
