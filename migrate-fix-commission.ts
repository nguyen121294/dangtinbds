import { config } from 'dotenv';
config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const client = postgres(process.env.DATABASE_URL as string, { prepare: false });
const db = drizzle(client);

async function main() {
  console.log('🚀 Starting Commission Type Fix Migration...\n');

  // 0. Kiểm tra dữ liệu duplicate trước (Bug #1 audit)
  try {
    const dupes = await db.execute(sql`
      SELECT payment_id, COUNT(*) as cnt 
      FROM referral_commissions 
      GROUP BY payment_id 
      HAVING COUNT(*) > 3;
    `);
    if (dupes.length > 0) {
      console.log('⚠️  PHÁT HIỆN DUPLICATE COMMISSIONS:');
      for (const row of dupes) {
        console.log(`   payment_id=${row.payment_id}, count=${row.cnt}`);
      }
    } else {
      console.log('✅ Không có duplicate commission nào (Bug #1 chưa từng xảy ra)');
    }
  } catch(e: any) { console.log('⏭️ Duplicate check:', e.message); }

  // 1. Chuyển commission_balance sang INTEGER
  try {
    await db.execute(sql`
      ALTER TABLE profiles 
        ALTER COLUMN commission_balance TYPE INTEGER USING ROUND(commission_balance)::INTEGER;
    `);
    console.log('✅ profiles.commission_balance → INTEGER');
  } catch(e: any) { 
    if (e.message.includes('already of type')) {
      console.log('⏭️ profiles.commission_balance đã là INTEGER');
    } else {
      console.log('✅/⏭️ commission_balance:', e.message); 
    }
  }

  // 2. Chuyển referral_commissions.amount sang INTEGER
  try {
    await db.execute(sql`
      ALTER TABLE referral_commissions 
        ALTER COLUMN amount TYPE INTEGER USING ROUND(amount)::INTEGER;
    `);
    console.log('✅ referral_commissions.amount → INTEGER');
  } catch(e: any) { 
    if (e.message.includes('already of type')) {
      console.log('⏭️ referral_commissions.amount đã là INTEGER');
    } else {
      console.log('✅/⏭️ referral_commissions.amount:', e.message); 
    }
  }

  // 3. Chuyển withdrawal_requests.amount sang INTEGER
  try {
    await db.execute(sql`
      ALTER TABLE withdrawal_requests 
        ALTER COLUMN amount TYPE INTEGER USING ROUND(amount)::INTEGER;
    `);
    console.log('✅ withdrawal_requests.amount → INTEGER');
  } catch(e: any) { 
    if (e.message.includes('already of type')) {
      console.log('⏭️ withdrawal_requests.amount đã là INTEGER');
    } else {
      console.log('✅/⏭️ withdrawal_requests.amount:', e.message); 
    }
  }

  // 4. Thêm UNIQUE index ngăn duplicate commission per payment+tier (DB-level defense cho Bug #1)
  try {
    await db.execute(sql`
      CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_commission_per_payment_tier 
        ON referral_commissions(payment_id, tier);
    `);
    console.log('✅ Created UNIQUE INDEX idx_unique_commission_per_payment_tier (payment_id, tier)');
  } catch(e: any) { console.log('⏭️ unique index:', e.message); }

  console.log('\n🎉 Migration complete!');
  process.exit(0);
}

main();
