import { NextRequest, NextResponse } from 'next/server';
import Replicate from 'replicate';
import { google } from 'googleapis';
import { Readable } from 'stream';

export const maxDuration = 60; 

export async function POST(req: NextRequest) {
  try {
    const url = new URL(req.url);
    const step = url.searchParams.get("step");
    const subFolderId = url.searchParams.get("subFolderId");
    const access_token = url.searchParams.get("token");
    const enhanceImage = url.searchParams.get("enhanceImage") === "true";
    const originalFileName = url.searchParams.get("fileName") || "image.jpg";

    if (!subFolderId || !access_token) {
      console.error("[Webhook] Missing metadata in URL");
      return NextResponse.json({ error: "Missing metadata" }, { status: 400 });
    }

    // Replicate trả về đối tượng Prediction
    const prediction = await req.json();
    console.log(`[Webhook] Nhận tín hiệu từ Replicate (Step: ${step}). Status: ${prediction.status}`);

    if (prediction.status !== "succeeded") {
      return NextResponse.json({ success: true, message: "Bỏ qua vì chưa succeeded hoặc bị lỗi" });
    }

    let resultUrl = "";
    if (Array.isArray(prediction.output) && prediction.output.length > 0) {
      resultUrl = prediction.output[0];
    } else if (typeof prediction.output === 'string') {
      resultUrl = prediction.output;
    } else if (prediction.output && typeof prediction.output === "object" && 'image' in prediction.output) {
      resultUrl = (prediction.output as any).image;
    }

    if (!resultUrl) {
      console.error("[Webhook] Không tìm thấy URL kết quả trong output");
      return NextResponse.json({ error: "No output URL" }, { status: 400 });
    }

    // --- XÉT LUỒNG ĐI TIẾP ---
    // NẾU vừa xong bước Pix2Pix VÀ User có tích chọn Enhance Image -> Gửi tiếp lên Replicate Model thứ 2
    if (step === "pix2pix" && enhanceImage) {
        console.log(`[Webhook] Bắt đầu Giai đoạn 2: Gọi Real-ESRGAN làm nét ảnh...`);
        const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
        
        // Gọi bằng hàm CREATE (Non-blocking) để tiếp tục uỷ quyền cho Webhook này xử lý
        const protocol = req.headers.get("x-forwarded-proto") || "http";
        const host = req.headers.get("host") || "localhost:3000";
        const nextWebhookUrl = `${protocol}://${host}/api/webhook-replicate?step=esrgan&subFolderId=${subFolderId}&token=${encodeURIComponent(access_token)}&fileName=${encodeURIComponent(originalFileName)}&enhanceImage=false`;

        await replicate.predictions.create({
            // Sửa lỗi 404: Hàm create() bắt buộc truyền mã Hash vào thuộc tính 'version'
            version: "42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
            input: {
              image: resultUrl,
              scale: 2, 
              file_name: "enhanced.png",
            },
            webhook: nextWebhookUrl,
            webhook_events_filter: ["completed"]
        });

        return NextResponse.json({ success: true, message: "Đã trigger Real-ESRGAN thành công" });
    }

    // --- NẾU ĐÃ XONG MỌI BƯỚC (Hoặc không rẽ nhánh Enhance) -> LƯU VÀO GOOGLE DRIVE ---
    console.log(`[Webhook] Tất cả AI xử lý hoàn tất. Tiến hành nạp kết quả cuối cùng vào Google Drive...`);
    
    const imageResponse = await fetch(resultUrl);
    if (!imageResponse.ok) {
      throw new Error(`Lỗi kéo ảnh kết quả từ Replicate URL: ${imageResponse.statusText}`);
    }
    const imageBuffer = await imageResponse.arrayBuffer();

    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    const finalName = `[Đã xử lý AI] ${Math.random().toString(36).substring(7)}_${originalFileName}`;

    const mediaStream = new Readable();
    mediaStream.push(Buffer.from(imageBuffer));
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

    console.log(`✅ [Webhook] Thêm ảnh thành công vào Google Drive. ID: ${driveRes.data.id}`);
    return NextResponse.json({ success: true, fileId: driveRes.data.id });

  } catch (error: any) {
    console.error("[Webhook Error]:", error.message || error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
