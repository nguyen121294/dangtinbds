import { createClient } from '@/lib/supabase/server';
import { payos } from '@/lib/payos';
import { NextResponse } from 'next/server';
import { db } from '@/db';
import { payments } from '@/db/schema';
import { getPlan } from '@/lib/plans';

export async function POST(request: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  let body;
  try {
    body = await request.json();
  } catch (e) {
    return NextResponse.json({ error: 'Invalid JSON' }, { status: 400 });
  }

  // Read plan from body, default to 'plus'
  const planId = body.planId ?? 'plus';
  const plan = await getPlan(planId);

  if (!plan || plan.id === 'free') {
    return NextResponse.json({ error: 'Invalid plan' }, { status: 400 });
  }

  const orderCode = Number(String(Date.now()).slice(-9));
  const appUrl = (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');

  const paymentLinkData = {
    orderCode: orderCode,
    amount: plan.price,
    description: `${plan.name} ${plan.days}d`,
    cancelUrl: `${appUrl}/pricing?cancelOrder=${orderCode}`,
    returnUrl: `${appUrl}/success`,
  };

  try {
    const paymentLink = await payos.paymentRequests.create(paymentLinkData);

    // Log payment attempt with plan info
    await db.insert(payments).values({
      id: String(orderCode),
      userId: user.id,
      amount: plan.price,
      status: 'pending',
      plan: plan.id,
    });

    return NextResponse.json({ checkoutUrl: paymentLink.checkoutUrl });
  } catch (error) {
    console.error('PayOS error:', error);
    return NextResponse.json({ error: 'Failed to create payment link' }, { status: 500 });
  }
}
