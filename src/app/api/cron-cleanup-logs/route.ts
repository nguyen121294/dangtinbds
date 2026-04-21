import { NextResponse } from 'next/server';
import { db } from '@/db';
import { usageLogs } from '@/db/schema';
import { lt, sql } from 'drizzle-orm';

/**
 * POST /api/cron-cleanup-logs
 * 
 * Deletes usage_logs older than 30 days.
 * Should be called by QStash schedule or Netlify scheduled function.
 * 
 * Security: Requires CRON_SECRET header to prevent unauthorized calls.
 */
export async function POST(req: Request) {
  try {
    // Simple auth check
    const authHeader = req.headers.get('authorization');
    const cronSecret = process.env.CRON_SECRET || process.env.QSTASH_TOKEN;

    if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const result = await db.delete(usageLogs)
      .where(lt(usageLogs.createdAt, thirtyDaysAgo));

    console.log(`[Cron] 🗑️  Cleaned up usage_logs older than 30 days.`);
    return NextResponse.json({ success: true, message: 'Cleanup completed' });
  } catch (error: any) {
    console.error('[Cron Cleanup] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
