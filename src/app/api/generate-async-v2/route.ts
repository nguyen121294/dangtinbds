import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';
import { createClient } from '@/lib/supabase/server';

const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN || 'MISSING_TOKEN',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { access_token, workspaceId, imageProcessingEngine, images, signature } = body;

    if (!access_token || !workspaceId) {
      return NextResponse.json({ success: false, error: "Thiếu quyền truy cập Google Drive hoặc ID Tổ chức!" }, { status: 400 });
    }

    if (!process.env.QSTASH_TOKEN || process.env.QSTASH_TOKEN === 'MISSING_TOKEN') {
      return NextResponse.json({ success: false, error: "Thiếu biến môi trường QSTASH_TOKEN trên Server!" }, { status: 500 });
    }

    // Check Authentication & Credits
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Bạn cần đăng nhập để tạo bài viết." }, { status: 401 });
    }

    // V2: Base cost = 2 credits (tăng so với V1)
    const isBanana = imageProcessingEngine === 'replicate_banana';
    const imageCount = images && Array.isArray(images) ? images.length : 0;
    const requiredCredits = 2 + (imageCount * (isBanana ? 40 : 10));

    const { deductWorkspaceCredit } = await import('@/lib/workspace-utils');
    const deductRes = await deductWorkspaceCredit(workspaceId, user.id, requiredCredits);
    
    if (!deductRes.success) {
      return NextResponse.json({ success: false, error: deductRes.error }, { status: 403 });
    }

    const workerPayload = {
      ...body,
      signature,
      toolVersion: 'v2', // Marker
    };

    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
    const workerUrl = `${baseUrl}/api/worker-v2`;

    const res = await qstashClient.publishJSON({
      url: workerUrl,
      body: workerPayload,
      retries: 3,
    });

    return NextResponse.json({ success: true, messageId: res.messageId, workerUrl });
  } catch (error: any) {
    console.error("QStash Publish Error (V2):", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
