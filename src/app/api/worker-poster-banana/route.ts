import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import Replicate from 'replicate';

export const maxDuration = 120;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      imageUrls, mainImageIndex, subFolderId, access_token,
      posterPrompt, taskName,
      // Deferred credit info
      jobId, workspaceId, userId, requiredCredits
    } = body;

    if (!imageUrls || imageUrls.length === 0 || !subFolderId || !access_token) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
    }

    console.log(`[Worker-Poster-Banana] Bắt đầu tạo poster với ${imageUrls.length} ảnh...`);

    // --- 1. Tải tất cả ảnh từ Drive ---
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    const base64Images: string[] = [];

    for (let i = 0; i < imageUrls.length; i++) {
      const url = imageUrls[i];
      const fileIdMatch = url.match(/id=([^&]+)/);
      const fileId = fileIdMatch ? fileIdMatch[1] : null;

      if (!fileId) continue;

      try {
        const fileResponse = await drive.files.get(
          { fileId, alt: 'media' },
          { responseType: 'arraybuffer' }
        );
        const buffer = Buffer.from(fileResponse.data as ArrayBuffer);

        if (buffer.length === 0) continue;

        base64Images.push(`data:image/jpeg;base64,${buffer.toString('base64')}`);
        console.log(`[Worker-Poster-Banana] ✅ Tải ảnh ${i + 1}/${imageUrls.length} (${buffer.length} bytes)`);
      } catch (e: any) {
        console.error(`[Worker-Poster-Banana] Lỗi tải ảnh ${fileId}:`, e.message);
      }
    }

    if (base64Images.length === 0) {
      throw new Error("Không tải được ảnh nào từ Drive");
    }

    // Sắp xếp: ảnh chính lên đầu
    if (mainImageIndex > 0 && mainImageIndex < base64Images.length) {
      const mainImg = base64Images.splice(mainImageIndex, 1)[0];
      base64Images.unshift(mainImg);
    }

    // --- 2. Gọi Replicate Nano-Banana ---
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) throw new Error("Thiếu REPLICATE_API_TOKEN");

    const replicate = new Replicate({ auth: replicateToken });

    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";

    const webhookParams = new URLSearchParams({
      subFolderId,
      token: access_token,
      fileName: `poster_${taskName || 'output'}.jpg`,
      ...(jobId && { jobId }),
      ...(workspaceId && { workspaceId }),
      ...(userId && { userId }),
      ...(requiredCredits != null && { requiredCredits: String(requiredCredits) }),
    });
    const webhookUrl = `${protocol}://${host}/api/webhook-poster-banana?${webhookParams.toString()}`;

    console.log(`[Worker-Poster-Banana] Gọi Nano-Banana với ${base64Images.length} ảnh...`);
    await replicate.predictions.create({
      model: "google/nano-banana",
      input: {
        image_input: base64Images,
        prompt: posterPrompt,
      },
      webhook: webhookUrl,
      webhook_events_filter: ["completed"]
    });

    console.log(`[Worker-Poster-Banana] ✅ Châm ngòi xong tiến trình Webhook!`);
    return NextResponse.json({ success: true, message: "Started processing poster with Nano-Banana." });

  } catch (error: any) {
    console.error(`[Worker-Poster-Banana] Lỗi:`, error.message || error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
