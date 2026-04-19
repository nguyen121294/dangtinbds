// Load env BEFORE any other imports
require('dotenv').config({ path: '.env.local' });

import { sql } from 'drizzle-orm';
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';

async function main() {
  const client = postgres(process.env.DATABASE_URL!, { prepare: false });
  const db = drizzle(client);

  await db.execute(sql`
    CREATE TABLE IF NOT EXISTS app_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TIMESTAMP DEFAULT NOW()
    )
  `);
  console.log('SUCCESS: app_settings table created');
  
  // Seed default values
  await db.execute(sql`
    INSERT INTO app_settings (key, value) VALUES ('trial_credits', '200')
    ON CONFLICT (key) DO NOTHING
  `);
  await db.execute(sql`
    INSERT INTO app_settings (key, value) VALUES ('trial_days', '15')
    ON CONFLICT (key) DO NOTHING
  `);
  console.log('SUCCESS: Default settings seeded');
  
  await client.end();
  process.exit(0);
}

main().catch(e => {
  console.error('ERROR:', e);
  process.exit(1);
});
