import { NextResponse } from 'next/server';
import { db } from '@/db';
import { plans } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { verifyAdminSession } from '@/lib/admin-auth';

export async function POST(request: Request) {
  const isAuthenticated = await verifyAdminSession();
  if (!isAuthenticated) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { id } = await request.json();

    if (id === 'free') {
       return NextResponse.json({ error: 'Không thể xóa gói Mặc định (Free)' }, { status: 400 });
    }

    await db.delete(plans).where(eq(plans.id, id));

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete plan error:', error);
    return NextResponse.json({ error: 'Failed to delete plan' }, { status: 500 });
  }
}
