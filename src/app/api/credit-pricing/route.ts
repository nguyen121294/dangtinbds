import { NextResponse } from 'next/server';
import { getCreditPricing } from '@/lib/app-settings';

export async function GET() {
  try {
    const pricing = await getCreditPricing();
    return NextResponse.json({ success: true, pricing });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
