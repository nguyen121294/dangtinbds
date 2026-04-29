import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import Replicate from 'replicate';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrls, mainImageIndex, subFolderId, access_token, posterPrompt, taskName } = body;

    if (!imageUrls || imageUrls.length === 0 || !subFolderId || !access_token) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
    }

    console.log(`[Worker-Poster-GPT] Bắt đầu tạo poster với ${imageUrls.length} ảnh...`);

    // --- 1. Tải tất cả ảnh từ Drive ---
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    const imageBlobs: Blob[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      const fileIdMatch = url.match(/id=([^&]+)/);
      const fileId = fileIdMatch ? fileIdMatch[1] : null;

      if (!fileId) {
        console.error(`[Worker-Poster-GPT] Invalid URL format: ${url}`);
        continue;
      }

      try {
        const fileResponse = await drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        const buffer = Buffer.from(fileResponse.data as ArrayBuffer);
        const mimeType = (fileResponse.headers?.['content-type'] as string | undefined)?.split(';')[0]?.trim() || 'image/jpeg';

        if (buffer.length === 0) {
          console.error(`[Worker-Poster-GPT] Buffer rỗng cho ảnh ${fileId}`);
          continue;
        }

        const firstBytes = buffer.slice(0, 10).toString('utf8');
        if (firstBytes.trimStart().startsWith('<')) {
          console.error(`[Worker-Poster-GPT] Drive trả về HTML cho ảnh ${fileId}`);
          continue;
        }

        imageBlobs.push(new Blob([new Uint8Array(buffer)], { type: mimeType }));
        console.log(`[Worker-Poster-GPT] ✅ Tải ảnh ${i + 1}/${imageUrls.length} (${buffer.length} bytes)`);
      } catch (e: any) {
        console.error(`[Worker-Poster-GPT] Lỗi tải ảnh ${fileId}:`, e.message);
      }
    }

    if (imageBlobs.length === 0) {
      throw new Error("Không tải được ảnh nào từ Drive");
    }

    // Sắp xếp: ảnh chính lên đầu
    if (mainImageIndex > 0 && mainImageIndex < imageBlobs.length) {
      const mainBlob = imageBlobs.splice(mainImageIndex, 1)[0];
      imageBlobs.unshift(mainBlob);
    }

    // --- 2. Gọi Replicate OpenAI GPT Image ---
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) throw new Error("Thiếu REPLICATE_API_TOKEN");

    const replicate = new Replicate({ auth: replicateToken });

    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";

    const webhookUrl = `${protocol}://${host}/api/webhook-poster-gpt?subFolderId=${subFolderId}&token=${encodeURIComponent(access_token)}&fileName=${encodeURIComponent(`poster_${taskName || 'output'}.jpg`)}`;

    console.log(`[Worker-Poster-GPT] Gọi GPT-Image-2 với ${imageBlobs.length} ảnh...`);
    const prediction = await replicate.predictions.create({
      model: "openai/gpt-image-2",
      input: {
        input_images: imageBlobs,
        prompt: posterPrompt,
        aspect_ratio: "2:3",
        number_of_images: 1,
        quality: "low",
        output_format: "jpeg",
        background: "auto",
        moderation: "low"
      },
      webhook: webhookUrl,
      webhook_events_filter: ["completed"]
    });

    console.log(`[Worker-Poster-GPT] ✅ Prediction created. ID: ${prediction.id}`);
    return NextResponse.json({ success: true, predictionId: prediction.id });

  } catch (error: any) {
    console.error(`[Worker-Poster-GPT] Lỗi:`, error.message || error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
