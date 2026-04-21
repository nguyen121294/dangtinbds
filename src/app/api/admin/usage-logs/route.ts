import { NextResponse } from 'next/server';
import { db } from '@/db';
import { usageLogs, profiles } from '@/db/schema';
import { desc, eq, sql } from 'drizzle-orm';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function GET() {
  const isAuthenticated = await verifyAdminSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    // Join usage_logs with profiles to get email
    const logs = await db
      .select({
        id: usageLogs.id,
        jobId: usageLogs.jobId,
        workspaceId: usageLogs.workspaceId,
        userId: usageLogs.userId,
        userEmail: profiles.email,
        tool: usageLogs.tool,
        creditsCharged: usageLogs.creditsCharged,
        status: usageLogs.status,
        modelUsed: usageLogs.modelUsed,
        errorMessage: usageLogs.errorMessage,
        inputSummary: usageLogs.inputSummary,
        durationMs: usageLogs.durationMs,
        qstashMessageId: usageLogs.qstashMessageId,
        createdAt: usageLogs.createdAt,
        completedAt: usageLogs.completedAt,
      })
      .from(usageLogs)
      .leftJoin(profiles, eq(usageLogs.userId, profiles.id))
      .orderBy(desc(usageLogs.createdAt))
      .limit(500);

    // Summary stats
    const stats = await db
      .select({
        totalJobs: sql<number>`count(*)`,
        totalCredits: sql<number>`coalesce(sum(${usageLogs.creditsCharged}), 0)`,
        successCount: sql<number>`count(*) filter (where ${usageLogs.status} = 'success')`,
        failedCount: sql<number>`count(*) filter (where ${usageLogs.status} = 'failed')`,
        pendingCount: sql<number>`count(*) filter (where ${usageLogs.status} = 'pending')`,
      })
      .from(usageLogs);

    return NextResponse.json({
      success: true,
      logs,
      stats: stats[0],
    });
  } catch (error: any) {
    console.error('Admin usage logs error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
