import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';
import { createClient } from '@/lib/supabase/server';
import { db } from '@/db';
import { usageLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN || 'MISSING_TOKEN',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { access_token, workspaceId, imageProcessingEngine, images, imagesToEdit, signature } = body;
    const editList = imagesToEdit || images || [];

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

    // 2. Calculate cost from app_settings (configurable by Super Admin)
    const { getCreditPricing } = await import('@/lib/app-settings');
    const pricing = await getCreditPricing();
    const isBanana = imageProcessingEngine === 'replicate_banana';
    const imageCount = editList.length;
    const requiredCredits = pricing.creditBaseV2V3 + (imageCount * (isBanana ? pricing.creditImageBanana : pricing.creditImageStandard));

    // 3. Check credit balance (pre-flight only — NO deduction here)
    const { checkCreditBalance } = await import('@/lib/workspace-utils');
    const balanceCheck = await checkCreditBalance(workspaceId, user.id, requiredCredits);
    if (!balanceCheck.success) {
      return NextResponse.json({ success: false, error: balanceCheck.error }, { status: 403 });
    }

    // 4. Generate unique jobId for idempotency + create usage log
    const jobId = randomUUID();
    const inputSummary = body.rawInfo ? String(body.rawInfo).substring(0, 200) : null;

    await db.insert(usageLogs).values({
      id: randomUUID(),
      jobId,
      workspaceId,
      userId: user.id,
      tool: 'v2_assistant',
      creditsCharged: 0, // Will be updated by worker on success
      status: 'pending',
      inputSummary,
    });

    // 5. Build payload and publish to QStash (no credit deduction!)
    const workerPayload = {
      ...body,
      signature,
      toolVersion: 'v2',
      // Pass job metadata so worker can deduct + update log
      jobId,
      requiredCredits,
      workspaceId,
      userId: user.id,
    };

    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
    const workerUrl = `${baseUrl}/api/worker-v2`;

    const res = await qstashClient.publishJSON({
      url: workerUrl,
      body: workerPayload,
      retries: 2,
    });

    // 6. Update log with QStash message ID
    await db.update(usageLogs)
      .set({ qstashMessageId: res.messageId })
      .where(eq(usageLogs.jobId, jobId));

    return NextResponse.json({
      success: true,
      messageId: res.messageId,
      jobId,
      message: "Yêu cầu đã được gửi. Credit sẽ chỉ bị trừ khi xử lý hoàn thành thành công."
    });
  } catch (error: any) {
    console.error("QStash Publish Error (V2):", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
