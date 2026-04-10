import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import sharp from 'sharp';

export const maxDuration = 60; // 60s max on Pro for heavy processing

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { imageUrl, subFolderId, maskFolderId, access_token, objectsToRemove } = body;

    if (!imageUrl || !subFolderId || !maskFolderId || !access_token) {
      return NextResponse.json({ success: false, error: "Missing required parameters" }, { status: 400 });
    }

    console.log(`[VertexWorker] Bắt đầu xử lý xóa vật thể cho ảnh: ${imageUrl}`);

    // --- 1. Tải file gốc về Buffer (Sử dụng User OAuth Token) ---
    console.log(`[VertexWorker] 1. Downloading original image from Drive...`);
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });
    
    // Extract fileId from imageUrl "https://drive.google.com/uc?id={fileId}&export=download"
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

    // --- 2. Google Cloud Vision API: Tìm Bounding Boxes (Cần GCP Môi Trường) ---
    console.log(`[VertexWorker] 2. Object Localization via Vision API...`);
    // Hệ thống backend Auth: Dùng ENV vars tối giản hóa thay vì cả file JSON để tránh lỗi 4KB limit
    const gcpAuth = new google.auth.GoogleAuth({
      credentials: {
        client_email: process.env.GCP_CLIENT_EMAIL,
        private_key: process.env.GCP_PRIVATE_KEY?.replace(/\\n/g, '\n'), // Fix format xuống dòng nếu copy bị lỗi
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
    
    // Convert danh sách từ khóa user yêu cầu thành mảng lowercase
    const customPromptKeywords = (objectsToRemove || "car, motorbike, trash can, house number")
        .toLowerCase()
        .split(',')
        .map((s: string) => s.trim());

    // --- 3. Tạo Mask bằng Sharp ---
    console.log(`[VertexWorker] 3. Building mask using Sharp...`);
    let svgPolygons = '';
    
    // Lặp qua các vật thể và chuyển thành đa giác trắng
    localizedObjects.forEach(obj => {
        const objName = (obj.name || "").toLowerCase();
        // Kiểm tra xem object có nằm trong list cần xóa (làm match lỏng)
        const isMatch = customPromptKeywords.some((keyword: string) => objName.includes(keyword) || keyword.includes(objName));
        
        // Hoặc xóa mọi thứ theo list mặc định như Vehicle, Car, Motorcycle...
        const isDefaultMatch = ['car', 'vehicle', 'motorcycle', 'bicycle', 'license plate'].includes(objName);

        if (isMatch || isDefaultMatch) {
            const vertices = obj.boundingPoly?.normalizedVertices;
            if (vertices && vertices.length > 0) {
                // Đổi tọa độ Normalize (0-1) thành Thực tế (Pixel)
                const points = vertices.map(v => `${(v.x || 0) * width},${(v.y || 0) * height}`).join(' ');
                svgPolygons += `<polygon points="${points}" fill="#FFFFFF" />`;
            }
        }
    });

    if (!svgPolygons) {
       console.log(`[VertexWorker] Không tìm thấy vật thể nào khớp để xóa. Tạo mask trống.`);
       // Vẫn tạo svg rỗng
    }

    const maskSvg = `<svg width="${width}" height="${height}">
        <rect width="100%" height="100%" fill="#000000"/>
        ${svgPolygons}
    </svg>`;

    const maskBuffer = await sharp(Buffer.from(maskSvg)).png().toBuffer();
    const maskBase64 = maskBuffer.toString('base64');
    const originalBase64 = originalBuffer.toString('base64');

    // --- 4. Upload Mask lên Drive ---
    console.log(`[VertexWorker] 4. Uploading Mask buffer to Drive...`);
    const boundary = "-------314159265358979323846";
    const delimiter = `\r\n--${boundary}\r\n`;
    const closeDelimiter = `\r\n--${boundary}--`;
    
    const maskFileMetadata = {
      name: `mask_${fileId}.png`,
      mimeType: 'image/png',
      parents: [maskFolderId]
    };
    
    const maskMultipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(maskFileMetadata) +
        delimiter +
        'Content-Type: image/png\r\n' +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        maskBase64 +
        closeDelimiter;

    await drive.files.create({
      requestBody: maskMultipartRequestBody as any,
      media: {
        mimeType: 'multipart/related; boundary=' + boundary,
        body: maskMultipartRequestBody
      },
      fields: 'id'
    });

    // --- 5. Gọi Vertex AI Imagen API ---
    // API endpoint cho inpainting
    console.log(`[VertexWorker] 5. Calling Vertex AI for Inpainting...`);
    
    const projectId = await gcpAuth.getProjectId();
    const region = process.env.GCP_REGION || "us-central1"; 
    const vertexEndpoint = `https://${region}-aiplatform.googleapis.com/v1/projects/${projectId}/locations/${region}/publishers/google/models/imagegeneration@006:predict`;
    const vertexToken = await gcpAuth.getAccessToken();

    const vertexPayload = {
      instances: [
        {
          prompt: "blend the background to seamlessly integrate the removed objects with the environment",
          image: { bytesBase64Encoded: originalBase64 },
          mask: { image: { bytesBase64Encoded: maskBase64 } }
        }
      ],
      parameters: {
        sampleCount: 1,
      }
    };

    const vertexRes = await fetch(vertexEndpoint, {
        method: "POST",
        headers: {
            "Authorization": `Bearer ${vertexToken}`,
            "Content-Type": "application/json"
        },
        body: JSON.stringify(vertexPayload)
    });

    const vertexData = await vertexRes.json();
    
    if (!vertexRes.ok) {
       console.error("Vertex AI Error Data:", vertexData);
       throw new Error(`Vertex AI Call Failed: ${vertexData.error?.message || "Unknown Error"}`);
    }

    const enhancedBase64 = vertexData.predictions?.[0]?.bytesBase64Encoded;
    if (!enhancedBase64) {
       throw new Error("Không nhận được ảnh kết quả từ Vertex AI");
    }

    // --- 6. Upload ảnh hoàn thiện lên Drive ---
    console.log(`[VertexWorker] 6. Uploading final edited image to Drive...`);
    
    const finalFileMetadata = {
      name: `[AI-Vertex] _Edited.jpg`,
      mimeType: 'image/jpeg',
      parents: [subFolderId]
    };
    
    const finalMultipartRequestBody =
        delimiter +
        'Content-Type: application/json\r\n\r\n' +
        JSON.stringify(finalFileMetadata) +
        delimiter +
        'Content-Type: image/jpeg\r\n' +
        'Content-Transfer-Encoding: base64\r\n\r\n' +
        enhancedBase64 +
        closeDelimiter;

    await drive.files.create({
      requestBody: finalMultipartRequestBody as any,
      media: {
        mimeType: 'multipart/related; boundary=' + boundary,
        body: finalMultipartRequestBody
      },
      fields: 'id'
    });

    console.log(`[VertexWorker] ✅ Quy trình hoàn tất! Ảnh đã lưu thành công.`);
    return NextResponse.json({ success: true, message: "Vertex Process Completed" });

  } catch (error: any) {
    console.error(`[VertexWorker] Lỗi:`, error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
