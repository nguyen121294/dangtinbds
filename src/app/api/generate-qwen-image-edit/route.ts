import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';
import { createClient } from '@/lib/supabase/server';
import { google } from 'googleapis';
import { db } from '@/db';
import { usageLogs } from '@/db/schema';
import { randomUUID } from 'crypto';

const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN || 'MISSING_TOKEN',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { access_token, workspaceId, prompt, driveFolderId, taskName } = body;

    // imagesToEdit: array of Drive file IDs (uploaded via /api/upload-drive-temp)
    const editList: string[] = body.imagesToEdit || [];

    if (!access_token || !workspaceId) {
      return NextResponse.json({ success: false, error: "Thiếu quyền truy cập Google Drive hoặc ID Tổ chức!" }, { status: 400 });
    }

    if (!prompt || !prompt.trim()) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập prompt chỉnh sửa." }, { status: 400 });
    }

    if (editList.length === 0) {
      return NextResponse.json({ success: false, error: "Vui lòng chọn ít nhất 1 ảnh." }, { status: 400 });
    }

    // Auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Bạn cần đăng nhập." }, { status: 401 });
    }

    // Credit: images × rate — configurable by Super Admin
    const { getCreditPricing } = await import('@/lib/app-settings');
    const pricing = await getCreditPricing();
    const requiredCredits = editList.length * pricing.creditQwenImageEdit;

    // ✅ PRE-CHECK credit (read-only — không trừ trước)
    if (requiredCredits > 0) {
      const { checkCreditBalance } = await import('@/lib/workspace-utils');
      const balanceCheck = await checkCreditBalance(workspaceId, user.id, requiredCredits);
      if (!balanceCheck.success) {
        return NextResponse.json({ success: false, error: balanceCheck.error }, { status: 403 });
      }
    }

    // Create Drive folder structure
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    const folderName = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(/[\/:]/g, '-');
    const folderMetadata: any = {
      name: `[Ảnh AI Sáng Tạo] [${folderName}] ${taskName ? `[${taskName}]` : ''}`.trim(),
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (driveFolderId) folderMetadata.parents = [driveFolderId];

    const folderRes = await drive.files.create({ requestBody: folderMetadata, fields: 'id' });
    const subFolderId = folderRes.data?.id;
    if (!subFolderId) throw new Error("Không thể tạo thư mục trên Drive");

    // Create sub-folders: Ảnh gốc + Ảnh chỉnh sửa
    const anhGocRes = await drive.files.create({
      requestBody: { name: 'Ảnh gốc', mimeType: 'application/vnd.google-apps.folder', parents: [subFolderId] },
      fields: 'id'
    });
    const anhGocFolderId = anhGocRes.data.id!;

    const anhChinhSuaRes = await drive.files.create({
      requestBody: { name: 'Ảnh chỉnh sửa', mimeType: 'application/vnd.google-apps.folder', parents: [subFolderId] },
      fields: 'id'
    });
    const anhChinhSuaFolderId = anhChinhSuaRes.data.id!;

    // Determine worker URL
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
    const workerUrl = `${baseUrl}/api/worker-qwen-image-edit`;

    // Fan-out each image via QStash
    const publishPromises = editList.map(async (fileId: string, index: number) => {
      try {
        const file = await drive.files.get({ fileId, fields: 'parents' });
        const previousParents = file.data.parents?.join(',') || '';

        await drive.permissions.create({
          fileId,
          requestBody: { role: 'reader', type: 'anyone' }
        });

        await drive.files.update({
          fileId,
          addParents: anhGocFolderId,
          removeParents: previousParents,
          fields: 'id'
        });

        const imageUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
        const delayTime = index > 0 ? index * 25 : undefined;

        return qstashClient.publishJSON({
          url: workerUrl,
          body: {
            imageUrl,
            subFolderId: anhChinhSuaFolderId,
            access_token,
            prompt: prompt.trim(),
          },
          delay: delayTime
        });
      } catch (e: any) {
        console.error(`[QwenImageEdit] Lỗi gom file ${fileId}:`, e.message);
      }
    });

    await Promise.allSettled(publishPromises);
    console.log(`[QwenImageEdit] 🚀 Đã bắn ${editList.length} message sang Worker.`);

    // ✅ TRỪ CREDIT SAU KHI FAN-OUT THÀNH CÔNG
    if (requiredCredits > 0) {
      const { deductWorkspaceCredit } = await import('@/lib/workspace-utils');
      const deductRes = await deductWorkspaceCredit(workspaceId, user.id, requiredCredits);
      if (!deductRes.success) {
        console.error(`[QwenImageEdit] ⚠️ Fan-out OK nhưng trừ credit thất bại: ${deductRes.error}`);
      }

      // Usage log
      const jobId = randomUUID();
      await db.insert(usageLogs).values({
        id: randomUUID(),
        jobId,
        workspaceId,
        userId: user.id,
        tool: 'qwen_image_edit',
        creditsCharged: requiredCredits,
        status: 'success',
        modelUsed: 'premium_edit_image',
        inputSummary: `${editList.length} ảnh | Prompt: ${prompt.substring(0, 150)}`.substring(0, 200),
      });
    }

    return NextResponse.json({ success: true, message: `Đã tiếp nhận ${editList.length} ảnh để chỉnh sửa AI.` });
  } catch (error: any) {
    console.error("QwenImageEdit Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

