import { config } from 'dotenv';
config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const client = postgres(process.env.DATABASE_URL as string, { prepare: false });
const db = drizzle(client);

async function main() {
  console.log('🚀 Starting Referral Commission Migration...\n');

  // 1. Add referral columns to profiles
  try {
    await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referral_code TEXT UNIQUE;`);
    console.log('✅ Added referral_code to profiles');
  } catch(e: any) { console.log('⏭️ referral_code:', e.message); }

  try {
    await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS referred_by TEXT REFERENCES profiles(id);`);
    console.log('✅ Added referred_by to profiles');
  } catch(e: any) { console.log('⏭️ referred_by:', e.message); }

  try {
    await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS commission_balance DOUBLE PRECISION DEFAULT 0;`);
    console.log('✅ Added commission_balance to profiles');
  } catch(e: any) { console.log('⏭️ commission_balance:', e.message); }

  // 2. Create referral_commissions table
  try {
    await db.execute(sql`
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
    `);
    console.log('✅ Created referral_commissions table');
  } catch(e: any) { console.log('⏭️ referral_commissions:', e.message); }

  // 3. Create withdrawal_requests table
  try {
    await db.execute(sql`
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
    `);
    console.log('✅ Created withdrawal_requests table');
  } catch(e: any) { console.log('⏭️ withdrawal_requests:', e.message); }

  // 4. Create indexes
  const indexes = [
    { name: 'idx_referral_commissions_beneficiary', sql: sql`CREATE INDEX IF NOT EXISTS idx_referral_commissions_beneficiary ON referral_commissions(beneficiary_id);` },
    { name: 'idx_referral_commissions_status', sql: sql`CREATE INDEX IF NOT EXISTS idx_referral_commissions_status ON referral_commissions(status);` },
    { name: 'idx_referral_commissions_payment', sql: sql`CREATE INDEX IF NOT EXISTS idx_referral_commissions_payment ON referral_commissions(payment_id);` },
    { name: 'idx_withdrawal_requests_user', sql: sql`CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_user ON withdrawal_requests(user_id);` },
    { name: 'idx_withdrawal_requests_status', sql: sql`CREATE INDEX IF NOT EXISTS idx_withdrawal_requests_status ON withdrawal_requests(status);` },
    { name: 'idx_profiles_referral_code', sql: sql`CREATE INDEX IF NOT EXISTS idx_profiles_referral_code ON profiles(referral_code);` },
    { name: 'idx_profiles_referred_by', sql: sql`CREATE INDEX IF NOT EXISTS idx_profiles_referred_by ON profiles(referred_by);` },
  ];

  for (const idx of indexes) {
    try {
      await db.execute(idx.sql);
      console.log(`✅ Created index: ${idx.name}`);
    } catch(e: any) { console.log(`⏭️ ${idx.name}:`, e.message); }
  }

  // 5. Update handle_new_user trigger
  try {
    await db.execute(sql`
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
    `);
    console.log('✅ Updated handle_new_user trigger function');
  } catch(e: any) { console.log('⏭️ trigger:', e.message); }

  // 6. Insert default commission settings
  const settings = [
    { key: 'commission_tier1', value: '10' },
    { key: 'commission_tier2', value: '5' },
    { key: 'commission_tier3', value: '1' },
    { key: 'min_withdrawal', value: '5000000' },
  ];

  for (const s of settings) {
    try {
      await db.execute(sql`
        INSERT INTO app_settings (key, value, updated_at) 
        VALUES (${s.key}, ${s.value}, NOW())
        ON CONFLICT (key) DO NOTHING;
      `);
      console.log(`✅ Setting: ${s.key} = ${s.value}`);
    } catch(e: any) { console.log(`⏭️ ${s.key}:`, e.message); }
  }

  console.log('\n🎉 Migration complete!');
  process.exit(0);
}

main();
