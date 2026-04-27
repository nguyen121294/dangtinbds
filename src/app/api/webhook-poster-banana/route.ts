import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const subFolderId = url.searchParams.get("subFolderId");
    const access_token = url.searchParams.get("token");
    const originalFileName = url.searchParams.get("fileName") || "poster.jpg";

    if (!subFolderId || !access_token) {
      console.error("[Webhook-Poster-Banana] Missing metadata in URL");
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    const prediction = await req.json();
    console.log(`[Webhook-Poster-Banana] Nhận webhook từ Replicate. Status: ${prediction.status}`);

    if (prediction.status !== "succeeded") {
      return NextResponse.json({ success: true, message: "Bỏ qua vì tiến trình chưa chạy xong / lỗi" });
    }

    let resultUrl = "";
    if (Array.isArray(prediction.output) && prediction.output.length > 0) {
      resultUrl = prediction.output[0];
    } else if (typeof prediction.output === 'string') {
      resultUrl = prediction.output;
    } else if (prediction.output && typeof prediction.output === "object" && 'image' in prediction.output) {
      resultUrl = (prediction.output as any).image;
    } else if (prediction.output && typeof prediction.output === "object" && 'file' in prediction.output) {
      resultUrl = (prediction.output as any).file;
    }

    if (!resultUrl) {
      console.error("[Webhook-Poster-Banana] Không tìm thấy URL kết quả:", JSON.stringify(prediction.output));
      return NextResponse.json({ error: "No output URL" }, { status: 400 });
    }

    let imageBuffer: Buffer;
    if (resultUrl.startsWith('data:image')) {
      const base64Data = resultUrl.split(',')[1];
      imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
      const imageResponse = await fetch(resultUrl);
      if (!imageResponse.ok) {
        throw new Error(`Lỗi kéo ảnh poster từ Replicate: ${imageResponse.statusText}`);
      }
      const arrayBuf = await imageResponse.arrayBuffer();
      imageBuffer = Buffer.from(arrayBuf);
    }

    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    const finalName = `[Poster-AI-Premium] ${originalFileName}`;

    const mediaStream = new Readable();
    mediaStream.push(imageBuffer);
    mediaStream.push(null);

    const driveRes = await drive.files.create({
      requestBody: { name: finalName, parents: [subFolderId] },
      media: { mimeType: 'image/jpeg', body: mediaStream },
      fields: 'id'
    });

    console.log(`✅ [Webhook-Poster-Banana] Poster đã lưu vào Drive. ID: ${driveRes.data.id}`);
    return NextResponse.json({ success: true, fileId: driveRes.data.id });

  } catch (error: any) {
    console.error("[Webhook-Poster-Banana] Lỗi:", error.message || error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
