import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import Replicate from 'replicate';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, subFolderId, access_token, prompt } = body;

    if (!imageUrl || !subFolderId || !access_token || !prompt) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
    }

    console.log(`[Worker-QwenEdit] Bắt đầu xử lý: ${imageUrl}`);

    // --- 1. Download original image from Drive ---
    console.log(`[Worker-QwenEdit] 1. Tải hình ảnh gốc từ Drive...`);
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });

    const fileIdMatch = imageUrl.match(/id=([^&]+)/);
    const fileId = fileIdMatch ? fileIdMatch[1] : null;
    if (!fileId) throw new Error("Invalid imageUrl format");

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    const fileResponse = await drive.files.get(
      { fileId, alt: 'media' },
      { responseType: 'arraybuffer' }
    );
    const originalBuffer = Buffer.from(fileResponse.data as ArrayBuffer);

    // --- 2. Call Replicate with webhook ---
    console.log(`[Worker-QwenEdit] 2. Gửi request Webhook tới Replicate...`);
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) throw new Error("Thiếu cấu hình biến môi trường REPLICATE_API_TOKEN");

    const replicate = new Replicate({ auth: replicateToken });

    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";

    const fileNameMatch = imageUrl.match(/\/([^\/?#]+)[^\/]*$/);
    const originalFileName = fileNameMatch ? fileNameMatch[1] : `image_${Math.random().toString(36).substring(7)}.jpg`;

    // Webhook URL for Replicate callback
    const webhookUrl = `${protocol}://${host}/api/webhook-qwen-image-edit?subFolderId=${subFolderId}&token=${encodeURIComponent(access_token)}&fileName=${encodeURIComponent(originalFileName)}`;

    // Convert buffer to base64 Data URI
    const base64Original = `data:image/jpeg;base64,${originalBuffer.toString('base64')}`;

    console.log("[Worker-QwenEdit] Đang gọi qwen-image-edit-plus qua webhook:", webhookUrl);
    await replicate.predictions.create({
      model: "qwen/qwen-image-edit-plus",
      input: {
        image_input: [base64Original],
        prompt: prompt,
        disable_safety_checker: true,
      },
      webhook: webhookUrl,
      webhook_events_filter: ["completed"]
    });

    console.log(`[Worker-QwenEdit] ✅ Châm ngòi xong! Nhiệm vụ kết thúc.`);
    return NextResponse.json({ success: true, message: "Started processing with Qwen Image Edit Plus." });

  } catch (error: any) {
    console.error(`[Worker-QwenEdit] Lỗi:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
