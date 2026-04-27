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

    if (requiredCredits > 0) {
      const { deductWorkspaceCredit } = await import('@/lib/workspace-utils');
      const deductRes = await deductWorkspaceCredit(workspaceId, user.id, requiredCredits);
      if (!deductRes.success) {
        return NextResponse.json({ success: false, error: deductRes.error }, { status: 403 });
      }

      // Usage log
      const jobId = randomUUID();
      await db.insert(usageLogs).values({
        id: randomUUID(),
        jobId,
        workspaceId,
        userId: user.id,
        tool: `poster_${imageProcessingEngine || 'default'}`,
        creditsCharged: requiredCredits,
        status: 'success',
        modelUsed: imageProcessingEngine || 'openai_gpt',
        inputSummary: `Poster | ${propertyData?.title || 'N/A'} | ${colorTheme?.name || 'default'} | ${driveFileIds.length} ảnh`.substring(0, 200),
      });
    }

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

    // Fan-out 1 message to poster worker
    await qstashClient.publishJSON({
      url: workerUrl,
      body: {
        imageUrls,
        mainImageIndex: mainImageIndex || 0,
        subFolderId,
        access_token,
        posterPrompt,
        taskName: taskName || 'poster',
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

  const title = (p.title || p.propertyType || 'BẤT ĐỘNG SẢN').toUpperCase();
  const location = (p.location || 'VỊ TRÍ ĐẮC ĐỊA').toUpperCase();
  const strengths = (p.strengths || 'VỊ TRÍ ĐẸP, TIỆN ÍCH ĐẦY ĐỦ').toUpperCase();
  const area = p.area || 'N/A';
  const direction = p.direction || 'Đang cập nhật';
  const permit = p.permit || 'Đang cập nhật';
  const structure = p.structure || 'Đang cập nhật';
  const shape = p.shape || 'Đang cập nhật';
  const price = (c.priceNote || p.price || 'LIÊN HỆ ĐỂ CÓ MỨC GIÁ TỐT NHẤT').toUpperCase();
  const phone = c.phone || '0900 000 000';
  const name = c.name || 'Đại lý BĐS';
  const suitableFor = p.suitableFor || '';

  return `A professional Vietnamese real estate poster. Vertical portrait layout, 2:3 ratio. Color theme: ${theme.primary} + ${theme.secondary}.

CRITICAL — TEXT RENDERING RULES (MUST FOLLOW):
- The poster contains Vietnamese text with diacritical marks (ă, â, ê, ô, ơ, ư, đ, etc.).
- You MUST render each Vietnamese word EXACTLY as written below — copy every Unicode character precisely.
- Do NOT approximate, skip, or replace any diacritical marks.
- Use bold, clean sans-serif fonts. Make text LARGE and HIGH CONTRAST for readability.
- Keep text SHORT — only render what is specified below, nothing extra.

CRITICAL — IMAGE RULES:
- Use ONLY the attached input photos. Do NOT generate, draw, or AI-create any property images.
- Attached image #${mainImageIndex + 1} is the HERO image — display it as the LARGEST element.

POSTER LAYOUT:

[HEADER — Dark ${theme.primary} background]:
Large white text: "${title}"
Smaller ${theme.secondary} text: "${strengths}"

[HERO PHOTO — Full width]:
Attached image #${mainImageIndex + 1}, displayed large and prominent.

[INFO SECTION — Clean white/light background, grid layout with icons]:
📍 Vị trí: ${location}
📐 Diện tích: ${area}${p.length && p.width ? ` (${p.length}m × ${p.width}m)` : ''}
🧭 Hướng: ${direction}
📜 Pháp lý: ${permit}
🏗 Kết cấu: ${structure}

${totalImages > 1 ? `[SECONDARY PHOTOS]:
Display remaining ${totalImages - 1} attached photos in a row below the info section.
${suitableFor ? `Small label: "Phù hợp: ${suitableFor}"` : ''}` : ''}

[FOOTER — Price + Contact]:
${theme.secondary} banner: "GIÁ: ${price}"
Black bar: "${phone}" (left, large) | "${name}" (right)`;
}
