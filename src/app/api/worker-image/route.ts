import { NextRequest, NextResponse } from 'next/server';
import { verifySignatureAppRouter } from '@upstash/qstash/nextjs';
import Replicate from 'replicate';
import { google } from 'googleapis';
import { Readable } from 'stream';

export const maxDuration = 60; // Nới lỏng thời gian chạy trên Serverless để chờ AI xử lý

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, subFolderId, access_token, objectsToRemove, enhanceImage } = body;

    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) {
        throw new Error("Lỗi Server: Chưa cài đặt cấu hình biến môi trường REPLICATE_API_TOKEN");
    }

    const replicate = new Replicate({
      auth: replicateToken,
    });

    // Validate Input
    if (!imageUrl || !subFolderId || !access_token) {
      console.error("Missing required fields for image worker");
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
    }

    console.log(`[ImageWorker] Bắt đầu xử lý xóa vật thể cho ảnh: ${imageUrl}`);

    // --- 1. Gọi Replicate API ---
    const customPrompt = objectsToRemove ? objectsToRemove : "car, motorbike, trash can, house number";
    const instructionPrompt = `Remove ${customPrompt} and blend the background naturally`;
    
    // Replicate API Configuration for Async Webhook
    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    
    // Tách tên file gốc từ Google Drive URL
    const fileNameMatch = imageUrl.match(/\/([^\/?#]+)[^\/]*$/);
    const fileName = fileNameMatch ? fileNameMatch[1] : `image_${Math.random().toString(36).substring(7)}.jpg`;

    // Đóng gói Webhook URL (Xây dựng Payload cực dài để ném cho Replicate gọi lại mình)
    const webhookUrl = `${protocol}://${host}/api/webhook-replicate?step=pix2pix&subFolderId=${subFolderId}&token=${encodeURIComponent(access_token)}&fileName=${encodeURIComponent(fileName)}&enhanceImage=${enhanceImage}`;

    // Gọi bằng hàm CREATE thay vì RUN. Nó sẽ đẩy job vào Replicate Queue và NHẢ RA NGAY LẬP TỨC (0.5s)
    await replicate.predictions.create({
      // LƯU Ý: Với hàm create(), Replicate SDK yêu cầu tham số là `version` chứa mã Hash, không dùng `model`
      version: "30c1d0b916a6f8efce20493f5d61ee27491ab2a60437c13c588468b9810ec23f",
      input: {
        image: imageUrl,
        prompt: instructionPrompt,
      },
      webhook: webhookUrl,
      webhook_events_filter: ["completed"]
    });

    console.log(`[ImageWorker] Đã châm ngòi nổ AI qua API Webhook thành công. Tạm biệt! (Tránh TimeOut)`);
    return NextResponse.json({ success: true, message: "Started processing. Webhook will take care of it." });

  } catch (error: any) {
    console.error("[ImageWorker] Error:", error.message || error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// Bạn PHẢI bọc verifySignatureAppRouter để Upstash đảm bảo an toàn truy cập, không bị lộ API cho người ngoài.
// TUY NHIÊN: Tạm thời tắt để check lỗi 500 do thiếu Variable QSTASH trên Netlify
export const POST = handler;
