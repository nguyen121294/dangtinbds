import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';
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

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { rawInfo, style, customPrompt, access_token, images, objectsToRemoveStr, enhanceImage, imageProcessingEngine, driveFolderId, signature } = body;

    if (!access_token) {
      console.error("Missing User Access Token");
      return NextResponse.json({ success: false, error: "Thiếu quyền truy cập vào Drive của người dùng" }, { status: 400 });
    }

    // --- SYSTEM PROMPT ---
    const systemPrompt = (customPrompt && customPrompt.trim().length > 0) ? customPrompt.trim() : DEFAULT_SYSTEM_PROMPT;
    const styleInstruction = style ? `\n\n**PHONG CÁCH BẮT BUỘC:** Bài viết PHẢI viết theo phong cách "${style}". Giữ vững 100% phong cách này xuyên suốt bài.` : '';

    // --- USER PROMPT ---
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

📌 Tiêu đề: {ngắn gọn xúc tích, dễ nhớ, ví dụ: "Đất nền Nguyễn Duy Trinh", "Biệt thự Thảo Điền"}
🏠 Loại BĐS: {loại bất động sản}
📍 Vị trí: {địa chỉ / khu vực}
📐 Diện tích, kích thước: {diện tích / ngang x dài}
🏗 Hiện trạng: {hiện trạng / kết cấu}
🧭 Hướng: {hướng nhà / đất}
🎯 Phù hợp: {mục đích sử dụng, ví dụ: xây nhà, cho thuê, đầu tư...}
💰 Giá bán: {giá}
✅ Điểm mạnh: {pháp lý, tiện ích, ưu điểm nổi bật...}
${signature ? `\n${signature}` : ''}

=== FORMAT OUTPUT ===
Bắt đầu PHẦN 1 bằng dòng: ===BÀI ĐĂNG DÀI===
Bắt đầu PHẦN 2 bằng dòng: ===BÀI ĐĂNG NGẮN===
Viết liên tục, KHÔNG giải thích gì thêm.`;

    let responseText = "";

    try {
      const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: userPrompt,
        config: { systemInstruction: systemPrompt, temperature: 0.7 }
      });
      responseText = response.text || "";
    } catch (modelError: any) {
      console.warn("Gemini 2.5 Flash failed. Falling back to 2.5 Flash Lite...");
      const fallbackResponse = await ai.models.generateContent({
        model: 'gemini-2.5-flash-lite',
        contents: userPrompt,
        config: { systemInstruction: systemPrompt, temperature: 0.7 }
      });
      responseText = fallbackResponse.text || "";
    }

    // --- GOOGLE DRIVE/DOCS ---
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    const docs = google.docs({ version: 'v1', auth: oAuth2Client });

    // Tạo thư mục con
    const folderName = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(/[\/:]/g, '-');
    const folderMetadata: any = {
      name: `[V2] [${folderName}]`,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (driveFolderId) {
      folderMetadata.parents = [driveFolderId];
    }

    const folderRes = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });
    const subFolderId = folderRes.data?.id;
    if (!subFolderId) throw new Error("Không thể tạo thư mục con trên Drive");

    // Tạo 1 Google Doc chứa cả 2 bài
    const documentName = `Bài đăng AI V2 - ${folderName}`;
    const fileRes = await drive.files.create({
      requestBody: {
        name: documentName,
        mimeType: 'application/vnd.google-apps.document',
        parents: [subFolderId]
      },
      fields: 'id'
    });

    const documentId = fileRes.data?.id;
    if (!documentId) throw new Error("Không thể tạo file Google Docs");

    // Đổ nội dung vào Docs
    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: responseText
            }
          }
        ]
      }
    });

    // --- FAN-OUT IMAGE PROCESSING (giống V1) ---
    if (images && Array.isArray(images) && images.length > 0) {
      console.log(`[V2] Bắt đầu xử lý ${images.length} ảnh...`);

      const anhGocRes = await drive.files.create({
        requestBody: {
          name: 'Anh Goc',
          mimeType: 'application/vnd.google-apps.folder',
          parents: [subFolderId]
        },
        fields: 'id'
      });
      const anhGocFolderId = anhGocRes.data.id;

      let maskFolderId = undefined;
      if (imageProcessingEngine === 'vertex_ai' || imageProcessingEngine === 'vision_lama' || imageProcessingEngine === 'vision_flux') {
        const maskRes = await drive.files.create({
          requestBody: {
            name: 'Anh Mask',
            mimeType: 'application/vnd.google-apps.folder',
            parents: [subFolderId]
          },
          fields: 'id'
        });
        maskFolderId = maskRes.data.id;
      }

      const qstashClient = new Client({ token: process.env.QSTASH_TOKEN || "" });
      const protocol = req.headers.get("x-forwarded-proto") || "http";
      const host = req.headers.get("host") || "localhost:3000";
      let workerImageUrl = `${protocol}://${host}/api/worker-image`;
      if (imageProcessingEngine === 'vertex_ai') {
        workerImageUrl = `${protocol}://${host}/api/worker-vertex-image`;
      } else if (imageProcessingEngine === 'vision_lama') {
        workerImageUrl = `${protocol}://${host}/api/worker-vision-lama`;
      } else if (imageProcessingEngine === 'vision_flux') {
        workerImageUrl = `${protocol}://${host}/api/worker-vision-flux`;
      } else if (imageProcessingEngine === 'replicate_banana') {
        workerImageUrl = `${protocol}://${host}/api/worker-replicate-banana`;
      } else if (imageProcessingEngine === 'openai_gpt') {
        workerImageUrl = `${protocol}://${host}/api/worker-openai-gpt`;
      }

      const publishPromises = images.map(async (fileId: string, index: number) => {
        try {
          const file = await drive.files.get({ fileId: fileId, fields: 'parents' });
          const previousParents = file.data.parents?.join(',') || '';

          await drive.permissions.create({
            fileId: fileId,
            requestBody: { role: 'reader', type: 'anyone' }
          });

          await drive.files.update({
            fileId: fileId,
            addParents: anhGocFolderId!,
            removeParents: previousParents,
            fields: 'id, webContentLink, webViewLink'
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
          console.error(`[V2] Lỗi gom file ${fileId}:`, e.message);
        }
      });

      await Promise.allSettled(publishPromises);
      console.log(`[V2] 🚀 Đã bắn ${images.length} message sang Image Worker.`);
    }

    console.log("[V2] ✅ Done. Document ID:", documentId);
    return NextResponse.json({ success: true, documentId });
  } catch (error: any) {
    console.error("Worker V2 Error:", error.message || error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = handler;
