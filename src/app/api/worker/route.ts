import { GoogleGenAI } from '@google/genai';
import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import { google } from 'googleapis';

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, area, price, location, condition, direction, purpose, contact, highlights, style, headings, driveFolderUrl } = body;

    // --- 1. EXTRACT FOLDER ID ---
    const folderIdMatch = driveFolderUrl.match(/folders\/([a-zA-Z0-9-_]+)/);
    const parentFolderId = folderIdMatch ? folderIdMatch[1] : null;

    if (!parentFolderId) {
      console.error("Invalid Drive Folder URL:", driveFolderUrl);
      return NextResponse.json({ success: false, error: "Link Drive không hợp lệ" }, { status: 400 });
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
    const credentialsStr = process.env.GOOGLE_SERVICE_ACCOUNT_CREDENTIALS;
    if (!credentialsStr) {
       console.error("Missing GOOGLE_SERVICE_ACCOUNT_CREDENTIALS");
       return NextResponse.json({ success: false, error: "Server thiếu chứng chỉ con Bot Google (JSON)" }, { status: 500 });
    }

    const credentials = JSON.parse(credentialsStr);
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/drive', 'https://www.googleapis.com/auth/documents'],
    });

    const drive = google.drive({ version: 'v3', auth });
    const docs = google.docs({ version: 'v1', auth });

    // 3.1. Tạo thư mục con (dd-mm-yyyy hh-mm-ss)
    const folderName = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(/[\/:]/g, '-');
    const folderMetadata = {
      name: `[${folderName}] ${type}`,
      mimeType: 'application/vnd.google-apps.folder',
      parents: [parentFolderId]
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

    console.log("✅ Successfully generated and saved to Drive ID:", documentId);
    return NextResponse.json({ success: true, documentId });
  } catch (error: any) {
    console.error("Worker Error:", error.message || error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Bọc bộ xác thực chữ ký của QStash để đảm bảo Hacker không thể spam fake webhook API này.
export const POST = verifySignatureAppRouter(handler);
