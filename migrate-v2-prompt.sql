-- Migration: Add custom_prompt_v2 column to profiles table
-- Run this on Supabase SQL Editor

ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_prompt_v2 TEXT;
