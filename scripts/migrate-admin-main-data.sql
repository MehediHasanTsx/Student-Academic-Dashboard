-- Migration: Add role to users table and create main_data table
-- Run this in Neon SQL Editor: https://console.neon.tech

-- 1. Add role column to users (defaults to 'student')
ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(20) NOT NULL DEFAULT 'student';

-- 2. Set Admin account
UPDATE users SET role = 'admin' WHERE username = 'mehedihasantsx';

-- 3. Create main_data table
CREATE TABLE IF NOT EXISTS main_data (
  id VARCHAR(50) PRIMARY KEY,
  semester_id VARCHAR(50) NOT NULL DEFAULT 'semester-5',
  subjects JSONB NOT NULL DEFAULT '[]'::jsonb,
  routine JSONB NOT NULL DEFAULT '[]'::jsonb,
  exams JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_by UUID REFERENCES users(id)
);
