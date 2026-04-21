import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { usageLogs, workspaceMembers } from '@/db/schema';
import { eq, and, desc, lt } from 'drizzle-orm';

/**
 * GET /api/usage-logs?workspaceId=xxx&limit=50&admin=true
 * 
 * User view (default): tool, creditsCharged, status, createdAt
 * Admin view (admin=true): + modelUsed, errorMessage, durationMs, inputSummary, qstashMessageId
 */
export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');
    const isAdmin = searchParams.get('admin') === 'true';
    const limit = Math.min(parseInt(searchParams.get('limit') || '50', 10), 100);

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'workspaceId required' }, { status: 400 });
    }

    // Verify user is a member of this workspace
    const membership = await db.select({ role: workspaceMembers.role })
      .from(workspaceMembers)
      .where(and(
        eq(workspaceMembers.workspaceId, workspaceId),
        eq(workspaceMembers.userId, user.id)
      ))
      .limit(1);

    if (!membership[0]) {
      return NextResponse.json({ success: false, error: 'Not a member' }, { status: 403 });
    }

    // Select fields based on view type
    if (isAdmin && (membership[0].role === 'owner' || membership[0].role === 'admin')) {
      // Full audit view for owner/admin
      const logs = await db.select({
        id: usageLogs.id,
        tool: usageLogs.tool,
        creditsCharged: usageLogs.creditsCharged,
        status: usageLogs.status,
        modelUsed: usageLogs.modelUsed,
        errorMessage: usageLogs.errorMessage,
        inputSummary: usageLogs.inputSummary,
        durationMs: usageLogs.durationMs,
        qstashMessageId: usageLogs.qstashMessageId,
        userId: usageLogs.userId,
        createdAt: usageLogs.createdAt,
        completedAt: usageLogs.completedAt,
      })
        .from(usageLogs)
        .where(eq(usageLogs.workspaceId, workspaceId))
        .orderBy(desc(usageLogs.createdAt))
        .limit(limit);

      return NextResponse.json({ success: true, logs, view: 'admin' });
    } else {
      // Lightweight user view
      const logs = await db.select({
        id: usageLogs.id,
        tool: usageLogs.tool,
        creditsCharged: usageLogs.creditsCharged,
        status: usageLogs.status,
        createdAt: usageLogs.createdAt,
      })
        .from(usageLogs)
        .where(eq(usageLogs.workspaceId, workspaceId))
        .orderBy(desc(usageLogs.createdAt))
        .limit(limit);

      return NextResponse.json({ success: true, logs, view: 'user' });
    }
  } catch (error: any) {
    console.error('[Usage Logs API] Error:', error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
