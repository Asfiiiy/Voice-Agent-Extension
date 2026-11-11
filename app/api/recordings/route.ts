import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import fs from "fs";
import path from "path";

export async function POST(req: NextRequest) {
  try {
    const contentType = req.headers.get("content-type") || "";
    let callId: string = "";
    let fileBuffer: Buffer | null = null;
    let extension: string = "ogg";

    if (contentType.includes("multipart/form-data")) {
      const formData = await req.formData();
      callId = (formData.get("callId") as string) || "";
      const file = formData.get("file") as File | null;
      if (file) {
        const arrayBuffer = await file.arrayBuffer();
        fileBuffer = Buffer.from(arrayBuffer);
        const nameParts = file.name.split(".");
        if (nameParts.length > 1) {
          extension = nameParts.pop() || "ogg";
        }
      }
    } else {
      // JSON with Base64 audio payload
      const body = await req.json().catch(() => ({}));
      callId = body.callId || "";
      extension = body.format || "ogg";
      if (body.audioBase64) {
        fileBuffer = Buffer.from(body.audioBase64, "base64");
      }
    }

    if (!callId) {
      return NextResponse.json({ error: "callId is required" }, { status: 400 });
    }

    if (!fileBuffer || fileBuffer.length === 0) {
      return NextResponse.json({ error: "Audio data is required" }, { status: 400 });
    }

    const recordingsDir = path.join(process.cwd(), "public", "recordings");
    if (!fs.existsSync(recordingsDir)) {
      fs.mkdirSync(recordingsDir, { recursive: true });
    }

    const filename = `${callId}.${extension}`;
    const filePath = path.join(recordingsDir, filename);
    await fs.promises.writeFile(filePath, fileBuffer);

    const recordingUrl = `/recordings/${filename}`;

    // Update Call record in PostgreSQL database
    let callRecord = null;
    try {
      callRecord = await prisma.call.update({
        where: { id: callId },
        data: { recordingUrl },
      });
    } catch (dbErr) {
      console.warn(`[Recordings] Could not find call ${callId} to update directly:`, dbErr);
      // Fallback: try updating the latest call if callId was generated or alias
      const latestCall = await prisma.call.findFirst({
        orderBy: { createdAt: "desc" },
      });
      if (latestCall) {
        callRecord = await prisma.call.update({
          where: { id: latestCall.id },
          data: { recordingUrl },
        });
      }
    }

    return NextResponse.json(
      {
        success: true,
        callId: callRecord?.id || callId,
        recordingUrl,
        sizeBytes: fileBuffer.length,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("[Recordings API] Failed to save recording:", error);
    return NextResponse.json({ error: "Failed to save recording" }, { status: 500 });
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const callId = searchParams.get("callId");

    if (callId) {
      const call = await prisma.call.findUnique({
        where: { id: callId },
        select: { id: true, recordingUrl: true, durationSec: true, customerName: true, phoneNumber: true },
      });
      return NextResponse.json({ call });
    }

    const recordingsDir = path.join(process.cwd(), "public", "recordings");
    if (!fs.existsSync(recordingsDir)) {
      return NextResponse.json({ files: [] });
    }

    const files = await fs.promises.readdir(recordingsDir);
    return NextResponse.json({ files });
  } catch (error) {
    console.error("[Recordings API] Error fetching recordings:", error);
    return NextResponse.json({ error: "Failed to list recordings" }, { status: 500 });
  }
}
