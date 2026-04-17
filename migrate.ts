import { config } from 'dotenv';
config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/postgres-js'; 
import postgres from 'postgres'; 
import { sql } from 'drizzle-orm'; 

const client = postgres(process.env.DATABASE_URL as string, { prepare: false }); 
const db = drizzle(client); 

async function main() { 
  console.log("DB", process.env.DATABASE_URL);
  try { 
    await db.execute(sql`ALTER TABLE profiles RENAME COLUMN credits TO trial_credits;`); 
    console.log("Renamed credits to trial_credits");
  } catch(e: any) { console.log(e.message) } 
  try{ 
    await db.execute(sql`ALTER TABLE profiles ADD COLUMN trial_expires_at TIMESTAMP;`); 
    console.log("Added trial_expires_at");
  } catch(e: any){ console.log(e.message) } 
  try{ 
    await db.execute(sql`ALTER TABLE profiles ADD COLUMN paid_credits INTEGER DEFAULT 0;`); 
    console.log("Added paid_credits");
  } catch(e: any){ console.log(e.message) } 
  try{ 
    await db.execute(sql`ALTER TABLE workspace_members ADD COLUMN credit_limit INTEGER NOT NULL DEFAULT 0;`); 
    console.log("Added credit_limit");
  } catch(e: any){ console.log(e.message) } 
  try{ 
    await db.execute(sql`ALTER TABLE workspace_members ADD COLUMN credits_used INTEGER NOT NULL DEFAULT 0;`); 
    console.log("Added credits_used");
  } catch(e: any){ console.log(e.message) } 
  
  console.log('Done'); 
  process.exit(0); 
} 

main();
