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

  return `Một poster quảng cáo bất động sản chuyên nghiệp, được thiết kế theo bố cục dọc (portrait), chia thành nhiều phần rõ rệt với văn bản tiếng Việt rõ ràng. Bảng màu ${theme.name} (${theme.primary} và ${theme.secondary}) để tạo cảm giác sang trọng. Các hình ảnh minh họa chất lượng cao phải thể hiện đúng loại bất động sản.

Chi tiết bố cục và nội dung:

[Dải tiêu đề trên cùng - Nền màu đen]:
Tiêu đề chính (chữ trắng lớn): "SỞ HỮU NGAY ${p.propertyType || 'BẤT ĐỘNG SẢN'} – ${p.location || 'VỊ TRÍ ĐẮC ĐỊA'}".
Tiêu đề phụ (chữ ${theme.secondary} nhỏ hơn bên dưới): "${p.strengths || 'VỊ TRÍ ĐẸP, TIỆN ÍCH ĐẦY ĐỦ'}".

[Bố cục dải 1 - Nền màu ${theme.primary}, Ảnh chính (ảnh số ${mainImageIndex + 1} trong ${totalImages} ảnh đính kèm) và Văn bản liên quan]:
Một bức ảnh chân thực, chất lượng cao — sử dụng ảnh số ${mainImageIndex + 1} được đính kèm (ảnh chính, hiển thị lớn nhất).
Một dải văn bản phía trên bức ảnh: "${p.title || p.propertyType || 'BẤT ĐỘNG SẢN'} | ${p.strengths || 'THIẾT KẾ SANG TRỌNG'}".

[Bảng thuộc tính - Nền màu trắng, Văn bản tiếng Việt]:
Một bảng lưới thông tin chi tiết với các biểu tượng và văn bản rõ ràng:
Vị trí: Biểu tượng vị trí + "Vị trí: ${p.location || 'Đang cập nhật'}".
Diện tích: Biểu tượng diện tích + "Diện tích: ${p.area || 'N/A'}${p.length && p.width ? ` (${p.length}m x ${p.width}m)` : ''}".
Hình dạng: Biểu tượng hình học + "Hình dạng: ${p.shape || 'Đang cập nhật'}".
Hướng: Biểu tượng la bàn + "Hướng: ${p.direction || 'Đang cập nhật'}".
Pháp lý: Biểu tượng pháp lý + "Pháp lý: ${p.permit || 'Đang cập nhật'}".
Kết cấu: Biểu tượng tòa nhà + "Kết cấu/Chi tiết: ${p.structure || 'Đang cập nhật'}".

${totalImages > 1 ? `[Bố cục dải 2 - Nền màu ${theme.primary}, Văn bản và Ảnh phụ]:
Một dải văn bản nhỏ hơn: "${p.suitableFor ? `PHÙ HỢP: ${p.suitableFor}` : 'TIỆN ÍCH NỘI KHU & KHÔNG GIAN SỐNG LÝ TƯỞNG'}".
Dưới dải văn bản là các ảnh phụ (các ảnh còn lại ngoài ảnh chính), góc rộng, về không gian chung nổi bật.` : ''}

[Dải dưới cùng - Giá và Liên hệ]:
Một dải màu ${theme.secondary} nổi bật (thanh ngang) có văn bản: "GIÁ BÁN: ${c.priceNote || p.price || 'LIÊN HỆ ĐỂ CÓ MỨC GIÁ TỐT NHẤT'}".
Bên dưới dải, trong dải đen ở chân poster, là thông tin liên hệ:
"${c.phone || 'SĐT LIÊN HỆ'}" (Lớn, căn lề trái).
"${c.name || 'TÊN ĐẠI LÝ'}" (Nhỏ, căn lề phải).

LƯU Ý QUAN TRỌNG: 
- Sử dụng chính xác các ảnh được đính kèm (input images) — KHÔNG tự vẽ ảnh mới.
- Ảnh số ${mainImageIndex + 1} là ảnh chính, phải hiển thị lớn nhất và nổi bật nhất.
- Văn bản phải rõ ràng, dễ đọc, font chữ đậm cho tiêu đề.
- Poster dọc (portrait), tỷ lệ 9:16.`;
}
