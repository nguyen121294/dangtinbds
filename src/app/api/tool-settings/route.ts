import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { db } from "@/db";
import { profiles } from "@/db/schema";
import { eq } from "drizzle-orm";

export async function GET(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const profileRecords = await db.select().from(profiles).where(eq(profiles.id, userId)).limit(1);

    if (!profileRecords.length) {
       return NextResponse.json({ success: false, error: "Profile not found" }, { status: 404 });
    }

    const { defaultDriveFolderId, defaultDriveFolderName, signatures } = profileRecords[0];

    return NextResponse.json({ 
      success: true, 
      defaultDriveFolderId, 
      defaultDriveFolderName, 
      signatures: signatures || []
    });
  } catch (error: any) {
    console.error("Error fetching tool settings:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { session } } = await supabase.auth.getSession();

    if (!session || !session.user) {
      return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
    }

    const userId = session.user.id;
    const body = await req.json();
    const { defaultDriveFolderId, defaultDriveFolderName, signatures } = body;

    await db.update(profiles)
      .set({
         defaultDriveFolderId: defaultDriveFolderId !== undefined ? defaultDriveFolderId : undefined,
         defaultDriveFolderName: defaultDriveFolderName !== undefined ? defaultDriveFolderName : undefined,
         signatures: signatures !== undefined ? signatures : undefined,
      })
      .where(eq(profiles.id, userId));

    return NextResponse.json({ success: true, message: "Cập nhật cấu hình thành công" });
  } catch (error: any) {
    console.error("Error updating tool settings:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
