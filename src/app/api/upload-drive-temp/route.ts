import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { Readable } from 'stream';

// Do Next.js API route mặc định limit body size (khoảng 4MB)
// Chúng ta cấu hình limit này lớn hơn xíu để nhận vài tấm hình base64 (chúng đã được nén từ Client)
export const maxDuration = 60; // Dành cho Pro (Hobby thì tối đa 10s-60s tuỳ runtime)

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { access_token, images } = body;

    if (!access_token) {
      return NextResponse.json({ success: false, error: "Thiếu quyền truy cập vào Drive của người dùng" }, { status: 400 });
    }

    if (!images || !Array.isArray(images) || images.length === 0) {
      return NextResponse.json({ success: false, error: "Không có hình ảnh để upload" }, { status: 400 });
    }

    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });

    const driveFileIds: string[] = [];

    // Lặp qua để tải từng ảnh lên root Google Drive
    for (let i = 0; i < images.length; i++) {
        const base64Data = images[i];
        
        // base64Data expected format: "data:image/jpeg;base64,/9j/4AAQSkZJRgABAQEASABIAAD..."
        const matches = base64Data.match(/^data:([A-Za-z-+\/]+);base64,(.+)$/);
        
        if (!matches || matches.length !== 3) {
           console.warn(`Ảnh thứ ${i} không đúng format Base64, bỏ qua.`);
           continue; 
        }
        
        const mimeType = matches[1];
        const buffer = Buffer.from(matches[2], 'base64');
        
        // Convert buffer to stream (Google APIs v3 requires stream for body media)
        const stream = new Readable();
        stream.push(buffer);
        stream.push(null);
        
        const fileMetadata = {
            name: `Temp_BDS_Image_${Date.now()}_${i}.jpg`,
        };
        const media = {
            mimeType: mimeType,
            body: stream
        };

        const fileRes = await drive.files.create({
            requestBody: fileMetadata,
            media: media,
            fields: 'id'
        });
        
        if (fileRes.data.id) {
            driveFileIds.push(fileRes.data.id);
        }
    }

    return NextResponse.json({ success: true, driveFileIds });
  } catch (error: any) {
    console.error("Upload Drive Temp API Error:", error.message || error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
