import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { google } from 'googleapis';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

const DEFAULT_SYSTEM_PROMPT = `Bạn là một chuyên gia môi giới bất động sản cực kỳ xuất sắc tại Việt Nam. 
Nhiệm vụ của bạn là viết một bài đăng Facebook (hoặc Zalo) rao bán/cho thuê bất động sản để chốt sale, độ dài 1/2 trang A4.
Ngôn từ thôi miên, cuốn hút, chuẩn SEO. Bạn phải tuân thủ nghiêm ngặt các nguyên tắc sau:
1. Luôn sử dụng emoji hợp lý, vừa phải để tạo điểm nhấn.
2. Bố cục bài đăng phải rõ ràng (Tiêu đề, Thân bài, Kêu gọi hành động).
3. Nhấn mạnh vào LỢI ÍCH (không gian sống, tiềm năng) chứ không chỉ liệt kê TÍNH NĂNG.
4. Trình bày tự nhiên, tạo cảm giác thân tín chứ không giống văn máy.
5. TUYỆT ĐỐI KHÔNG sử dụng ký hiệu markdown như **, ##, ~~. Chỉ dùng text thuần và emoji.`;

export async function POST(req: NextRequest) {
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

    // Deduct 2 credits
    const { deductWorkspaceCredit } = await import('@/lib/workspace-utils');
    const deductRes = await deductWorkspaceCredit(workspaceId, user.id, 2);
    if (!deductRes.success) {
      return NextResponse.json({ success: false, error: deductRes.error }, { status: 403 });
    }

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

${signature ? `LƯU Ý CUỐI BÀI: Phải đính kèm nguyên văn chữ ký sau vào vị trí cuối cùng của bài đăng dài. Không tự ý sửa đổi chữ ký:
${signature}` : ''}

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

    // Generate
    let responseText = "";
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: { systemInstruction: systemPrompt, temperature: 0.7 }
      });
      responseText = response.text || "";
    } catch {
      const fallback = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: userPrompt,
        config: { systemInstruction: systemPrompt, temperature: 0.7 }
      });
      responseText = fallback.text || "";
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

    return NextResponse.json({ success: true, text: responseText, documentId });
  } catch (error: any) {
    console.error("Generate V3 Error:", error);
    return NextResponse.json({ success: false, error: error.message || "Lỗi hệ thống AI." }, { status: 500 });
  }
}
