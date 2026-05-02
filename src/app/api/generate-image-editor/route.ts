import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';
import { createClient } from '@/lib/supabase/server';
import { google } from 'googleapis';
import { db } from '@/db';
import { usageLogs } from '@/db/schema';
import { randomUUID } from 'crypto';
import { eq } from 'drizzle-orm';

const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN || 'MISSING_TOKEN',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { access_token, workspaceId, imageProcessingEngine, images, imagesToEdit, imagesToKeep, objectsToRemoveStr, enhanceImage, driveFolderId, taskName } = body;

    const editList = imagesToEdit || images || [];
    const keepList = imagesToKeep || [];

    if (!access_token || !workspaceId) {
      return NextResponse.json({ success: false, error: "Thiếu quyền truy cập Google Drive hoặc ID Tổ chức!" }, { status: 400 });
    }

    if (editList.length === 0 && keepList.length === 0) {
      return NextResponse.json({ success: false, error: "Vui lòng chọn ít nhất 1 ảnh." }, { status: 400 });
    }

    // Auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Bạn cần đăng nhập." }, { status: 401 });
    }

    // Credit: images × rate (no base text cost) — configurable by Super Admin
    const { getCreditPricing } = await import('@/lib/app-settings');
    const pricing = await getCreditPricing();
    const isBanana = imageProcessingEngine === 'replicate_banana';
    const requiredCredits = editList.length * (isBanana ? pricing.creditImageBanana : pricing.creditImageStandard);

    // ✅ PRE-CHECK credit (read-only — không trừ trước)
    if (requiredCredits > 0) {
      const { checkCreditBalance } = await import('@/lib/workspace-utils');
      const balanceCheck = await checkCreditBalance(workspaceId, user.id, requiredCredits);
      if (!balanceCheck.success) {
        return NextResponse.json({ success: false, error: balanceCheck.error }, { status: 403 });
      }
    }

    // Create Drive folder + fan-out via worker-image-editor
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    const folderName = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(/[\/:]/g, '-');
    const folderMetadata: any = {
      name: `[Ảnh AI] [${folderName}] ${taskName ? `[${taskName}]` : ''}`.trim(),
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (driveFolderId) folderMetadata.parents = [driveFolderId];

    const folderRes = await drive.files.create({ requestBody: folderMetadata, fields: 'id' });
    const subFolderId = folderRes.data?.id;
    if (!subFolderId) throw new Error("Không thể tạo thư mục trên Drive");

    // Create sub-folders
    let anhGocFolderId: string | null = null;
    let anhChinhSuaFolderId: string | null = null;
    let anhKhongChinhSuaFolderId: string | null = null;

    if (editList.length > 0) {
      const anhGocRes = await drive.files.create({
        requestBody: { name: 'Ảnh gốc', mimeType: 'application/vnd.google-apps.folder', parents: [subFolderId] },
        fields: 'id'
      });
      anhGocFolderId = anhGocRes.data.id!;

      const anhChinhSuaRes = await drive.files.create({
        requestBody: { name: 'Ảnh chỉnh sửa', mimeType: 'application/vnd.google-apps.folder', parents: [subFolderId] },
        fields: 'id'
      });
      anhChinhSuaFolderId = anhChinhSuaRes.data.id!;
    }

    if (keepList.length > 0) {
      const anhKhongChinhSuaRes = await drive.files.create({
        requestBody: { name: 'Ảnh không chỉnh sửa', mimeType: 'application/vnd.google-apps.folder', parents: [subFolderId] },
        fields: 'id'
      });
      anhKhongChinhSuaFolderId = anhKhongChinhSuaRes.data.id!;
    }

    // Determine worker URL
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

    const workerImageUrl = imageProcessingEngine === 'replicate_banana'
      ? `${baseUrl}/api/worker-replicate-banana`
      : `${baseUrl}/api/worker-openai-gpt`;

    // Fan-out each image
    if (editList.length > 0) {
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
            addParents: anhGocFolderId!,
            removeParents: previousParents,
            fields: 'id'
          });

          const imageUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
          const delayTime = index > 0 ? index * 25 : undefined;

          return qstashClient.publishJSON({
            url: workerImageUrl,
            body: {
              imageUrl,
              subFolderId: anhChinhSuaFolderId,
              access_token,
              objectsToRemove: objectsToRemoveStr,
              enhanceImage
            },
            delay: delayTime
          });
        } catch (e: any) {
          console.error(`[ImageEditor] Lỗi gom file cần chỉnh sửa ${fileId}:`, e.message);
        }
      });

      await Promise.allSettled(publishPromises);
      console.log(`[ImageEditor] 🚀 Đã bắn ${editList.length} message sang Image Worker.`);
    }

    if (keepList.length > 0) {
      const keepPromises = keepList.map(async (fileId: string) => {
        try {
          const file = await drive.files.get({ fileId: fileId, fields: 'parents' });
          const previousParents = file.data.parents?.join(',') || '';

          await drive.files.update({
            fileId: fileId,
            addParents: anhKhongChinhSuaFolderId!,
            removeParents: previousParents,
            fields: 'id'
          });
        } catch (e: any) {
          console.error(`[ImageEditor] Lỗi gom file không chỉnh sửa ${fileId}:`, e.message);
        }
      });
      await Promise.allSettled(keepPromises);
      console.log(`[ImageEditor] ✅ Đã di chuyển ${keepList.length} ảnh vào thư mục "Ảnh không chỉnh sửa".`);
    }

    // ✅ TRỪ CREDIT SAU KHI FAN-OUT THÀNH CÔNG
    if (requiredCredits > 0) {
      const { deductWorkspaceCredit } = await import('@/lib/workspace-utils');
      const deductRes = await deductWorkspaceCredit(workspaceId, user.id, requiredCredits);
      if (!deductRes.success) {
        console.error(`[ImageEditor] ⚠️ QStash OK nhưng trừ credit thất bại: ${deductRes.error}`);
      }

      // Usage log for image processing
      const jobId = randomUUID();
      await db.insert(usageLogs).values({
        id: randomUUID(),
        jobId,
        workspaceId,
        userId: user.id,
        tool: `image_editor_${imageProcessingEngine || 'default'}`,
        creditsCharged: requiredCredits,
        status: 'success',
        modelUsed: imageProcessingEngine || 'openai_gpt',
        inputSummary: `${editList.length} ảnh chỉnh sửa | Engine: ${imageProcessingEngine} | Objects: ${objectsToRemoveStr || 'mặc định'}`.substring(0, 200),
      });
    }

    return NextResponse.json({ success: true, message: `Đã xử lý: ${editList.length} ảnh cần AI, ${keepList.length} ảnh giữ nguyên.` });
  } catch (error: any) {
    console.error("Image Editor Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
