import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/db';
import { referralCommissions, profiles } from '@/db/schema';
import { eq, desc } from 'drizzle-orm';
import { approveCommission, rejectCommission } from '@/lib/referral-utils';

export async function GET() {
  try {
    const records = await db.select({
      id: referralCommissions.id,
      beneficiaryId: referralCommissions.beneficiaryId,
      sourceUserId: referralCommissions.sourceUserId,
      paymentId: referralCommissions.paymentId,
      tier: referralCommissions.tier,
      rate: referralCommissions.rate,
      amount: referralCommissions.amount,
      status: referralCommissions.status,
      approvedAt: referralCommissions.approvedAt,
      createdAt: referralCommissions.createdAt,
    })
      .from(referralCommissions)
      .orderBy(desc(referralCommissions.createdAt))
      .limit(200);

    // Enrich with user emails
    const userIds = [...new Set([
      ...records.map(r => r.beneficiaryId),
      ...records.map(r => r.sourceUserId),
    ])];

    const userMap: Record<string, string> = {};
    for (const uid of userIds) {
      const u = await db.select({ id: profiles.id, email: profiles.email })
        .from(profiles).where(eq(profiles.id, uid)).limit(1);
      if (u[0]) userMap[uid] = u[0].email;
    }

    const enriched = records.map(r => ({
      ...r,
      beneficiaryEmail: userMap[r.beneficiaryId] || 'N/A',
      sourceEmail: userMap[r.sourceUserId] || 'N/A',
    }));

    return NextResponse.json({ success: true, commissions: enriched });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, action } = body; // action: 'approve' | 'reject'

    if (!id || !action) {
      return NextResponse.json({ error: 'Missing id or action' }, { status: 400 });
    }

    let result;
    if (action === 'approve') {
      result = await approveCommission(id);
    } else if (action === 'reject') {
      result = await rejectCommission(id);
    } else {
      return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }

    return NextResponse.json(result);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
