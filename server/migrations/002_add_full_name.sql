-- Add full_name column to users table (PostgreSQL)
ALTER TABLE users ADD COLUMN IF NOT EXISTS full_name VARCHAR(255) NOT NULL DEFAULT '';
