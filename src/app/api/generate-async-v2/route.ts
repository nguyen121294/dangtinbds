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

    // 1. Authenticate user
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();

    if (!user) {
      return NextResponse.json({ success: false, error: "Bạn cần đăng nhập để tạo bài viết." }, { status: 401 });
    }

    // 2. Calculate cost
    const isBanana = imageProcessingEngine === 'replicate_banana';
    const imageCount = images && Array.isArray(images) ? images.length : 0;
    const requiredCredits = 2 + (imageCount * (isBanana ? 40 : 10));

    // 3. Check credit balance BEFORE publishing (pre-flight validation only, no deduction yet)
    const { checkCreditBalance, deductWorkspaceCredit } = await import('@/lib/workspace-utils');
    const balanceCheck = await checkCreditBalance(workspaceId, user.id, requiredCredits);
    if (!balanceCheck.success) {
      return NextResponse.json({ success: false, error: balanceCheck.error }, { status: 403 });
    }

    // 4. Build payload and publish to QStash FIRST
    const workerPayload = {
      ...body,
      signature,
      toolVersion: 'v2',
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

    // 5. Only deduct credits AFTER QStash publish is confirmed successful
    const deductRes = await deductWorkspaceCredit(workspaceId, user.id, requiredCredits);
    if (!deductRes.success) {
      // Job is already queued — log the error but don't fail the request.
      // This edge case is extremely rare (publish ok, DB write fails).
      console.error(`[V2] Credit deduction failed after successful publish. User: ${user.id}, Workspace: ${workspaceId}, Credits: ${requiredCredits}`, deductRes.error);
    }

    return NextResponse.json({ success: true, messageId: res.messageId, workerUrl });
  } catch (error: any) {
    console.error("QStash Publish Error (V2):", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
