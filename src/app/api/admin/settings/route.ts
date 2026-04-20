import { NextResponse } from 'next/server';
import { verifyAdminSession } from '@/lib/admin-auth';
import { setAppSetting } from '@/lib/app-settings';

export async function POST(request: Request) {
  const isAuthenticated = await verifyAdminSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const body = await request.json();

    if (body.trial_credits !== undefined) {
      await setAppSetting('trial_credits', String(body.trial_credits));
    }
    if (body.trial_days !== undefined) {
      await setAppSetting('trial_days', String(body.trial_days));
    }
    if (body.commission_tier1 !== undefined) {
      await setAppSetting('commission_tier1', String(body.commission_tier1));
    }
    if (body.commission_tier2 !== undefined) {
      await setAppSetting('commission_tier2', String(body.commission_tier2));
    }
    if (body.commission_tier3 !== undefined) {
      await setAppSetting('commission_tier3', String(body.commission_tier3));
    }
    if (body.min_withdrawal !== undefined) {
      await setAppSetting('min_withdrawal', String(body.min_withdrawal));
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
