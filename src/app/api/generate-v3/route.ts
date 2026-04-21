import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { google } from 'googleapis';
import Replicate from 'replicate';
import { db } from '@/db';
import { usageLogs } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { randomUUID } from 'crypto';

const DEFAULT_SYSTEM_PROMPT = `Bạn là chuyên gia môi giới bất động sản hàng đầu Việt Nam, đồng thời là chuyên gia SEO và Content Marketing trên Facebook/Zalo.
Nhiệm vụ: Viết bài đăng rao bán/cho thuê BĐS cực kỳ hấp dẫn, độ dài 1/2 trang A4, có khả năng viral cao.

NGUYÊN TẮC BẮT BUỘC:
1. Sử dụng emoji hợp lý tạo điểm nhấn thị giác (đầu mỗi mục, tiêu đề).
2. Bố cục rõ ràng: Tiêu đề gây tò mò → Thân bài (lợi ích + cảm xúc) → CTA mạnh.
3. Nhấn mạnh LỢI ÍCH + CẢM XÚC (hình dung không gian sống, tiềm năng tăng giá) thay vì chỉ liệt kê tính năng.
4. Ngôn ngữ tự nhiên, thân thiện như tư vấn 1-1, KHÔNG giống văn máy.
5. TUYỆT ĐỐI KHÔNG dùng markdown (**, ##, ~~). Chỉ dùng text thuần và emoji.
6. Tạo cảm giác KHAN HIẾM và URGENCY phù hợp (số lượng giới hạn, giá ưu đãi có thời hạn...).

QUY TẮC HASHTAG VIRAL (RẤT QUAN TRỌNG):
Cuối MỖI bài đăng (cả bài dài và bài ngắn), PHẢI thêm khối hashtag theo cấu trúc sau:
- Dòng 1: Hashtag VỊ TRÍ (tỉnh/thành, quận/huyện, phường/xã, đường) — Ví dụ: #BatDongSanQuangNgai #DatNenSonTinh
- Dòng 2: Hashtag LOẠI BĐS — Ví dụ: #DatNen #NhaPho #CanHo #BietThu #DatVuon #NhaXuong
- Dòng 3: Hashtag MỨC GIÁ + DIỆN TÍCH — Ví dụ: #Duoi1Ty #Duoi500Trieu #100m2 #DatRe
- Dòng 4: Hashtag HÀNH ĐỘNG + VIRAL — Ví dụ: #MuaBanNhadat #DauTuBDS #batdongsanvietnam #nhadatviet #moigioibds
- Tổng tối thiểu 15 hashtag, tối đa 25 hashtag.
- Hashtag viết liền không dấu, CamelCase hoặc lowercase, KHÔNG có khoảng trắng trong hashtag.
- Ưu tiên hashtag có volume tìm kiếm cao trên Facebook/Zalo.`;

