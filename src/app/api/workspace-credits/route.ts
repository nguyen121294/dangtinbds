import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { workspaces, workspaceMembers, profiles } from '@/db/schema';
import { eq, and } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const workspaceId = searchParams.get('workspaceId');

    if (!workspaceId) {
      return NextResponse.json({ success: false, error: 'Thiếu workspaceId' }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: 'Chưa đăng nhập' }, { status: 401 });
    }

    // Lấy thông tin thành viên trong workspace này
    const memberRecord = await db.select()
      .from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
      .limit(1);

    if (!memberRecord || memberRecord.length === 0) {
      return NextResponse.json({ success: false, error: 'Không có quyền truy cập workspace này' }, { status: 403 });
    }

    const role = memberRecord[0].role;
    const creditLimit = memberRecord[0].creditLimit || 0;
    const creditsUsed = memberRecord[0].creditsUsed || 0;

    // Lấy thông tin Owner của workspace
    const ws = await db.select({ ownerId: workspaces.ownerId })
      .from(workspaces)
      .where(eq(workspaces.id, workspaceId))
      .limit(1);
      
    if (!ws || ws.length === 0) return NextResponse.json({ success: false, error: 'Tổ chức không hợp lệ' }, { status: 404 });

    const ownerId = ws[0].ownerId;
    const ownerProfile = await db.select().from(profiles).where(eq(profiles.id, ownerId)).limit(1);
    
    if (!ownerProfile || ownerProfile.length === 0) return NextResponse.json({ success: false, error: 'Invalid owner' }, { status: 404 });

    const owner = ownerProfile[0];
    const now = new Date();

    const isTrialExpired = owner.trialExpiresAt ? new Date(owner.trialExpiresAt) <= now : false;
    const ownerTrial = !isTrialExpired ? (owner.trialCredits || 0) : 0;
    
    const isPaidExpired = owner.subscriptionExpiresAt ? new Date(owner.subscriptionExpiresAt) <= now : false;
    const ownerPaid = !isPaidExpired ? (owner.paidCredits || 0) : 0;

    const ownerTotalUsable = ownerTrial + ownerPaid;

    let usableCreditsForMember = 0;

    // Owner có toàn quyền số dư của mình, Member thì bị kẹp bởi định mức và số dư thực của owner
    if (role === 'owner') {
      usableCreditsForMember = ownerTotalUsable;
    } else {
      const remainingLimit = Math.max(0, creditLimit - creditsUsed);
      usableCreditsForMember = Math.min(remainingLimit, ownerTotalUsable);
    }

    return NextResponse.json({
      success: true,
      credits: usableCreditsForMember
    });
  } catch (err: any) {
    return NextResponse.json({ success: false, error: err.message }, { status: 500 });
  }
}
