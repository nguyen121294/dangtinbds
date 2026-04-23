import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { propertyRecords, workspaceMembers } from '@/db/schema';
import { eq, and, desc } from 'drizzle-orm';

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const workspaceId = req.nextUrl.searchParams.get('workspaceId');
    if (!workspaceId) {
      return NextResponse.json({ success: false, error: "Missing workspaceId" }, { status: 400 });
    }

    // Verify user belongs to workspace
    const membership = await db.select().from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
      .limit(1);

    if (membership.length === 0) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    const records = await db.select()
      .from(propertyRecords)
      .where(eq(propertyRecords.workspaceId, workspaceId))
      .orderBy(desc(propertyRecords.createdAt));

    return NextResponse.json({ success: true, records });
  } catch (error: any) {
    console.error("[Properties API] GET error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { id, workspaceId } = body;

    if (!id || !workspaceId) {
      return NextResponse.json({ success: false, error: "Missing id or workspaceId" }, { status: 400 });
    }

    // Verify user belongs to workspace
    const membership = await db.select().from(workspaceMembers)
      .where(and(eq(workspaceMembers.workspaceId, workspaceId), eq(workspaceMembers.userId, user.id)))
      .limit(1);

    if (membership.length === 0) {
      return NextResponse.json({ success: false, error: "Access denied" }, { status: 403 });
    }

    await db.delete(propertyRecords)
      .where(and(eq(propertyRecords.id, id), eq(propertyRecords.workspaceId, workspaceId)));

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error("[Properties API] DELETE error:", error.message);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
