import { NextRequest, NextResponse } from 'next/server';
import { Client } from '@upstash/qstash';

// Initialize QStash client
// Note: It's safe to initialize even if process.env.QSTASH_TOKEN is undefined yet (it will fail on publish).
const qstashClient = new Client({
  token: process.env.QSTASH_TOKEN || 'MISSING_TOKEN',
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { driveFolderUrl } = body;

    // Validate Input
    if (!driveFolderUrl || !driveFolderUrl.includes('drive.google.com/')) {
      return NextResponse.json({ success: false, error: "Link thư mục Google Drive không hợp lệ!" }, { status: 400 });
    }

    if (process.env.QSTASH_TOKEN === 'MISSING_TOKEN' || !process.env.QSTASH_TOKEN) {
      return NextResponse.json({ success: false, error: "Thiếu biến môi trường QSTASH_TOKEN trên Server!" }, { status: 500 });
    }

    // Determine the host dynamically so QStash knows where to call back
    // This requires the site to be deployed to a public URL (e.g. Vercel/Netlify) or tunneled via ngrok
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host');
    const protocol = req.headers.get('x-forwarded-proto') || 'https';
    
    // Fallback or explicit site URL for Webhook
    const baseUrl = process.env.NEXT_PUBLIC_SITE_URL || `${protocol}://${host}`;
    const workerUrl = `${baseUrl}/api/worker`;

    // Send payload to Upstash Queue
    const res = await qstashClient.publishJSON({
      url: workerUrl,
      body: body, // Forward all form fields to the background worker
      retries: 3, // Automatically retry 3 times if something fails (e.g. Gemini 503 error)
    });

    return NextResponse.json({ success: true, messageId: res.messageId, workerUrl });
  } catch (error: any) {
    console.error("QStash Publish Error:", error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
