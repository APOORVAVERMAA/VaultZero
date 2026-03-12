-- VaultZero Full Schema — Run this on a fresh database
-- This creates all tables required by VaultZero from scratch.
-- If tables already exist, use 001/002 migrations for incremental upgrades.

CREATE DATABASE IF NOT EXISTS vaultzero CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE vaultzero;

-- Users
CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  full_name VARCHAR(255) NOT NULL DEFAULT '',
  email VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  alternate_email VARCHAR(255) DEFAULT NULL,
  last_login DATETIME DEFAULT NULL,
  terms_accepted BOOLEAN NOT NULL DEFAULT FALSE,
  onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE,
  email_verified BOOLEAN NOT NULL DEFAULT FALSE,
  verification_token VARCHAR(255) DEFAULT NULL,
  verification_token_expires DATETIME DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- Vaults
CREATE TABLE IF NOT EXISTS vaults (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  vault_type ENUM('eternal', 'destroy', 'release') NOT NULL,
  encrypted_blob LONGTEXT NOT NULL,
  iv TEXT NOT NULL,
  salt TEXT NOT NULL,
  hmac_signature VARCHAR(64) NOT NULL,
  trigger_days INT DEFAULT NULL,
  release_email VARCHAR(255) DEFAULT NULL,
  status ENUM('active', 'destroyed', 'released', 'deleted') NOT NULL DEFAULT 'active',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_vault_user (user_id),
  INDEX idx_vault_status (status)
) ENGINE=InnoDB;

-- Vault Events (audit log)
CREATE TABLE IF NOT EXISTS vault_events (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vault_id INT NOT NULL,
  user_id INT DEFAULT NULL,
  event_type VARCHAR(50) NOT NULL,
  ip_address VARCHAR(45) DEFAULT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE,
  INDEX idx_event_vault (vault_id),
  INDEX idx_event_user (user_id)
) ENGINE=InnoDB;

-- Security Questions (for onboarding + release verification)
CREATE TABLE IF NOT EXISTS security_questions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  question_text VARCHAR(500) NOT NULL,
  answer_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_sq_user (user_id)
) ENGINE=InnoDB;

-- Release Tokens (dead-man vault release access)
CREATE TABLE IF NOT EXISTS release_tokens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  vault_id INT NOT NULL,
  token_hash VARCHAR(64) NOT NULL,
  question_id INT DEFAULT NULL,
  verification_passed BOOLEAN NOT NULL DEFAULT FALSE,
  failed_attempts INT NOT NULL DEFAULT 0,
  used BOOLEAN NOT NULL DEFAULT FALSE,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (vault_id) REFERENCES vaults(id) ON DELETE CASCADE,
  FOREIGN KEY (question_id) REFERENCES security_questions(id),
  INDEX idx_release_token (token_hash)
) ENGINE=InnoDB;
