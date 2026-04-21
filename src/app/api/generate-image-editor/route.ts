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
    const { access_token, workspaceId, imageProcessingEngine, images, objectsToRemoveStr, enhanceImage, driveFolderId } = body;

    if (!access_token || !workspaceId) {
      return NextResponse.json({ success: false, error: "Thiếu quyền truy cập Google Drive hoặc ID Tổ chức!" }, { status: 400 });
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ success: false, error: "Vui lòng chọn ít nhất 1 ảnh." }, { status: 400 });
    }

    // Auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Bạn cần đăng nhập." }, { status: 401 });
    }

    // Credit: images × rate (no base text cost)
    const isBanana = imageProcessingEngine === 'replicate_banana';
    const requiredCredits = images.length * (isBanana ? 40 : 10);

    const { deductWorkspaceCredit } = await import('@/lib/workspace-utils');
    const deductRes = await deductWorkspaceCredit(workspaceId, user.id, requiredCredits);
    if (!deductRes.success) {
      return NextResponse.json({ success: false, error: deductRes.error }, { status: 403 });
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
      inputSummary: `${images.length} ảnh | Engine: ${imageProcessingEngine} | Objects: ${objectsToRemoveStr || 'mặc định'}`.substring(0, 200),
    });

    // Create Drive folder + fan-out via worker-image-editor
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    const folderName = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(/[\/:]/g, '-');
    const folderMetadata: any = {
      name: `[Ảnh AI] [${folderName}]`,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (driveFolderId) folderMetadata.parents = [driveFolderId];

    const folderRes = await drive.files.create({ requestBody: folderMetadata, fields: 'id' });
    const subFolderId = folderRes.data?.id;
    if (!subFolderId) throw new Error("Không thể tạo thư mục trên Drive");

    // Create sub-folders
    const anhGocRes = await drive.files.create({
      requestBody: { name: 'Anh Goc', mimeType: 'application/vnd.google-apps.folder', parents: [subFolderId] },
      fields: 'id'
    });
    const anhGocFolderId = anhGocRes.data.id;

    let maskFolderId = undefined;
    if (['vertex_ai', 'vision_lama', 'vision_flux'].includes(imageProcessingEngine)) {
      const maskRes = await drive.files.create({
        requestBody: { name: 'Anh Mask', mimeType: 'application/vnd.google-apps.folder', parents: [subFolderId] },
        fields: 'id'
      });
      maskFolderId = maskRes.data.id;
    }

    // Determine worker URL
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

    let workerImageUrl = `${baseUrl}/api/worker-image`;
    if (imageProcessingEngine === 'vertex_ai') workerImageUrl = `${baseUrl}/api/worker-vertex-image`;
    else if (imageProcessingEngine === 'vision_lama') workerImageUrl = `${baseUrl}/api/worker-vision-lama`;
    else if (imageProcessingEngine === 'vision_flux') workerImageUrl = `${baseUrl}/api/worker-vision-flux`;
    else if (imageProcessingEngine === 'replicate_banana') workerImageUrl = `${baseUrl}/api/worker-replicate-banana`;
    else if (imageProcessingEngine === 'openai_gpt') workerImageUrl = `${baseUrl}/api/worker-openai-gpt`;

    // Fan-out each image
    const publishPromises = images.map(async (fileId: string, index: number) => {
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
            subFolderId,
            maskFolderId,
            access_token,
            objectsToRemove: objectsToRemoveStr,
            enhanceImage
          },
          delay: delayTime
        });
      } catch (e: any) {
        console.error(`[ImageEditor] Lỗi gom file ${fileId}:`, e.message);
      }
    });

    await Promise.allSettled(publishPromises);
    console.log(`[ImageEditor] 🚀 Đã bắn ${images.length} message sang Image Worker.`);

    return NextResponse.json({ success: true, message: `Đã gửi ${images.length} ảnh để xử lý.` });
  } catch (error: any) {
    console.error("Image Editor Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
