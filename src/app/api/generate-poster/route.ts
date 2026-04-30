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
    const {
      access_token, workspaceId, imageProcessingEngine,
      driveFileIds, mainImageIndex,
      propertyData, colorTheme, contactInfo,
      driveFolderId, taskName
    } = body;

    if (!access_token || !workspaceId) {
      return NextResponse.json({ success: false, error: "Thiếu quyền truy cập Google Drive hoặc ID Tổ chức!" }, { status: 400 });
    }

    if (!driveFileIds || driveFileIds.length === 0) {
      return NextResponse.json({ success: false, error: "Vui lòng chọn ít nhất 1 ảnh." }, { status: 400 });
    }

    // Auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Bạn cần đăng nhập." }, { status: 401 });
    }

    // Credit calculation — 1 poster × rate
    const { getCreditPricing } = await import('@/lib/app-settings');
    const pricing = await getCreditPricing();
    const isBanana = imageProcessingEngine === 'replicate_banana';
    const requiredCredits = isBanana ? pricing.creditPosterBanana : pricing.creditPosterStandard;

    // Pre-flight balance check (NO deduction — credit deducted in webhook on success)
    if (requiredCredits > 0) {
      const { checkCreditBalance } = await import('@/lib/workspace-utils');
      const balanceCheck = await checkCreditBalance(workspaceId, user.id, requiredCredits);
      if (!balanceCheck.success) {
        return NextResponse.json({ success: false, error: balanceCheck.error }, { status: 403 });
      }
    }

    // Usage log — pending until webhook confirms success/failure
    const jobId = randomUUID();
    await db.insert(usageLogs).values({
      id: randomUUID(),
      jobId,
      workspaceId,
      userId: user.id,
      tool: `poster_${imageProcessingEngine || 'default'}`,
      creditsCharged: 0,
      status: 'pending',
      modelUsed: imageProcessingEngine || 'openai_gpt',
      inputSummary: `Poster | ${propertyData?.title || 'N/A'} | ${colorTheme?.name || 'default'} | ${driveFileIds.length} ảnh`.substring(0, 200),
    });

    // Create Drive folder
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    const folderName = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(/[\/:]/g, '-');
    const folderMetadata: any = {
      name: `[Poster AI] [${folderName}] ${taskName ? `[${taskName}]` : ''}`.trim(),
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (driveFolderId) folderMetadata.parents = [driveFolderId];

    const folderRes = await drive.files.create({ requestBody: folderMetadata, fields: 'id' });
    const subFolderId = folderRes.data?.id;
    if (!subFolderId) throw new Error("Không thể tạo thư mục trên Drive");

    // Make all images publicly accessible for worker to download
    for (const fileId of driveFileIds) {
      try {
        await drive.permissions.create({
          fileId,
          requestBody: { role: 'reader', type: 'anyone' }
        });
      } catch (e: any) {
        console.error(`[Poster] Lỗi set permission ảnh ${fileId}:`, e.message);
      }
    }

    // Build image URLs
    const imageUrls = driveFileIds.map((id: string) => `https://drive.google.com/uc?id=${id}&export=download`);

    // Determine worker URL
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;

    const workerUrl = isBanana
      ? `${baseUrl}/api/worker-poster-banana`
      : `${baseUrl}/api/worker-poster-gpt`;

    // Build poster prompt
    const posterPrompt = buildPosterPrompt(propertyData, colorTheme, contactInfo, mainImageIndex, driveFileIds.length);

    // Fan-out 1 message to poster worker (credit info for deferred deduction)
    await qstashClient.publishJSON({
      url: workerUrl,
      body: {
        imageUrls,
        mainImageIndex: mainImageIndex || 0,
        subFolderId,
        access_token,
        posterPrompt,
        taskName: taskName || 'poster',
        // Deferred credit info — webhook will deduct on success
        jobId,
        workspaceId,
        userId: user.id,
        requiredCredits,
      }
    });

    console.log(`[Poster] 🚀 Đã gửi request tạo poster với ${driveFileIds.length} ảnh.`);

    return NextResponse.json({ success: true, message: `Đã tiếp nhận! Hệ thống đang tạo poster với ${driveFileIds.length} ảnh.` });
  } catch (error: any) {
    console.error("[Poster] Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

function buildPosterPrompt(
  property: any,
  colorTheme: { name: string; primary: string; secondary: string },
  contact: { name: string; phone: string; priceNote: string },
  mainImageIndex: number,
  totalImages: number
): string {
  const p = property || {};
  const theme = colorTheme || { name: 'Sang trọng', primary: 'Đen', secondary: 'Vàng Gold' };
  const c = contact || { name: '', phone: '', priceNote: '' };

  // Trích xuất thông tin BĐS
  const infoLines: string[] = [];
  if (p.title || p.propertyType) infoLines.push(`Loại: ${p.title || p.propertyType}`);
  if (p.location) infoLines.push(`Vị trí: ${p.location}`);
  if (p.area) infoLines.push(`Diện tích: ${p.area}${p.length && p.width ? ` (${p.length}m × ${p.width}m)` : ''}`);
  if (p.direction) infoLines.push(`Hướng: ${p.direction}`);
  if (p.permit) infoLines.push(`Pháp lý: ${p.permit}`);
  if (p.structure) infoLines.push(`Kết cấu: ${p.structure}`);
  if (p.strengths) infoLines.push(`Ưu điểm: ${p.strengths}`);
  if (c.priceNote || p.price) infoLines.push(`Giá: ${c.priceNote || p.price}`);
  const propertyInfo = infoLines.join('\n');

  // Chữ ký / liên hệ
  const signature = [c.name, c.phone].filter(Boolean).join(' - ');

  return `Tạo một infographic/poster bằng tiếng Việt cho việc sale bất động sản với bảng màu ${theme.name} (${theme.primary} và ${theme.secondary}).

Thông tin bất động sản:
${propertyInfo || 'Bất động sản đẹp, vị trí đắc địa'}

Chữ ký: ${signature || 'Đại lý BĐS'}

Yêu cầu: thu hút người xem, hối thúc ra quyết định. Sử dụng ảnh đính kèm (ảnh số ${mainImageIndex + 1} là ảnh chính, hiển thị lớn nhất). Poster dọc tỷ lệ 2:3.`;

  /* === PROMPT CŨ (BACKUP) ===
  return `A professional Vietnamese real estate poster. Vertical portrait layout, 2:3 ratio...`;
  === END BACKUP === */
}
