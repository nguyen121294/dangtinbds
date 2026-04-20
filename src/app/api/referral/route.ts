import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { profiles, referralCommissions } from '@/db/schema';
import { eq, desc, gte, and } from 'drizzle-orm';
import { ensureReferralCode, getMinWithdrawal } from '@/lib/referral-utils';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    // Ensure user has a referral code
    const referralCode = await ensureReferralCode(user.id);

    // Get profile info
    const profile = await db.select({
      commissionBalance: profiles.commissionBalance,
      referredBy: profiles.referredBy,
      subscriptionStatus: profiles.subscriptionStatus,
    }).from(profiles).where(eq(profiles.id, user.id)).limit(1);

    const balance = profile[0]?.commissionBalance || 0;
    const isActive = profile[0]?.subscriptionStatus === 'active';

    // Get commission history (last 3 months)
    const threeMonthsAgo = new Date();
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);

    const history = await db.select({
      id: referralCommissions.id,
      sourceUserId: referralCommissions.sourceUserId,
      tier: referralCommissions.tier,
      rate: referralCommissions.rate,
      amount: referralCommissions.amount,
      status: referralCommissions.status,
      createdAt: referralCommissions.createdAt,
    })
      .from(referralCommissions)
      .where(and(
        eq(referralCommissions.beneficiaryId, user.id),
        gte(referralCommissions.createdAt, threeMonthsAgo)
      ))
      .orderBy(desc(referralCommissions.createdAt))
      .limit(100);

    // Enrich history with source user emails
    const sourceUserIds = [...new Set(history.map(h => h.sourceUserId))];
    const sourceUsers = sourceUserIds.length > 0
      ? await db.select({ id: profiles.id, email: profiles.email, firstName: profiles.firstName })
        .from(profiles)
        .where(eq(profiles.id, sourceUserIds[0])) // Simple query for now
      : [];
    
    // Build lookup for all source users
    const userLookup: Record<string, string> = {};
    for (const uid of sourceUserIds) {
      const u = await db.select({ id: profiles.id, email: profiles.email })
        .from(profiles).where(eq(profiles.id, uid)).limit(1);
      if (u[0]) userLookup[uid] = u[0].email;
    }

    const enrichedHistory = history.map(h => ({
      ...h,
      sourceEmail: userLookup[h.sourceUserId] || 'N/A',
    }));

    // Count F1 referrals
    const f1Count = await db.select({ id: profiles.id })
      .from(profiles)
      .where(eq(profiles.referredBy, user.id));

    const minWithdrawal = await getMinWithdrawal();

    return NextResponse.json({
      success: true,
      referralCode,
      balance,
      isActive,
      canWithdraw: balance >= minWithdrawal && isActive,
      minWithdrawal,
      f1Count: f1Count.length,
      history: enrichedHistory,
    });
  } catch (err: any) {
    console.error('Referral API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
