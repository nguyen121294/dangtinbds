import postgres from 'postgres';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
const sql = postgres(process.env.DATABASE_URL as string, { prepare: false });

async function migrate() {
  try {
    await sql.unsafe('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_drive_folder_id TEXT;');
    await sql.unsafe('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS default_drive_folder_name TEXT;');
    await sql.unsafe('ALTER TABLE profiles ADD COLUMN IF NOT EXISTS signatures TEXT[];');
    console.log("Migrated successfully");
  } catch (e) {
    console.error(e);
  } finally {
    await sql.end();
  }
}
migrate();
