import { NextRequest, NextResponse } from 'next/server';
import { google } from 'googleapis';
import { db } from '@/db';
import { usageLogs, propertyRecords } from '@/db/schema';
import { eq } from 'drizzle-orm';
import { deductWorkspaceCredit } from '@/lib/workspace-utils';
import { parsePropertyFromShortPost } from '@/lib/parse-property';
import { randomUUID } from 'crypto';

/**
 * Webhook V2 Text — Called by Replicate when text generation is complete.
 * 
 * Responsibilities:
 * 1. Extract generated text from Replicate prediction output
 * 2. Create Google Doc with the content
 * 3. Deduct credits (only on success)
 * 4. Update usage_logs with final status
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // Parse Replicate webhook payload
    const prediction = await req.json();
    const { searchParams } = new URL(req.url);

    const subFolderId = searchParams.get('subFolderId');
    const access_token = searchParams.get('token');
    const jobId = searchParams.get('jobId');
    const workspaceId = searchParams.get('workspaceId');
    const userId = searchParams.get('userId');
    const requiredCredits = parseInt(searchParams.get('requiredCredits') || '0', 10);
    const folderName = searchParams.get('folderName') || 'Unknown';
    const signature = searchParams.get('signature') || '';

    if (!subFolderId || !access_token) {
      console.error("[Webhook-V2-Text] Missing subFolderId or access_token");
      return NextResponse.json({ error: "Missing parameters" }, { status: 400 });
    }

    // ─── IDEMPOTENCY CHECK ───
    if (jobId) {
      const existing = await db.select({ status: usageLogs.status })
        .from(usageLogs).where(eq(usageLogs.jobId, jobId)).limit(1);
      if (existing[0]?.status === 'success') {
        console.log(`[Webhook-V2-Text] ⚡ Job ${jobId} already completed. Skipping.`);
        return NextResponse.json({ success: true, message: 'Already processed' });
      }
    }

    // ─── EXTRACT TEXT FROM REPLICATE OUTPUT ───
    let generatedText = '';
    const modelUsed = prediction.model || 'unknown';

    if (prediction.status === 'succeeded' && prediction.output) {
      // Replicate output for text models can be a string or array of strings
      if (typeof prediction.output === 'string') {
        generatedText = prediction.output;
      } else if (Array.isArray(prediction.output)) {
        generatedText = prediction.output.join('');
      } else {
        generatedText = JSON.stringify(prediction.output);
      }
      console.log(`[Webhook-V2-Text] ✅ Received ${generatedText.length} chars from ${modelUsed}`);
    } else {
      // Prediction failed
      const errorMsg = prediction.error || prediction.logs || 'Unknown Replicate error';
      console.error(`[Webhook-V2-Text] ❌ Prediction failed:`, errorMsg);

      if (jobId) {
        await db.update(usageLogs).set({
          status: 'failed',
          modelUsed,
          errorMessage: String(errorMsg).substring(0, 500),
          durationMs: Date.now() - startTime,
          completedAt: new Date(),
        }).where(eq(usageLogs.jobId, jobId));
      }

      // NO credit deduction on failure
      return NextResponse.json({ success: false, error: 'Text generation failed' });
    }

    // ─── CREATE GOOGLE DOC ───
    const oAuth2Client = new google.auth.OAuth2();
    oAuth2Client.setCredentials({ access_token });
    const drive = google.drive({ version: 'v3', auth: oAuth2Client });
    const docs = google.docs({ version: 'v1', auth: oAuth2Client });

    const documentName = `Bài đăng AI V2 - ${folderName}`;
    const fileRes = await drive.files.create({
      requestBody: {
        name: documentName,
        mimeType: 'application/vnd.google-apps.document',
        parents: [subFolderId]
      },
      fields: 'id'
    });

    const documentId = fileRes.data?.id;
    if (!documentId) throw new Error("Không thể tạo file Google Docs");

    await docs.documents.batchUpdate({
      documentId,
      requestBody: {
        requests: [{ insertText: { location: { index: 1 }, text: generatedText } }]
      }
    });

    console.log(`[Webhook-V2-Text] 📄 Created Doc: ${documentId}`);

    // ─── RENAME GOOGLE DRIVE FOLDER WITH EXTRACTED INFO ───
    try {
      const loaiBDSMatch = generatedText.match(/🏠 Loại BĐS:\s*(.+)/);
      const viTriMatch = generatedText.match(/📍 Vị trí:\s*(.+)/);
      const giaBanMatch = generatedText.match(/💰 Giá bán:\s*(.+)/);

      const loaiBDS = loaiBDSMatch ? loaiBDSMatch[1].trim() : '';
      const viTri = viTriMatch ? viTriMatch[1].trim() : '';
      const giaBan = giaBanMatch ? giaBanMatch[1].trim() : '';

      const aString = [loaiBDS, viTri, giaBan].filter(Boolean).join(' - ');
      
      if (aString) {
        await drive.files.update({
          fileId: subFolderId,
          requestBody: {
            name: `[V2] [${folderName}] [${aString}]`
          }
        });
        console.log(`[Webhook-V2-Text] 📁 Renamed folder to include property info: ${aString}`);
      }
    } catch (renameErr: any) {
      console.warn(`[Webhook-V2-Text] ⚠️ Could not rename folder:`, renameErr.message);
    }

    // ─── SAVE PROPERTY RECORD ───
    if (workspaceId && userId) {
      try {
        const parsed = parsePropertyFromShortPost(generatedText);
        await db.insert(propertyRecords).values({
          id: randomUUID(),
          workspaceId,
          userId,
          sourceTool: 'v2',
          jobId: jobId || null,
          ...parsed,
        });
        console.log(`[Webhook-V2-Text] 📋 Saved property record for job ${jobId}`);
      } catch (saveErr: any) {
        console.warn(`[Webhook-V2-Text] ⚠️ Could not save property record:`, saveErr.message);
      }
    }

    // ─── DEDUCT CREDITS (only on success!) ───
    let creditStatus = 'success';
    let creditError: string | null = null;

    if (workspaceId && userId && requiredCredits > 0) {
      const deductRes = await deductWorkspaceCredit(workspaceId, userId, requiredCredits);
      if (!deductRes.success) {
        creditError = deductRes.error || 'Credit deduction failed';
        creditStatus = 'partial'; // Text gen OK but credit deduction failed
        console.error(`[Webhook-V2-Text] ⚠️ Credit deduction failed:`, creditError);
      } else {
        console.log(`[Webhook-V2-Text] 💰 Deducted ${requiredCredits} credits.`);
      }
    }

    // ─── UPDATE USAGE LOG ───
    if (jobId) {
      await db.update(usageLogs).set({
        status: creditStatus,
        creditsCharged: creditStatus === 'success' ? requiredCredits : 0,
        modelUsed,
        durationMs: Date.now() - startTime,
        completedAt: new Date(),
        errorMessage: creditError,
      }).where(eq(usageLogs.jobId, jobId));
    }

    console.log(`[Webhook-V2-Text] ✅ Complete. Status: ${creditStatus}, Doc: ${documentId}`);
    return NextResponse.json({ success: true, documentId });

  } catch (error: any) {
    console.error("[Webhook-V2-Text] ❌ Fatal error:", error.message || error);

    // Try to update log with failure
    const jobId = new URL(req.url).searchParams.get('jobId');
    if (jobId) {
      try {
        await db.update(usageLogs).set({
          status: 'failed',
          errorMessage: error.message,
          durationMs: Date.now() - startTime,
          completedAt: new Date(),
        }).where(eq(usageLogs.jobId, jobId));
      } catch {} // Best effort
    }

    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}
