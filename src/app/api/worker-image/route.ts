import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import Replicate from 'replicate';
import { google } from 'googleapis';

const replicate = new Replicate({
  auth: process.env.REPLICATE_API_TOKEN,
});

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, subFolderId, access_token, objectsToRemove } = body;

    // Validate Input
    if (!imageUrl || !subFolderId || !access_token) {
      console.error("Missing required fields for image worker");
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
    }

    console.log(`[ImageWorker] Bắt đầu xử lý xóa vật thể cho ảnh: ${imageUrl}`);

    // --- 1. Gọi Replicate API ---
    const customPrompt = objectsToRemove ? objectsToRemove : "car, motorbike, trash can, house number";
    
    // Gọi một mô hình Unified Remove Object (Lưu ý: Có thể cần chỉ định Version Hash của model nếu báo lỗi)
    // Ví dụ sử dụng một model Text-based Inpainting phổ biến
    const output = await replicate.run(
      "lucataco/remove-object", // Hoặc thay bằng Model Version Hash mà bạn cấu hình
      {
        input: {
          image: imageUrl,
          prompt: customPrompt,
        }
      }
    );

    // Replicate thường trả về URL của ảnh kết quả dưới dạng mảng hoặc chuỗi
    let resultUrl = "";
    if (Array.isArray(output) && output.length > 0) {
      resultUrl = output[0];
    } else if (typeof output === 'string') {
      resultUrl = output;
    }

    if (!resultUrl) {
      throw new Error("Không lấy được kết quả từ Replicate API");
    }

    console.log(`[ImageWorker] Xử lý AI thành công. Kết quả tạm tại: ${resultUrl}`);

    // --- 2. Tải ảnh từ Replicate về buffer để up lên Drive ---
    const imageResponse = await fetch(resultUrl);
    if (!imageResponse.ok) {
      throw new Error(`Failed to fetch processed image: ${imageResponse.statusText}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    // --- 3. GOOGLE DRIVE INTEGRATION ---
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    // Trích xuất tên file từ URL gốc (VD: a.jpg)
    const fileNameMatch = imageUrl.match(/\/([^\/?#]+)[^\/]*$/);
    const fileName = fileNameMatch ? `[Đã xử lý AI] ${Math.random().toString(36).substring(7)}_${fileNameMatch[1]}` : `[Đã xử lý AI] image_${Math.random().toString(36).substring(7)}.jpg`;

    // Tạo luồng dữ liệu ảo để up lên Drive
    const { Readable } = require('stream');
    const mediaStream = new Readable();
    mediaStream.push(Buffer.from(imageBuffer));
    mediaStream.push(null);

    const fileMetadata = {
      name: fileName,
      parents: [subFolderId]
    };

    const media = {
      mimeType: 'image/jpeg', // Hoặc 'image/png' tùy ảnh gốc
      body: mediaStream
    };

    const driveRes = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id'
    });

    console.log(`✅ [ImageWorker] Successfully processed and saved image to Drive. Document ID: ${driveRes.data.id}`);
    return NextResponse.json({ success: true, processedImageId: driveRes.data.id });

  } catch (error: any) {
    console.error("[ImageWorker] Error:", error.message || error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Bạn PHẢI bọc verifySignatureAppRouter để Upstash đảm bảo an toàn truy cập, không bị lộ API cho người ngoài.
// Nếu đang test thử dưới Local (chưa có Upstash Webhook thực tế chạy), bạn có thể tạm export POST = handler;
export const POST = verifySignatureAppRouter(handler);
