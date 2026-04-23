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
      const v = parseInt(body.trial_credits, 10);
      if (isNaN(v) || v < 0 || v > 100000) {
        return NextResponse.json({ error: 'Trial credits phải từ 0 đến 100.000' }, { status: 400 });
      }
      await setAppSetting('trial_credits', String(v));
    }
    if (body.trial_days !== undefined) {
      const v = parseInt(body.trial_days, 10);
      if (isNaN(v) || v < 0 || v > 3650) {
        return NextResponse.json({ error: 'Trial days phải từ 0 đến 3650' }, { status: 400 });
      }
      await setAppSetting('trial_days', String(v));
    }

    // ✅ FIX BUG #4: Validate tỷ lệ hoa hồng server-side (0-50%)
    for (const tier of ['commission_tier1', 'commission_tier2', 'commission_tier3'] as const) {
      if (body[tier] !== undefined) {
        const rate = parseFloat(body[tier]);
        if (isNaN(rate) || rate < 0 || rate > 50) {
          return NextResponse.json({ error: `Tỷ lệ hoa hồng phải từ 0% đến 50%. Giá trị "${tier}" không hợp lệ: ${body[tier]}` }, { status: 400 });
        }
        await setAppSetting(tier, String(rate));
      }
    }

    if (body.min_withdrawal !== undefined) {
      const v = parseFloat(body.min_withdrawal);
      if (isNaN(v) || v < 0) {
        return NextResponse.json({ error: 'Ngưỡng rút tối thiểu phải >= 0' }, { status: 400 });
      }
      await setAppSetting('min_withdrawal', String(v));
    }

    // Credit pricing validation (0-1000 range)
    for (const key of ['credit_base_v1', 'credit_base_v2v3', 'credit_image_standard', 'credit_image_banana'] as const) {
      if (body[key] !== undefined) {
        const v = parseInt(body[key], 10);
        if (isNaN(v) || v < 0 || v > 1000) {
          return NextResponse.json({ error: `Giá credit phải từ 0 đến 1000. Key "${key}" không hợp lệ: ${body[key]}` }, { status: 400 });
        }
        await setAppSetting(key, String(v));
      }
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Update settings error:', error);
    return NextResponse.json({ error: 'Failed to update settings' }, { status: 500 });
  }
}
