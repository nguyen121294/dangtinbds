
import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';
import { google } from 'googleapis';
import Replicate from 'replicate';

async function handler(req: NextRequest) {
  try {
    const body = await req.json();
    const { type, area, price, location, condition, direction, purpose, highlights, style, headings, access_token, images, objectsToRemoveStr, enhanceImage, imageProcessingEngine, driveFolderId, signature } = body;

    // --- 1. VALIDATE OAUTH TOKEN ---
    if (!access_token) {
      console.error("Missing User Access Token");
      return NextResponse.json({ success: false, error: "Thiếu quyền truy cập vào Drive của người dùng" }, { status: 400 });
    }

    // --- 2. GENERATE AI CONTENT ---
    const systemPrompt = `Bạn là một chuyên gia môi giới bất động sản xuất sắc. Nhiệm vụ của bạn là viết một bài đăng facebook/zalo để chốt sale. Trình bày đẹp mắt, dùng emoji hiệu quả. TUYỆT ĐỐI KHÔNG sử dụng ký hiệu markdown như **, ##, ~~. Chỉ dùng text thuần và emoji.`;

    const selectedHeadings = headings && headings.length > 0 ? headings.map((h: string) => `[x] ${h}`).join('\n') : 'Cung cấp đầy đủ thông tin';

    const userPrompt = `ĐĂNG TIN BẤT ĐỘNG SẢN:
- Loại hình: ${type}
- Vị trí: ${location}
- Thông số: ${area}
- Hiện trạng/Kết cấu: ${condition}
- Hướng: ${direction}
- Mục đích: ${purpose}
- Giá bán: ${price}
- Đặc điểm nổi bật: ${highlights}

**YẾU TỐ BẮT BUỘC:** Rập khuôn theo phong cách "${style}" xuyên suốt bài.
Đầu mục cần nhấn mạnh:
${selectedHeadings}

${signature ? `LƯU Ý CUỐI BÀI: Phải đính kèm nguyên văn chữ ký sau vào vị trí cuối cùng của bài đăng. Không tự ý sửa đổi chữ ký:
${signature}` : ''}

Viết bài thật hấp dẫn, không vòng vo.`;

    let responseText = "";

    const replicate = new Replicate({ auth: process.env.REPLICATE_API_TOKEN });
    const fullPrompt = `${systemPrompt}\n\n---\n\n${userPrompt}`;

    try {
      const output = await replicate.run("openai/gpt-5-nano", {
        input: { prompt: fullPrompt, temperature: 0.7, max_tokens: 4096 }
      });
      responseText = Array.isArray(output) ? output.join('') : String(output);
    } catch (modelError: any) {
      console.warn("GPT-5 Nano failed. Falling back to GPT-4.1 Nano...");
      const fallback = await replicate.run("openai/gpt-4.1-nano", {
        input: { prompt: fullPrompt, temperature: 0.7, max_tokens: 4096 }
      });
      responseText = Array.isArray(fallback) ? fallback.join('') : String(fallback);
    }

    // --- 3. GOOGLE DRIVE/DOCS INTEGRATION ---
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });

    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    const docs = google.docs({ version: 'v1', auth: oAuth2Client });

    // 3.1. Tạo thư mục con (dd-mm-yyyy hh-mm-ss)
    const folderName = new Date().toLocaleString('vi-VN', { timeZone: 'Asia/Ho_Chi_Minh' }).replace(/[\/:]/g, '-');
    const folderMetadata: any = {
      name: `[${folderName}] ${type}`,
      mimeType: 'application/vnd.google-apps.folder',
    };
    if (driveFolderId) {
      folderMetadata.parents = [driveFolderId];
    }

    const folderRes = await drive.files.create({
      requestBody: folderMetadata,
      fields: 'id'
    });
    const subFolderId = folderRes.data?.id;

    if (!subFolderId) throw new Error("Không thể tạo thư mục con trên Drive");

    // 3.2. Tạo Google Doc (Tài liệu trắng)
    const documentName = `Bài đăng gốc - ${location}`;
    const fileMetadata = {
      name: documentName,
      mimeType: 'application/vnd.google-apps.document',
      parents: [subFolderId]
    };

    const fileRes = await drive.files.create({
      requestBody: fileMetadata,
      fields: 'id'
    });

    const documentId = fileRes.data?.id;
    if (!documentId) throw new Error("Không thể tạo file Google Docs");

    // 3.3. Đổ chữ vào file Docs vừa tạo
    await docs.documents.batchUpdate({
      documentId: documentId,
      requestBody: {
        requests: [
          {
            insertText: {
              location: { index: 1 },
              text: responseText
            }
          }
        ]
      }
    });

    // --- 4. KÍCH HOẠT QUÁ TRÌNH XỬ LÝ ẢNH (FAN-OUT QSTASH) ---
    if (images && Array.isArray(images) && images.length > 0) {
      console.log(`Bắt đầu xử lý và gom ${images.length} ảnh từ Temp Drive...`);

      // Tạo thư mục "Anh Goc"
      const anhGocMetadata = {
        name: 'Anh Goc',
        mimeType: 'application/vnd.google-apps.folder',
        parents: [subFolderId]
      };
      const anhGocRes = await drive.files.create({
        requestBody: anhGocMetadata,
        fields: 'id'
      });
      const anhGocFolderId = anhGocRes.data.id;

      let maskFolderId = undefined;
      if (imageProcessingEngine === 'vertex_ai' || imageProcessingEngine === 'vision_lama' || imageProcessingEngine === 'vision_flux') {
        const maskMetadata = {
          name: 'Anh Mask',
          mimeType: 'application/vnd.google-apps.folder',
          parents: [subFolderId]
        };
        const maskRes = await drive.files.create({
          requestBody: maskMetadata,
          fields: 'id'
        });
        maskFolderId = maskRes.data.id;
      }

      const qstashClient = new Client({ token: process.env.QSTASH_TOKEN || "" });
      const protocol = req.headers.get("x-forwarded-proto") || "http";
      const host = req.headers.get("host") || "localhost:3000";
      let workerImageUrl = `${protocol}://${host}/api/worker-image`;
      if (imageProcessingEngine === 'vertex_ai') {
        workerImageUrl = `${protocol}://${host}/api/worker-vertex-image`;
      } else if (imageProcessingEngine === 'vision_lama') {
        workerImageUrl = `${protocol}://${host}/api/worker-vision-lama`;
      } else if (imageProcessingEngine === 'vision_flux') {
        workerImageUrl = `${protocol}://${host}/api/worker-vision-flux`;
      } else if (imageProcessingEngine === 'replicate_banana') {
        workerImageUrl = `${protocol}://${host}/api/worker-replicate-banana`;
      } else if (imageProcessingEngine === 'openai_gpt') {
        workerImageUrl = `${protocol}://${host}/api/worker-openai-gpt`;
      }

      const publishPromises = images.map(async (fileId: string, index: number) => {
        try {
          // Lấy thư mục gốc hiện tại để chuẩn bị dời đi
          const file = await drive.files.get({ fileId: fileId, fields: 'parents' });
          const previousParents = file.data.parents?.join(',') || '';

          // Chia sẻ public View Link để Replicate AI có thể tải được ảnh về xử lý
          await drive.permissions.create({
            fileId: fileId,
            requestBody: { role: 'reader', type: 'anyone' }
          });

          // Tiến hành dời file từ Thư mục gốc / Temp Drive => "Anh Goc"
          const movedFile = await drive.files.update({
            fileId: fileId,
            addParents: anhGocFolderId!,
            removeParents: previousParents,
            fields: 'id, webContentLink, webViewLink'
          });

          // Sử dụng Google Drive Direct Download Link (uc?id=...)
          const imageUrl = `https://drive.google.com/uc?id=${fileId}&export=download`;

          // Bắn tín hiệu sang image-worker (kèm thời gian Delay giãn cách)
          // Thay vì dùng string `${index * 25}s` bị TypeScript bắt lỗi type, ta dùng số giây trực tiếp (number)
          const delayTime = index > 0 ? index * 25 : undefined;
          return qstashClient.publishJSON({
            url: workerImageUrl,
            body: {
              imageUrl,
              subFolderId,
              maskFolderId,
              access_token,
              objectsToRemove: objectsToRemoveStr,
              enhanceImage
            },
            delay: delayTime
          });
        } catch (e: any) {
          console.error(`Lỗi gom/di chuyển file ${fileId}:`, e.message);
        }
      });

      await Promise.allSettled(publishPromises);
      console.log(`🚀 Đã bắn ${images.length} message sang QStash (Image Worker). Đang chờ xử lý ngầm...`);
    }

    console.log("✅ Successfully generated and saved to Drive ID:", documentId);
    return NextResponse.json({ success: true, documentId });
  } catch (error: any) {
    console.error("Worker Error:", error.message || error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

export const POST = handler;