export async function POST(req: NextRequest) {
  const startTime = Date.now();
  let jobId: string | null = null;
  let modelUsed = '';

  try {
    const body = await req.json();
    const { rawInfo, style, customPrompt, signature, access_token, workspaceId, driveFolderId } = body;

    if (!rawInfo || !rawInfo.trim()) {
      return NextResponse.json({ success: false, error: "Vui lòng nhập thông tin BĐS." }, { status: 400 });
    }

    // Auth
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ success: false, error: "Bạn cần đăng nhập." }, { status: 401 });
    }

    // Check credit balance (pre-flight, NO deduction)
    const { checkCreditBalance } = await import('@/lib/workspace-utils');
    const balanceCheck = await checkCreditBalance(workspaceId, user.id, 2);
    if (!balanceCheck.success) {
      return NextResponse.json({ success: false, error: balanceCheck.error }, { status: 403 });
    }

    // Create usage log
    jobId = randomUUID();
    await db.insert(usageLogs).values({
      id: randomUUID(),
      jobId,
      workspaceId,
      userId: user.id,
      tool: 'v3_quick',
      creditsCharged: 0,
      status: 'pending',
      inputSummary: rawInfo.substring(0, 200),
    });

    // Build prompt
    const systemPrompt = (customPrompt && customPrompt.trim().length > 0) ? customPrompt.trim() : DEFAULT_SYSTEM_PROMPT;
    const styleInstruction = style ? `\n\n**PHONG CÁCH BẮT BUỘC:** Bài viết PHẢI viết theo phong cách "${style}". Giữ vững 100% phong cách này xuyên suốt bài.` : '';

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

    // Generate with Replicate (sync — V3 returns text directly)
    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;
    let responseText = "";

    try {
      modelUsed = 'openai/gpt-5-nano';
      const output = await replicate.run("openai/gpt-5-nano", {
        input: { prompt: fullPrompt, temperature: 0.7, max_tokens: 4096 }
      });
      responseText = Array.isArray(output) ? output.join('') : String(output);
    } catch {
      console.warn("[V3] gpt-5-nano failed. Falling back to gpt-4.1-nano...");
      try {
        modelUsed = 'openai/gpt-4.1-nano';
        const fallback = await replicate.run("openai/gpt-4.1-nano", {
          input: { prompt: fullPrompt, temperature: 0.7, max_tokens: 4096 }
        });
        responseText = Array.isArray(fallback) ? fallback.join('') : String(fallback);
      } catch (err: any) {
        // Both models failed — no credit deduction
        if (jobId) {
          await db.update(usageLogs).set({
            status: 'failed', modelUsed, errorMessage: err.message,
            durationMs: Date.now() - startTime, completedAt: new Date(),
          }).where(eq(usageLogs.jobId, jobId));
        }
        return NextResponse.json({ success: false, error: "AI text generation failed. Không trừ credit." }, { status: 500 });
      }
    }

    // Save to Drive (if token available)
    let documentId = null;
    if (access_token) {
      try {
        const oAuth2Client = new google.auth.OAuth2();
        oAuth2Client.setCredentials({ access_token });
        const drive = google.drive({ version: 'v3', auth: oAuth2Client });
        const docs = google.docs({ version: 'v1', auth: oAuth2Client });

        const folderName = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(/[\/:]/g, '-');
        const folderMetadata: any = {
          name: `[V3] [${folderName}]`,
          mimeType: 'application/vnd.google-apps.folder',
        };
        if (driveFolderId) folderMetadata.parents = [driveFolderId];

        const folderRes = await drive.files.create({ requestBody: folderMetadata, fields: 'id' });
        const subFolderId = folderRes.data?.id;

        if (subFolderId) {
          const fileRes = await drive.files.create({
            requestBody: {
              name: `Bài đăng AI V3 - ${folderName}`,
              mimeType: 'application/vnd.google-apps.document',
              parents: [subFolderId]
            },
            fields: 'id'
          });
          documentId = fileRes.data?.id;

          if (documentId) {
            await docs.documents.batchUpdate({
              documentId,
              requestBody: {
                requests: [{ insertText: { location: { index: 1 }, text: responseText } }]
              }
            });
          }
        }
      } catch (driveErr: any) {
        console.warn("[V3] Drive save failed (non-blocking):", driveErr.message);
      }
    }

    // Deduct credits ONLY after successful text generation
    const { deductWorkspaceCredit } = await import('@/lib/workspace-utils');
    const deductRes = await deductWorkspaceCredit(workspaceId, user.id, 2);

    // Update usage log
    if (jobId) {
      await db.update(usageLogs).set({
        status: deductRes.success ? 'success' : 'partial',
        creditsCharged: deductRes.success ? 2 : 0,
        modelUsed,
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
        errorMessage: deductRes.success ? null : deductRes.error,
      }).where(eq(usageLogs.jobId, jobId));
    }

    return NextResponse.json({ success: true, text: responseText, documentId });
  } catch (error: any) {
    console.error("Generate V3 Error:", error);
    // Mark log as failed if jobId exists
    if (jobId) {
      try {
        await db.update(usageLogs).set({
          status: 'failed', modelUsed, errorMessage: error.message,
          durationMs: Date.now() - startTime, completedAt: new Date(),
        }).where(eq(usageLogs.jobId, jobId));
      } catch {} // best effort
    }
    return NextResponse.json({ success: false, error: error.message || "Lỗi hệ thống AI. Không trừ credit." }, { status: 500 });
  }
}
