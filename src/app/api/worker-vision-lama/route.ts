import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import sharp from 'sharp';
import { Readable } from 'stream';
import Replicate from 'replicate';

export const maxDuration = 60; // 60s max on Pro for heavy processing

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, subFolderId, maskFolderId, access_token, objectsToRemove } = body;

    if (!imageUrl || !subFolderId || !access_token) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
    }
    
    // Mask folder is optional, but if provided we upload there. Otherwise fallback to subFolderId.
    const driveMaskFolderId = maskFolderId || subFolderId;

    console.log(`[Worker-VisionLama] Bắt đầu luồng xử lý xóa vật thể cho: ${imageUrl}`);

    // --- 1. Tải file gốc về Buffer (Sử dụng User OAuth Token) ---
    console.log(`[Worker-VisionLama] 1. Tải hình ảnh gốc từ Drive...`);
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

    // Dùng sharp lấy metadata
    const metadata = await sharp(originalBuffer).metadata();
    const width = metadata.width || 1024;
    const height = metadata.height || 1024;

    // --- 2. Google Cloud Vision API: Tìm Bounding Boxes ---
    console.log(`[Worker-VisionLama] 2. Object Localization qua Vision AI...`);
    const gcpAuth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'), 
        project_id: process.env.GCP_PROJECT_ID,
      },
      projectId: process.env.GCP_PROJECT_ID,
      scopes: ['https://www.googleapis.com/auth/cloud-platform']
    });
    
    const vision = google.vision({ version: 'v1', auth: gcpAuth });
    
    const annotateRes = await vision.images.annotate({
      requestBody: {
        requests: [
          {
            image: { content: originalBuffer.toString('base64') },
            features: [{ type: 'OBJECT_LOCALIZATION' }]
          }
        ]
      }
    });

    const localizedObjects = annotateRes.data.responses?.[0]?.localizedObjectAnnotations || [];
    
    const customPromptKeywords = (objectsToRemove || "car, motorbike, trash can, house number, person")
        .toLowerCase()
        .split(',')
        .map((s: string) => s.trim());

    // --- 3. Tạo Mask bằng Sharp ---
    console.log(`[Worker-VisionLama] 3. Xây dựng mask bằng Sharp...`);
    let svgPolygons = '';
    
    localizedObjects.forEach(obj => {
        const objName = (obj.name || "").toLowerCase();
        const isMatch = customPromptKeywords.some((keyword: string) => objName.includes(keyword) || keyword.includes(objName));
        const isDefaultMatch = ['car', 'vehicle', 'motorcycle', 'bicycle', 'license plate', 'person'].includes(objName);

        if (isMatch || isDefaultMatch) {
            const vertices = obj.boundingPoly?.normalizedVertices;
            if (vertices && vertices.length > 0) {
                const points = vertices.map(v => `${(v.x || 0) * width},${(v.y || 0) * height}`).join(' ');
                svgPolygons += `<polygon points="${points}" fill="#FFFFFF" />`;
            }
        }
    });

    if (!svgPolygons) {
       console.log(`[Worker-VisionLama] Không tìm thấy vật thể nào khớp. Tạo mask rỗng.`);
    }

    const maskSvg = `<svg width="${width}" height="${height}">
        <rect width="100%" height="100%" fill="#000000"/>
        ${svgPolygons}
    </svg>`;

    const maskBuffer = await sharp(Buffer.from(maskSvg)).png().toBuffer();
    
    // --- 4. Upload Mask lên Drive ---
    console.log(`[Worker-VisionLama] 4. Uploading Mask Buffer lên Drive để tra cứu...`);
    const maskUploadRes = await drive.files.create({
      requestBody: {
        name: `[VisionLama_Mask]_${fileId}.png`,
        parents: [driveMaskFolderId]
      },
      media: {
        mimeType: 'image/png',
        body: Readable.from(maskBuffer)
      },
      fields: 'id'
    });

    // --- 5. Châm ngòi Webhook gọi Replicate LAMA ---
    console.log(`[Worker-VisionLama] 5. Gửi request Webhook tới Replicate...`);
    const replicateToken = process.env.REPLICATE_API_TOKEN;
    if (!replicateToken) throw new Error("Thiếu cấu hình biến môi trường REPLICATE_API_TOKEN");

    const replicate = new Replicate({ auth: replicateToken });

    const protocol = req.headers.get("x-forwarded-proto") || "http";
    const host = req.headers.get("host") || "localhost:3000";
    
    const fileNameMatch = imageUrl.match(/\/([^\/?#]+)[^\/]*$/);
    const originalFileName = fileNameMatch ? fileNameMatch[1] : `image_${Math.random().toString(36).substring(7)}.jpg`;

    // Chuẩn bị URL Webhook để Replicate bắn trả kết quả
    const webhookUrl = `${protocol}://${host}/api/webhook-vision-lama?subFolderId=${subFolderId}&token=${encodeURIComponent(access_token)}&fileName=${encodeURIComponent(originalFileName)}`;

    // Sử dụng DATA URIs để truyền buff ảnh cho LAMA
    const base64Original = `data:image/jpeg;base64,${originalBuffer.toString('base64')}`;
    const base64Mask = `data:image/png;base64,${maskBuffer.toString('base64')}`;

    console.log("[Worker-VisionLama] Đang gọi create() với webhook:", webhookUrl);
    
    await replicate.predictions.create({
      // LƯU Ý CHO USER: Ở phiên bản Replicate mới (>=1.0.0), bạn được dùng `model: ...`. 
      // Nhưng nếu hệ thống ném HTTP 422 nhắc "version hash required", hãy xóa dòng model và dùng version hash của Lama model.
      model: "cjwbw/lama",
      input: {
        image: base64Original,
        mask: base64Mask,
      },
      webhook: webhookUrl,
      webhook_events_filter: ["completed"]
    });

    console.log(`[Worker-VisionLama] ✅ Châm ngòi xong tiến trình LAMA Webhook! Nhiệm vụ kết thúc.`);
    return NextResponse.json({ success: true, message: "Started processing with Replicate LaMa." });

  } catch (error: any) {
    console.error(`[Worker-VisionLama] Lỗi:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
