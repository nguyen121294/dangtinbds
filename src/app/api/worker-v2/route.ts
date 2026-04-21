import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';
import { google } from 'googleapis';
import Replicate from 'replicate';
import { db } from '@/db';
import { usageLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';

const DEFAULT_SYSTEM_PROMPT = `Bạn là chuyên gia môi giới bất động sản hàng đầu Việt Nam, đồng thời là chuyên gia SEO và Content Marketing trên Facebook/Zalo.
Nhiệm vụ: Viết bài đăng rao bán/cho thuê BĐS cực kỳ hấp dẫn, độ dài 1/2 trang A4, có khả năng viral cao.

NGUYÊN TẮC BẮT BUỘC:
1. Sử dụng emoji NHIỀU và PHONG PHÚ xuyên suốt bài viết (🏡🔥💰📍✅🎯📐🧭🏗️📌⭐🚀💎🌟...). Mỗi đoạn, mỗi dòng quan trọng đều nên có ít nhất 1-2 emoji phù hợp để bài viết sinh động, bắt mắt trên Facebook/Zalo. Tuyệt đối KHÔNG viết đoạn dài mà thiếu emoji.
2. KHÔNG BAO GIỜ viết các cụm từ cấu trúc như "Tiêu đề:", "Thân bài:", "Kêu gọi hành động:", "Mở bài:", "Kết bài:" hay bất kỳ nhãn cấu trúc nào. Bài viết phải tự nhiên, liền mạch, người đọc copy-paste trực tiếp lên Facebook mà KHÔNG cần chỉnh sửa gì.
3. Nhấn mạnh LỢI ÍCH + CẢM XÚC (hình dung không gian sống, tiềm năng tăng giá) thay vì chỉ liệt kê tính năng.
4. Ngôn ngữ tự nhiên, thân thiện như tư vấn 1-1, KHÔNG giống văn máy.
5. TUYỆT ĐỐI KHÔNG dùng markdown (**, ##, ~~, --). Chỉ dùng text thuần và emoji.
6. Tạo cảm giác KHAN HIẾM và URGENCY phù hợp (số lượng giới hạn, giá ưu đãi có thời hạn...).
7. Kết thúc bài bằng câu kêu gọi liên hệ NGAY, tạo cảm giác cấp bách.

QUY TẮC HASHTAG VIRAL (RẤT QUAN TRỌNG — BẮT BUỘC 100%):
Cuối MỖI bài đăng, BẮT BUỘC PHẢI có một khối hashtag. Nếu thiếu hashtag = BÀI VIẾT THẤT BẠI.
Cấu trúc khối hashtag (viết liên tục, mỗi dòng một nhóm):
- Hashtag VỊ TRÍ: #BatDongSan[Tỉnh] #DatNen[Huyện] #Nha[Quận] — Ví dụ: #BatDongSanQuangNgai #DatNenSonTinh
- Hashtag LOẠI BĐS: #DatNen #NhaPho #CanHo #BietThu #DatVuon #NhaXuong
- Hashtag GIÁ + DIỆN TÍCH: #Duoi1Ty #Duoi500Trieu #100m2 #DatRe #GiaRe
- Hashtag VIRAL: #MuaBanNhadat #DauTuBDS #batdongsanvietnam #nhadatviet #moigioibds #batdongsan2025
Tổng: tối thiểu 15, tối đa 25 hashtag. Viết liền không dấu. KHÔNG để khoảng trắng trong hashtag.
Ưu tiên hashtag có volume tìm kiếm cao trên Facebook/Zalo.`;

/**
 * Worker V2 — Called by QStash
 * 
 * Flow (fits within Netlify 10s timeout):
 * 1. Idempotency check via jobId
 * 2. Create Drive folder + "Anh Goc" subfolder
 * 3. Dispatch image processing jobs to QStash
 * 4. Fire Replicate prediction with WEBHOOK (non-blocking) for text gen
 *    → Replicate calls /api/webhook-v2-text when done
 * 
 * This function does NOT create the Google Doc or deduct credits.
 * That happens in webhook-v2-text after Replicate returns the text.
 */
async function handler(req: NextRequest) {
  const startTime = Date.now();

  try {
    const body = await req.json();
    const {
      rawInfo, style, customPrompt, access_token, images,
      objectsToRemoveStr, enhanceImage, imageProcessingEngine,
      driveFolderId, signature,
      // Job metadata (passed from generate-async-v2)
      jobId, requiredCredits, workspaceId, userId,
    } = body;

    if (!access_token) {
      console.error("[V2] Missing access_token");
      return NextResponse.json({ success: false, error: "Missing access token" }, { status: 400 });
    }

    // ─── IDEMPOTENCY CHECK ───
    if (jobId) {
      const existing = await db.select({ status: usageLogs.status })
        .from(usageLogs).where(eq(usageLogs.jobId, jobId)).limit(1);
      if (existing[0]?.status === 'success') {
        console.log(`[V2] ⚡ Job ${jobId} already completed. Skipping.`);
        return NextResponse.json({ success: true, message: 'Already processed (idempotent)' });
      }
    }

    // ─── BUILD PROMPTS ───
    const systemPrompt = (customPrompt && customPrompt.trim().length > 0) ? customPrompt.trim() : DEFAULT_SYSTEM_PROMPT;
    const styleInstruction = style
      ? `\n\n**PHONG CÁCH BẮT BUỘC:** Bài viết PHẢI viết theo phong cách "${style}". Giữ vững 100% phong cách này xuyên suốt bài.`
      : '';

    const userPrompt = `Dưới đây là thông tin bất động sản do người dùng cung cấp. Hãy đọc kỹ và tạo ra 2 phần OUTPUT riêng biệt:

=== THÔNG TIN ĐẦU VÀO ===
${rawInfo}
=========================${styleInstruction}

=== YÊU CẦU OUTPUT ===

**PHẦN 1 - BÀI ĐĂNG DÀI:**
Viết bài đăng bán/cho thuê BĐS hoàn chỉnh dựa trên thông tin trên. Bài viết khoảng 1/2 trang A4, hấp dẫn, không vòng vo.

${signature ? `LƯU Ý CUỐI BÀI: Phải đính kèm nguyên văn chữ ký sau vào vị trí cuối cùng của bài đăng dài. Không tự ý sửa đổi chữ ký:\n${signature}` : ''}

**PHẦN 2 - BÀI ĐĂNG NGẮN:**
Trích xuất thông tin từ đoạn raw text và TRÌNH BÀY ĐÚNG theo format sau. Nếu thông tin KHÔNG CÓ trong raw text thì ghi "Chưa có thông tin". TUYỆT ĐỐI KHÔNG BỊA ĐẶT thêm bớt.

📌 Tiêu đề: {ngắn gọn xúc tích, dễ nhớ}
🏠 Loại BĐS: {loại bất động sản}
📍 Vị trí: {địa chỉ / khu vực}
📐 Diện tích, kích thước: {diện tích / ngang x dài}
🏗 Hiện trạng: {hiện trạng / kết cấu}
🧭 Hướng: {hướng nhà / đất}
🎯 Phù hợp: {mục đích sử dụng}
💰 Giá bán: {giá}
✅ Điểm mạnh: {pháp lý, tiện ích, ưu điểm nổi bật...}
${signature ? `\n${signature}` : ''}

=== FORMAT OUTPUT ===
Bắt đầu PHẦN 1 bằng dòng: ===BÀI ĐĂNG DÀI===
Bắt đầu PHẦN 2 bằng dòng: ===BÀI ĐĂNG NGẮN===
Viết liên tục, KHÔNG giải thích gì thêm.`;

    // ─── GOOGLE DRIVE SETUP ───
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    const folderName = new Date()
      .toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' })
      .replace(/[\/:]/g, '-');

    const folderMetadata: any = {
      name: `[V2] [${folderName}]`,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (driveFolderId) folderMetadata.parents = [driveFolderId];

    const folderRes = await drive.files.create({ requestBody: folderMetadata, fields: 'id' });
    const subFolderId = folderRes.data?.id;
    if (!subFolderId) throw new Error("Không thể tạo thư mục con trên Drive");
    console.log(`[V2] 📁 Created folder: ${subFolderId}`);

    // ─── IMAGE PROCESSING (independent, non-blocking dispatch) ───
    if (images && Array.isArray(images) && images.length > 0) {
      try {
        const anhGocRes = await drive.files.create({
          requestBody: { name: 'Anh Goc', mimeType: 'application/vnd.google-apps.folder', parents: [subFolderId] },
          fields: 'id'
        });
        const anhGocFolderId = anhGocRes.data.id;

        if (anhGocFolderId) {
          const qstashClient = new Client({ token: process.env.QSTASH_TOKEN || "" });
          const protocol = req.headers.get("x-forwarded-proto") || "https";
          const host = req.headers.get("host") || "localhost:3000";

          const workerImageUrl = imageProcessingEngine === 'replicate_banana'
            ? `${protocol}://${host}/api/worker-replicate-banana`
            : `${protocol}://${host}/api/worker-openai-gpt`;

          const publishPromises = images.map(async (fileId: string, index: number) => {
            try {
              const file = await drive.files.get({ fileId, fields: 'parents' });
              const previousParents = file.data.parents?.join(',') || '';
              await drive.permissions.create({ fileId, requestBody: { role: 'reader', type: 'anyone' } });
              await drive.files.update({ fileId, addParents: anhGocFolderId, removeParents: previousParents, fields: 'id' });

              const imageUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;
              return qstashClient.publishJSON({
                url: workerImageUrl,
                body: { imageUrl, subFolderId, access_token, objectsToRemove: objectsToRemoveStr, enhanceImage },
                delay: index > 0 ? index * 25 : undefined
              });
            } catch (e: any) {
              console.error(`[V2] ❌ Image dispatch error for ${fileId}:`, e.message);
            }
          });

          await Promise.allSettled(publishPromises);
          console.log(`[V2] 🚀 Dispatched ${images.length} image jobs.`);
        }
      } catch (imgErr: any) {
        console.error("[V2] ❌ Image processing block failed:", imgErr.message);
      }
    }

    // ─── TEXT GENERATION via Replicate WEBHOOK (non-blocking) ───
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
      throw new Error("Thiếu REPLICATE_API_TOKEN");
    }

    const replicate = new Replicate({ auth: replicateToken });
    const protocol = req.headers.get("x-forwarded-proto") || "https";
    const host = req.headers.get("host") || "localhost:3000";

    // Encode all metadata into webhook URL so webhook-v2-text can process
    const webhookParams = new URLSearchParams({
      subFolderId,
      token: access_token,
      jobId: jobId || '',
      workspaceId: workspaceId || '',
      userId: userId || '',
      requiredCredits: String(requiredCredits || 0),
      folderName,
      signature: signature || '',
    });

    const webhookUrl = `${protocol}://${host}/api/webhook-v2-text?${webhookParams.toString()}`;
    console.log("[V2] 🤖 Firing Replicate GPT-5 Nano prediction with webhook...");

    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

    try {
      await replicate.predictions.create({
        model: "openai/gpt-5-nano",
        input: {
          prompt: fullPrompt,
          temperature: 0.7,
          max_tokens: 4096,
        },
        webhook: webhookUrl,
        webhook_events_filter: ["completed"],
      });
      console.log("[V2] ✅ Prediction created (gpt-5-nano). Waiting for webhook callback.");
    } catch (primaryErr: any) {
      console.warn("[V2] ⚠️ gpt-5-nano failed:", primaryErr.message, "— Trying gpt-4.1-nano...");
      try {
        await replicate.predictions.create({
          model: "openai/gpt-4.1-nano",
          input: {
            prompt: fullPrompt,
            temperature: 0.7,
            max_tokens: 4096,
          },
          webhook: webhookUrl,
          webhook_events_filter: ["completed"],
        });
        console.log("[V2] ✅ Prediction created (gpt-4.1-nano fallback). Waiting for webhook callback.");
      } catch (fallbackErr: any) {
        // Both models failed — mark log as failed, no credit deduction
        console.error("[V2] ❌ Both Replicate models failed:", fallbackErr.message);
        if (jobId) {
          await db.update(usageLogs).set({
            status: 'failed',
            errorMessage: `Text gen failed: ${fallbackErr.message}`,
            durationMs: Date.now() - startTime,
            completedAt: new Date(),
          }).where(eq(usageLogs.jobId, jobId));
        }
        return NextResponse.json({ success: false, error: "AI text generation failed" }, { status: 500 });
      }
    }

    console.log(`[V2] ✅ Worker done in ${Date.now() - startTime}ms. Awaiting webhook for text + credit.`);
    return NextResponse.json({ success: true, message: "Processing dispatched" });

  } catch (error: any) {
    console.error("[V2] ❌ Fatal Worker Error:", error.message || error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = handler;
