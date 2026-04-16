import { createClient } from '@/lib/supabase/server';
import { payos } from '@/lib/payos';
import { db } from '@/db';
import { profiles, payments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getPlan } from '@/lib/plans';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      console.error('[ConfirmPayment] No user session found');
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    let body;
    try {
      body = await request.json();
    } catch (e) {
      console.error('[ConfirmPayment] Failed to parse JSON body');
      return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
    }

    const { orderCode } = body;

    if (!orderCode) {
      console.error('[ConfirmPayment] Missing orderCode in body');
      return NextResponse.json({ error: 'Missing orderCode' }, { status: 400 });
    }

    console.log(`[ConfirmPayment] Validating order ${orderCode} for user ${user.id}`);

    // 1. Find the payment record
    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, String(orderCode)),
    });

    if (!payment) {
      console.error(`[ConfirmPayment] Payment record not found for order ${orderCode}`);
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    // Guard: only the owner can confirm their own payment
    if (payment.userId !== user.id) {
      console.error(`[ConfirmPayment] User mismatch: expected ${payment.userId}, got ${user.id}`);
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // If already marked paid, nothing to do
    if (payment.status === 'paid') {
      console.log(`[ConfirmPayment] Order ${orderCode} is already marked as PAID`);
      return NextResponse.json({ success: true, alreadyPaid: true });
    }

    // 2. Call PayOS API to verify actual payment status
    let paymentInfo;
    try {
      paymentInfo = await payos.paymentRequests.get(String(orderCode));
    } catch (e) {
      console.error(`[ConfirmPayment] PayOS API call failed for order ${orderCode}:`, e);
      return NextResponse.json({ error: 'Failed to verify with PayOS' }, { status: 502 });
    }

    console.log(`[ConfirmPayment] PayOS status for ${orderCode}: ${paymentInfo.status}`);

    if (paymentInfo.status !== 'PAID') {
      return NextResponse.json({ success: false, status: paymentInfo.status });
    }

    // 3. Update payment record
    await db.update(payments)
      .set({ status: 'paid' })
      .where(eq(payments.id, String(orderCode)));

    // 4. Calculate subscription expiry from plan
    const plan = await getPlan(payment.plan ?? 'plus');
    const days = plan?.days ?? 30;

    const expirationDate = new Date();
    expirationDate.setDate(expirationDate.getDate() + days);

    // 5. Activate subscription
    await db.update(profiles)
      .set({
        subscriptionStatus: 'active',
        subscriptionExpiresAt: expirationDate,
        subscriptionId: plan?.id ?? payment.plan,
      })
      .where(eq(profiles.id, user.id));

    console.log(`[ConfirmPayment] SUCCESS: User ${user.id} activated "${plan?.name || payment.plan}" for ${days} days.`);

    return NextResponse.json({
      success: true,
      plan: plan?.name || payment.plan,
      expiresAt: expirationDate.toISOString(),
    });
  } catch (error: any) {
    console.error('[ConfirmPayment] UNHANDLED ERROR:', error?.message || error);
    return NextResponse.json({ error: 'Internal server error', message: error?.message }, { status: 500 });
  }
}
