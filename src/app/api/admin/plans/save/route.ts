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
    const plan = await request.json();

    await db.insert(plans)
      .values({
        id: plan.id,
        name: plan.name,
        price: plan.price,
        days: plan.days,
        description: plan.description,
        features: plan.features,
        maxWorkspaces: plan.maxWorkspaces || 1,
        maxInvites: plan.maxInvites || 0,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: plans.id,
        set: {
          name: plan.name,
          price: plan.price,
          days: plan.days,
          description: plan.description,
          features: plan.features,
          maxWorkspaces: plan.maxWorkspaces || 1,
          maxInvites: plan.maxInvites || 0,
          updatedAt: new Date(),
        }
      });

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Save plan error:', error);
    return NextResponse.json({ error: 'Failed to save plan' }, { status: 500 });
  }
}
