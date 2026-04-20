import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getTrialCredits, getTrialDays, endOfDayVN } from '@/lib/app-settings';
import { findUserByReferralCode, ensureReferralCode } from '@/lib/referral-utils';
import { cookies } from 'next/headers';

import { type EmailOtpType } from '@supabase/supabase-js';

export async function GET(request: Request) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get('code');
  const token_hash = searchParams.get('token_hash');
  let next = searchParams.get('next') ?? '/dashboard';
  const type = searchParams.get('type') as EmailOtpType | null;

  if (type === 'recovery') {
    next = '/update-password';
  }

  const supabase = await createClient();
  let user = null;
  let authError = null;

  // Handle Token Hash (from the manual email template change)
  if (type && (token_hash || code)) {
    const hash = token_hash || code;
    if (hash) {
      const { data, error } = await supabase.auth.verifyOtp({
        type,
        token_hash: hash,
      });
      user = data?.user;
      authError = error;
    }
  } 
  // Handle PKCE Code (Default Magic Link / OAuth flow)
  else if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    user = data?.user;
    authError = error;
  }

  if (!authError && user) {
    try {
      const isNewUser = new Date().getTime() - new Date(user.created_at).getTime() < 60000;

      if (isNewUser) {
        // Read dynamic trial config from DB
        const trialCreditsAmount = await getTrialCredits();
        const trialDaysAmount = await getTrialDays();

        const trialExpiryDate = new Date();
        trialExpiryDate.setDate(trialExpiryDate.getDate() + trialDaysAmount);
        const normalizedTrialExpiry = endOfDayVN(trialExpiryDate); // 23:59:59 VN

        // Xử lý mã giới thiệu (từ cookie hoặc URL)
        const cookieStore = await cookies();
        const refCode = cookieStore.get('ref_code')?.value || searchParams.get('ref') || null;
        let referredById: string | null = null;

        if (refCode) {
          referredById = await findUserByReferralCode(refCode);
          // Xoá cookie sau khi xử lý
          cookieStore.delete('ref_code');
        }

        // Generate referral code cho user mới
        const newReferralCode = await ensureReferralCode(user.id);

        await db.update(profiles)
          .set({
            trialCredits: trialCreditsAmount,
            trialExpiresAt: normalizedTrialExpiry,
            firstName: user.user_metadata?.firstName || null,
            lastName: user.user_metadata?.lastName || null,
            ...(referredById ? { referredBy: referredById } : {}),
          })
          .where(eq(profiles.id, user.id));
      } else {
        // Just update email if needed for existing users
        await db.update(profiles)
          .set({ email: user.email! })
          .where(eq(profiles.id, user.id));
      }
    } catch (dbError) {
      console.error('Database insertion failed:', dbError);
    }

    return NextResponse.redirect(`${origin}${next}`, { status: 303 });
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could-not-authenticate-user`, { status: 303 });
}
