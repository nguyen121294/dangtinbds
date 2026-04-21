import { config } from 'dotenv';
config({ path: '.env.local' });
import { drizzle } from 'drizzle-orm/postgres-js';
import postgres from 'postgres';
import { sql } from 'drizzle-orm';

const client = postgres(process.env.DATABASE_URL as string, { prepare: false });
const db = drizzle(client);

async function main() {
  console.log("🗄️  Migration: usage_logs table");

  try {
    await db.execute(sql`
      CREATE TABLE IF NOT EXISTS usage_logs (
        id TEXT PRIMARY KEY,
        job_id TEXT NOT NULL UNIQUE,
        workspace_id TEXT NOT NULL REFERENCES workspaces(id),
        user_id TEXT NOT NULL REFERENCES profiles(id),
        tool TEXT NOT NULL,
        credits_charged INTEGER DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'pending',
        model_used TEXT,
        error_message TEXT,
        input_summary TEXT,
        duration_ms INTEGER,
        qstash_message_id TEXT,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        completed_at TIMESTAMP WITH TIME ZONE
      );
    `);
    console.log("✅ Created table usage_logs");
  } catch(e: any) { console.log("Table:", e.message); }

  try {
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_usage_logs_workspace
      ON usage_logs(workspace_id, created_at DESC);
    `);
    console.log("✅ Created index idx_usage_logs_workspace");
  } catch(e: any) { console.log("Index workspace:", e.message); }

  try {
    await db.execute(sql`
      CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at
      ON usage_logs(created_at);
    `);
    console.log("✅ Created index idx_usage_logs_created_at");
  } catch(e: any) { console.log("Index created_at:", e.message); }

  console.log("🎉 Migration done!");
  process.exit(0);
}

main();
