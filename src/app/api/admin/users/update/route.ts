import { NextResponse } from 'next/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function POST(request: Request) {
  const isAuthenticated = await verifyAdminSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id, trialCredits, trialExpiresAt, paidCredits, subscriptionId, subscriptionStatus, subscriptionExpiresAt, status, referredBy } = await request.json();

    await db.update(profiles)
      .set({
        trialCredits: trialCredits ?? 0,
        trialExpiresAt: trialExpiresAt ? new Date(trialExpiresAt) : null,
        paidCredits: paidCredits ?? 0,
        subscriptionId,
        subscriptionStatus,
        subscriptionExpiresAt: subscriptionExpiresAt ? new Date(subscriptionExpiresAt) : null,
        status: status || 'active',
        referredBy: referredBy !== undefined ? referredBy : undefined,
      })
      .where(eq(profiles.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update user error:', error);
    return NextResponse.json({ error: 'Failed to update user' }, { status: 500 });
  }
}
