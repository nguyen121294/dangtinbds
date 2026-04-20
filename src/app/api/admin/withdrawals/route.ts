import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { withdrawalRequests, profiles } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { completeWithdrawal, rejectWithdrawal } from '@/lib/referral-utils';

export async function GET() {
  try {
    const records = await db.select()
      .from(withdrawalRequests)
      .orderBy(desc(withdrawalRequests.createdAt))
      .limit(200);

    // Enrich with user emails
    const userIds = [...new Set(records.map(r => r.userId))];
    const userMap: Record<string, string> = {};
    for (const uid of userIds) {
      const u = await db.select({ id: profiles.id, email: profiles.email })
        .from(profiles).where(eq(profiles.id, uid)).limit(1);
      if (u[0]) userMap[uid] = u[0].email;
    }

    const enriched = records.map(r => ({
      ...r,
      userEmail: userMap[r.userId] || 'N/A',
    }));

    return NextResponse.json({ success: true, withdrawals: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action } = body; // action: 'complete' | 'reject'

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    let result;
    if (action === 'complete') {
      result = await completeWithdrawal(id);
    } else if (action === 'reject') {
      result = await rejectWithdrawal(id);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
