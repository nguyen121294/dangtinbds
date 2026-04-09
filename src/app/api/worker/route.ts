import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { Client } from '@upstash/qstash';
import { google } from 'googleapis';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, area, price, location, condition, direction, purpose, contact, highlights, style, headings, access_token, images, objectsToRemove } = body;

    // --- 1. VALIDATE OAUTH TOKEN ---
    if (!access_token) {
      console.error("Missing User Access Token");
      return NextResponse.json({ success: false, error: "Thiếu quyền truy cập vào Drive của người dùng" }, { status: 400 });
    }

    // --- 2. GENERATE AI CONTENT ---
    const systemPrompt = `Bạn là một chuyên gia môi giới bất động sản xuất sắc. Nhiệm vụ của bạn là viết một bài đăng facebook/zalo để chốt sale. Trình bày đẹp mắt, dùng emoji hiệu quả.`;

    const selectedHeadings = headings && headings.length > 0 ? headings.map((h: string) => `[x] ${h}`).join('\n') : 'Cung cấp đầy đủ thông tin';
    
    const userPrompt = `ĐĂNG TIN BẤT ĐỘNG SẢN:
- Loại hình: ${type}
- Vị trí: ${location}
- Thông số: ${area}
- Hiện trạng/Kết cấu: ${condition}
- Hướng: ${direction}
- Mục đích: ${purpose}
- Giá bán: ${price}
- Liên hệ: ${contact}
- Đặc điểm nổi bật: ${highlights}

**YẾU TỐ BẮT BUỘC:** Rập khuôn theo phong cách "${style}" xuyên suốt bài.
Đầu mục cần nhấn mạnh:
${selectedHeadings}

Viết bài thật hấp dẫn, không vòng vo.`;

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

    // --- 3. GOOGLE DRIVE/DOCS INTEGRATION ---
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    const docs = google.docs({ version: 'v1', auth: oAuth2Client });

    // 3.1. Tạo thư mục con (dd-mm-yyyy hh-mm-ss)
    const folderName = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(/[\/:]/g, '-');
    const folderMetadata = {
      name: `[${folderName}] ${type}`,
      mimeType: 'application/vnd.google-apps.folder',
    };
    
    const folderRes = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });
    const subFolderId = folderRes.data?.id;

    if (!subFolderId) throw new Error("Không thể tạo thư mục con trên Drive");

    // 3.2. Tạo Google Doc (Tài liệu trắng)
    const documentName = `Bài đăng gốc - ${location}`;
    const fileMetadata = {
      name: documentName,
      mimeType: 'application/vnd.google-apps.document',
      parents: [subFolderId]
    };
    
    const fileRes = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id'
    });
    
    const documentId = fileRes.data?.id;
    if (!documentId) throw new Error("Không thể tạo file Google Docs");

    // 3.3. Đổ chữ vào file Docs vừa tạo
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

    // --- 4. KÍCH HOẠT QUÁ TRÌNH XỬ LÝ ẢNH (FAN-OUT QSTASH) ---
    if (images && Array.isArray(images) && images.length > 0) {
      console.log(`Bắt đầu tạo ${images.length} job chỉnh ảnh...`);
      const qstashClient = new Client({ token: process.env.QSTASH_TOKEN || "" });
      
      const protocol = req.headers.get("x-forwarded-proto") || "http";
      const host = req.headers.get("host") || "localhost:3000";
      const workerImageUrl = `${protocol}://${host}/api/worker-image`;

      const publishPromises = images.map((imageUrl: string) => {
        return qstashClient.publishJSON({
          url: workerImageUrl,
          body: {
            imageUrl,
            subFolderId,
            access_token,
            objectsToRemove
          }
        });
      });
      
      await Promise.allSettled(publishPromises);
      console.log(`🚀 Đã bắn ${images.length} message sang QStash (Image Worker). Đang chờ xử lý ngầm...`);
    }

    console.log("✅ Successfully generated and saved to Drive ID:", documentId);
    return NextResponse.json({ success: true, documentId });
  } catch (error: any) {
    console.error("Worker Error:", error.message || error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = handler;
