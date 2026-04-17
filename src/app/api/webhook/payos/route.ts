import { payos } from '@/lib/payos';
import { db } from '@/db';
import { profiles, payments } from '@/db/schema';
import { eq, sql } from 'drizzle-orm';
import { NextResponse } from 'next/server';
import { getPlan } from '@/lib/plans';

export async function POST(request: Request) {
  let body;
  try {
    body = await request.json();
  } catch (e) {
    console.error('[Webhook] Failed to parse JSON body');
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Verify webhook signature (Crucial for production security)
  let verifiedData;
  try {
    // PayOS SDK requires the body as-is for verification
    verifiedData = payos.verifyPaymentWebhookData(body);
    console.log('[Webhook] Signature verified successfully');
  } catch (err: any) {
    console.error('[Webhook] Invalid signature verification failed:', err.message);
    return NextResponse.json({ error: 'Invalid signature' }, { status: 400 });
  }

  // Use the verified data for processing
  const { orderCode, code: paymentCode } = verifiedData;
  console.log(`[Webhook] Processing order ${orderCode} with code: ${paymentCode}`);

  // PayOS Webhook reports success using code '00'
  if (paymentCode === '00') {
    try {
      // 1. Find the payment record to get userId and plan
      const payment = await db.query.payments.findFirst({
        where: eq(payments.id, String(orderCode)),
      });

      if (!payment) {
        console.error(`[Webhook] Payment record not found for order ${orderCode}`);
        return NextResponse.json({ success: true }); // Still return 200 to PayOS
      }

      if (!payment.userId) {
        console.error(`[Webhook] No userId associated with order ${orderCode}`);
        return NextResponse.json({ success: true });
      }

      // 2. Update payment status
      await db.update(payments)
        .set({ status: 'paid' })
        .where(eq(payments.id, String(orderCode)));

      // 3. Look up plan to determine expiry days and credits
      const plan = await getPlan(payment.plan ?? 'plus');
      const days = plan?.days ?? 30;
      const creditsToAdd = plan?.creditsOffered ?? 100;

      const profile = await db.query.profiles.findFirst({
        where: eq(profiles.id, payment.userId),
      });

      const now = new Date();
      let expirationDate = new Date();
      
      if (profile?.subscriptionExpiresAt && new Date(profile.subscriptionExpiresAt) > now) {
        // Đang còn hạn -> Cộng dồn từ ngày hết hạn cũ
        expirationDate = new Date(profile.subscriptionExpiresAt);
        expirationDate.setDate(expirationDate.getDate() + days);
      } else {
        // Đã hết hạn hoặc chưa có -> Tính từ hôm nay
        expirationDate.setDate(expirationDate.getDate() + days);
      }

      // 4. Update user subscription with correct expiry and plan info, and increment credits
      await db.update(profiles)
        .set({
          subscriptionStatus: 'active',
          subscriptionExpiresAt: expirationDate,
          subscriptionId: plan?.id ?? payment.plan,
          paidCredits: sql`${profiles.paidCredits} + ${creditsToAdd}`,
        })
        .where(eq(profiles.id, payment.userId));

      console.log(`[Webhook] SUCCESS: User ${payment.userId} subscribed to "${plan?.name || payment.plan}". Added ${creditsToAdd} credits. Expires: ${expirationDate.toISOString()}`);
    } catch (dbError) {
      console.error(`[Webhook] Database error processing order ${orderCode}:`, dbError);
      // We return 500 so PayOS might retry the webhook later
      return NextResponse.json({ error: 'Database error' }, { status: 500 });
    }
  } else {
    // If PayOS adds cancel webhooks in the future with different codes
    console.log(`[Webhook] Order ${orderCode} received code ${paymentCode}, ignoring or marking failed.`);
    try {
      const payment = await db.query.payments.findFirst({
        where: eq(payments.id, String(orderCode)),
      });

      if (payment && payment.status === 'pending') {
        await db.update(payments)
          .set({ status: 'cancelled' })
          .where(eq(payments.id, String(orderCode)));

        console.log(`[Webhook] Order ${orderCode} marked as failed/cancelled.`);
      }
    } catch (e) {
      console.error(`[Webhook] Error updating cancelled state for ${orderCode}:`, e);
    }
  }

  return NextResponse.json({ success: true });
}
