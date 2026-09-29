-- Migration: Add email column to users and create password_reset_otps table
-- Run this in Neon SQL Editor: https://console.neon.tech

-- 1. Add email column to users
ALTER TABLE users ADD COLUMN IF NOT EXISTS email VARCHAR(200);

-- 2. Unique index on email (allows nulls for legacy accounts)
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email) WHERE email IS NOT NULL;

-- 3. Populate existing user emails from profiles
UPDATE users u
SET email = p.email
FROM profiles p
WHERE u.id = p.user_id AND p.email IS NOT NULL AND u.email IS NULL;

-- 4. Create password_reset_otps table
CREATE TABLE IF NOT EXISTS password_reset_otps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  otp_hash VARCHAR(255) NOT NULL,
  reset_token VARCHAR(255) UNIQUE,
  expires_at TIMESTAMPTZ NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  max_attempts INTEGER NOT NULL DEFAULT 5,
  used_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 5. Indexes
CREATE INDEX IF NOT EXISTS idx_reset_otps_user_id ON password_reset_otps(user_id);
CREATE INDEX IF NOT EXISTS idx_reset_otps_reset_token ON password_reset_otps(reset_token);
CREATE INDEX IF NOT EXISTS idx_reset_otps_expires_at ON password_reset_otps(expires_at);
