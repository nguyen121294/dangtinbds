-- Migration: Add Referral Commission System
-- Run this in Supabase SQL Editor

-- 1. Add referral columns to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by TEXT REFERENCES profiles(id);
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS commission_balance DOUBLE PRECISION DEFAULT 0;

-- 2. Create referral_commissions table
CREATE TABLE IF NOT EXISTS referral_commissions (
  id TEXT PRIMARY KEY,
  beneficiary_id TEXT NOT NULL REFERENCES profiles(id),
  source_user_id TEXT NOT NULL REFERENCES profiles(id),
  payment_id TEXT NOT NULL REFERENCES payments(id),
  tier INTEGER NOT NULL,
  rate DOUBLE PRECISION NOT NULL,
  amount DOUBLE PRECISION NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  approved_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 3. Create withdrawal_requests table
CREATE TABLE IF NOT EXISTS withdrawal_requests (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES profiles(id),
  amount DOUBLE PRECISION NOT NULL,
  phone TEXT NOT NULL,
  bank_account TEXT NOT NULL,
  bank_name TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending',
  user_sub_status_at_request TEXT,
  completed_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT NOW()
);

-- 4. Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_referral_commissions_beneficiary ON referral_commissions(beneficiary_id);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON referral_commissions(status);
CREATE INDEX IF NOT EXISTS idx_referral_commissions_payment ON referral_commissions(payment_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user ON withdrawal_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);
CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);
CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);

-- 5. Update handle_new_user trigger to include referral columns
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS trigger AS $$
BEGIN
  INSERT INTO public.profiles (id, email, first_name, last_name, trial_credits, commission_balance)
  VALUES (
    NEW.id,
    NEW.email,
    NEW.raw_user_meta_data->>'firstName',
    NEW.raw_user_meta_data->>'lastName',
    10,
    0
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. Insert default commission settings into app_settings
INSERT INTO app_settings (key, value, updated_at) VALUES 
  ('commission_tier1', '10', NOW()),
  ('commission_tier2', '5', NOW()),
  ('commission_tier3', '1', NOW()),
  ('min_withdrawal', '5000000', NOW())
ON CONFLICT (key) DO NOTHING;
