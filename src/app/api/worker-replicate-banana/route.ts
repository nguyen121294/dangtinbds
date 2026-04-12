import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import Replicate from 'replicate';

export const maxDuration = 60; // 60s max on Pro per Vercel limits

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, subFolderId, access_token, objectsToRemove } = body;

    // maskFolderId is not needed for this model
    if (!imageUrl || !subFolderId || !access_token) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
    }

    console.log(`[Worker-Banana] Bắt đầu luồng xử lý Gemini Flash cho: ${imageUrl}`);

    // --- 1. Tải file gốc về Buffer (Sử dụng User OAuth Token) ---
    console.log(`[Worker-Banana] 1. Tải hình ảnh gốc từ Drive...`);
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });

    const fileIdMatch = imageUrl.match(/id=([^&]+)/);
    const fileId = fileIdMatch ? fileIdMatch[1] : null;

    if (!fileId) throw new Error("Invalid imageUrl format");

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    const fileResponse = await drive.files.get(
      { fileId: fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    const originalBuffer = Buffer.from(fileResponse.data as ArrayBuffer);

    // --- 2. Châm ngòi Webhook gọi Replicate Nano-Banana ---
    console.log(`[Worker-Banana] 2. Gửi request Webhook tới Replicate...`);
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) throw new Error("Thiếu cấu hình biến môi trường REPLICATE_API_TOKEN");

    const replicate = new Replicate({ auth: replicateToken });

    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";

    const fileNameMatch = imageUrl.match(/\/([^\/?#]+)[^\/]*$/);
    const originalFileName = fileNameMatch ? fileNameMatch[1] : `image_${Math.random().toString(36).substring(7)}.jpg`;

    // Chuẩn bị URL Webhook để Replicate bắn trả kết quả
    const webhookUrl = `${protocol}://${host}/api/webhook-replicate-banana?subFolderId=${subFolderId}&token=${encodeURIComponent(access_token)}&fileName=${encodeURIComponent(originalFileName)}`;

    // Sử dụng DATA URIs để truyền buff ảnh 
    const base64Original = `data:image/jpeg;base64,${originalBuffer.toString('base64')}`;

    const customObjects = objectsToRemove || "cars, motorbikes, trash cans, house numbers, people";
    const bananaPrompt = `xóa các vật thể sau nếu có trong hình: ${customObjects}`;

    console.log("[Worker-Banana] Đang gọi Nano-Banana qua cơ chế create() webhook:", webhookUrl);
    await replicate.predictions.create({
      model: "google/nano-banana",
      input: {
        image_input: [base64Original],
        prompt: bananaPrompt,
      },
      webhook: webhookUrl,
      webhook_events_filter: ["completed"]
    });

    console.log(`[Worker-Banana] ✅ Châm ngòi xong tiến trình Webhook! Nhiệm vụ kết thúc.`);
    return NextResponse.json({ success: true, message: "Started processing with Replicate Nano-Banana." });

  } catch (error: any) {
    console.error(`[Worker-Banana] Lỗi:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
