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
    
    console.log(`[Worker-GPT] Bắt đầu luồng xử lý OpenAI GPT Image cho: ${imageUrl}`);

    // --- 1. Tải file gốc về Buffer (Sử dụng User OAuth Token) ---
    console.log(`[Worker-GPT] 1. Tải hình ảnh gốc từ Drive...`);
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

    // --- 2. Châm ngòi Webhook gọi Replicate OpenAI GPT Image ---
    console.log(`[Worker-GPT] 2. Gửi request Webhook tới Replicate...`);
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) throw new Error("Thiếu cấu hình biến môi trường REPLICATE_API_TOKEN");

    const replicate = new Replicate({ auth: replicateToken });

    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    
    const fileNameMatch = imageUrl.match(/\/([^\/?#]+)[^\/]*$/);
    const originalFileName = fileNameMatch ? fileNameMatch[1] : `image_${Math.random().toString(36).substring(7)}.jpg`;

    // Chuẩn bị URL Webhook để Replicate bắn trả kết quả
    const webhookUrl = `${protocol}://${host}/api/webhook-openai-gpt?subFolderId=${subFolderId}&token=${encodeURIComponent(access_token)}&fileName=${encodeURIComponent(originalFileName)}`;

    // Sử dụng DATA URIs để truyền buff ảnh 
    const base64Original = `data:image/jpeg;base64,${originalBuffer.toString('base64')}`;
    
    const customObjects = objectsToRemove || "cars, motorbikes, trash cans, house numbers, people";
    const gptPrompt = `xóa các vật thể sau nếu có trong hình: ${customObjects}`;

    console.log("[Worker-GPT] Đang gọi OpenAI GPT Image qua cơ chế create() webhook:", webhookUrl);
    await replicate.predictions.create({
      model: "openai/gpt-image-1.5",
      input: {
        image: base64Original,
        prompt: gptPrompt,
        aspect_ratio: "1:1",
        number_of_images: 1,
        quality: "low",
        output_format: "jpg",
        input_fidelity: "low",
        background: "auto",
        output_compression: 90,
        moderation: "auto"
      },
      webhook: webhookUrl,
      webhook_events_filter: ["completed"]
    });

    console.log(`[Worker-GPT] ✅ Châm ngòi xong tiến trình Webhook! Nhiệm vụ kết thúc.`);
    return NextResponse.json({ success: true, message: "Started processing with Replicate OpenAI GPT Image." });

  } catch (error: any) {
    console.error(`[Worker-GPT] Lỗi:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
