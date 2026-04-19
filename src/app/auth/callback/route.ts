import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { profiles } from '@/db/schema';
import { getTrialCredits, getTrialDays } from '@/lib/app-settings';

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
      // Read dynamic trial config from DB
      const trialCreditsAmount = await getTrialCredits();
      const trialDaysAmount = await getTrialDays();

      const trialExpiryDate = new Date();
      trialExpiryDate.setDate(trialExpiryDate.getDate() + trialDaysAmount);

      await db.insert(profiles)
        .values({
          id: user.id,
          email: user.email!,
          firstName: user.user_metadata?.firstName || null,
          lastName: user.user_metadata?.lastName || null,
          trialCredits: trialCreditsAmount,
          trialExpiresAt: trialExpiryDate,
        })
        .onConflictDoUpdate({
          target: profiles.id,
          set: { email: user.email! }
        });
    } catch (dbError) {
      console.error('Database insertion failed:', dbError);
    }

    return NextResponse.redirect(`${origin}${next}`, { status: 303 });
  }

  // return the user to an error page with instructions
  return NextResponse.redirect(`${origin}/login?error=Could-not-authenticate-user`, { status: 303 });
}
