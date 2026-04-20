import { config } from 'dotenv';
config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const client = postgres(process.env.DATABASE_URL as string, { prepare: false });
const db = drizzle(client);

async function main() {
  console.log('🔄 Adding custom_prompt_v2 column to profiles...');
  
  try {
    await db.execute(sql`ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_prompt_v2 TEXT`);
    console.log('✅ Done: custom_prompt_v2 column added.');
  } catch (error: any) {
    console.error('❌ Error:', error.message);
  }
  
  process.exit(0);
}

main();
