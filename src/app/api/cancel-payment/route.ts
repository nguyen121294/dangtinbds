import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { payments } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { NextResponse } from 'next/server';

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { orderCode } = await request.json();

    if (!orderCode) {
      return NextResponse.json({ error: 'Missing orderCode' }, { status: 400 });
    }

    const payment = await db.query.payments.findFirst({
      where: eq(payments.id, String(orderCode)),
    });

    if (!payment) {
      return NextResponse.json({ error: 'Payment not found' }, { status: 404 });
    }

    if (payment.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Only cancel if it's still pending
    if (payment.status === 'pending') {
      await db.update(payments)
        .set({ status: 'cancelled' })
        .where(eq(payments.id, String(orderCode)));
        
      console.log(`[CancelPayment] Order ${orderCode} marked as cancelled.`);
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('[CancelPayment] Error:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
