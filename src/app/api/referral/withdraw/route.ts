import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { profiles, withdrawalRequests } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { getMinWithdrawal } from '@/lib/referral-utils';

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

    const body = await req.json();
    const { amount, phone, bankAccount, bankName } = body;

    if (!amount || !phone || !bankAccount || !bankName) {
      return NextResponse.json({ error: 'Vui lòng điền đầy đủ thông tin.' }, { status: 400 });
    }

    // Lấy profile
    const profile = await db.select({
      commissionBalance: profiles.commissionBalance,
      subscriptionStatus: profiles.subscriptionStatus,
    }).from(profiles).where(eq(profiles.id, user.id)).limit(1);

    if (!profile[0]) return NextResponse.json({ error: 'Profile not found' }, { status: 404 });

    // Kiểm tra gói đang active (điều kiện tại thời điểm TẠO yêu cầu)
    if (profile[0].subscriptionStatus !== 'active') {
      return NextResponse.json({ error: 'Bạn cần có gói trả phí đang hoạt động để rút tiền.' }, { status: 403 });
    }

    // Kiểm tra số dư tối thiểu
    const minWithdrawal = await getMinWithdrawal();
    const balance = profile[0].commissionBalance || 0;

    if (balance < minWithdrawal) {
      return NextResponse.json({
        error: `Số dư tối thiểu để rút là ${minWithdrawal.toLocaleString('vi-VN')}đ. Hiện tại: ${balance.toLocaleString('vi-VN')}đ.`
      }, { status: 400 });
    }

    if (amount > balance) {
      return NextResponse.json({ error: 'Số tiền rút vượt quá số dư ví.' }, { status: 400 });
    }

    if (amount < minWithdrawal) {
      return NextResponse.json({
        error: `Số tiền rút tối thiểu là ${minWithdrawal.toLocaleString('vi-VN')}đ.`
      }, { status: 400 });
    }

    // Tạo yêu cầu rút tiền
    await db.insert(withdrawalRequests).values({
      id: crypto.randomUUID(),
      userId: user.id,
      amount,
      phone,
      bankAccount,
      bankName,
      status: 'pending',
      userSubStatusAtRequest: profile[0].subscriptionStatus,
    });

    return NextResponse.json({ success: true, message: 'Yêu cầu rút tiền đã được gửi. Vui lòng chờ Admin xử lý.' });
  } catch (err: any) {
    console.error('Withdrawal API error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
