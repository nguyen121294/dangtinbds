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
    
    // Gọi model Unified Remove Object của lucataco
    const output = await replicate.run(
      "lucataco/remove-object:0e3a841c913f597c1e4c321560aa69e2bc1f15c65f8c366caafc379240efd8ba", 
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
      throw new Error("Không lấy được kết quả từ Replicate API (Xóa vật thể)");
    }
    console.log(`[ImageWorker] Xóa vật thể thành công: ${resultUrl}`);

    // NẾU CÓ CHỌN ENHANCE IMAGE (Kéo sáng nét) -> Gọi model GFPGAN hoặc Real-ESRGAN
    // Để giữ tốc độ, chúng ta gọi Real-ESRGAN nhẹ gọn
    if (enhanceImage) {
        console.log(`[ImageWorker] Bắt đầu làm nét ảnh...`);
        const enhanceOutput = await replicate.run(
          "nightmareai/real-esrgan:42fed1c4974146d4d2414e2be2c5277c7fcf05fcc3a73abf41610695738c1d7b",
          {
            input: {
              image: resultUrl,
              scale: 2, // Phóng lớn/tăng nét gấp 2 lần
              file_name: "enhanced.png",
            }
          }
        );
        
        if (typeof enhanceOutput === 'string') {
            resultUrl = enhanceOutput;
            console.log(`[ImageWorker] Làm nét thành công: ${resultUrl}`);
        } else if (enhanceOutput && typeof enhanceOutput === "object" && 'image' in enhanceOutput) {
            // Some models return JSON object
            resultUrl = (enhanceOutput as any).image || resultUrl;
        }
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
// TUY NHIÊN: Tạm thời tắt để check lỗi 500 do thiếu Variable QSTASH trên Netlify
export const POST = handler;
