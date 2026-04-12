import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

export const maxDuration = 60; 

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const subFolderId = url.searchParams.get("subFolderId");
    const access_token = url.searchParams.get("token");
    const originalFileName = url.searchParams.get("fileName") || "image.jpg";

    if (!subFolderId || !access_token) {
      console.error("[Webhook-Banana] Missing metadata in URL");
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    // Replicate trả về đối tượng Prediction
    const prediction = await req.json();
    console.log(`[Webhook-Banana] Nhận webhook từ Replicate. Status: ${prediction.status}`);

    if (prediction.status !== "succeeded") {
      return NextResponse.json({ success: true, message: "Bỏ qua vì tiến trình chưa chạy xong / lỗi" });
    }

    // Lấy link kết quả output từ Nano-Banana.
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
      console.error("[Webhook-Banana] Không tìm thấy URL kết quả (Output null?) Cấu trúc output Replicate:", JSON.stringify(prediction.output));
      return NextResponse.json({ error: "No output URL" }, { status: 400 });
    }

    // --- TẢI ẢNH REPLICATE XUỐNG VÀO BUFFER ---
    console.log(`[Webhook-Banana] Lấy ảnh thành quả từ resultURL...`);
    
    // Nếu kết quả trả ra đã là base64 (Data URI) thì không cần fetch
    let imageBuffer: Buffer;
    if (resultUrl.startsWith('data:image')) {
       const base64Data = resultUrl.split(',')[1];
       imageBuffer = Buffer.from(base64Data, 'base64');
    } else {
       const imageResponse = await fetch(resultUrl);
       if (!imageResponse.ok) {
         throw new Error(`Lỗi kéo ảnh kết quả từ Replicate URL: ${imageResponse.statusText}`);
       }
       const arrayBuf = await imageResponse.arrayBuffer();
       imageBuffer = Buffer.from(arrayBuf);
    }

    // --- LƯU VÀO GOOGLE DRIVE ---
    console.log(`[Webhook-Banana] Đưa vào thư mục Drive của user...`);
    
    // Setup Google Drive Auth
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    const finalName = `[AI-Banana] ${Math.random().toString(36).substring(7)}_${originalFileName}`;

    const mediaStream = new Readable();
    mediaStream.push(imageBuffer);
    mediaStream.push(null);

    const fileMetadata = {
      name: finalName,
      parents: [subFolderId]
    };

    const media = {
      mimeType: 'image/jpeg', 
      body: mediaStream
    };

    const driveRes = await drive.files.create({
      requestBody: fileMetadata,
      media: media,
      fields: 'id'
    });

    console.log(`✅ [Webhook-Banana] Thêm ảnh thành công vào Google Drive. ID: ${driveRes.data.id}`);
    return NextResponse.json({ success: true, fileId: driveRes.data.id });

  } catch (error: any) {
    console.error("[Webhook-Banana] Lỗi:", error.message || error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
