import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const leadId = searchParams.get("leadId");
    const phoneNumber = searchParams.get("phoneNumber");

    if (!leadId && !phoneNumber) {
      return NextResponse.json({ notes: [] });
    }

    const where: any = {};
    if (leadId) where.leadId = leadId;
    if (phoneNumber) where.phoneNumber = phoneNumber;

    const notes = await prisma.leadNote.findMany({
      where,
      orderBy: { createdAt: "asc" },
    });

    return NextResponse.json({ success: true, notes });
  } catch (error: any) {
    console.error("Failed to fetch lead notes:", error);
    return NextResponse.json(
      { error: "Failed to fetch lead notes" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      leadId,
      callId,
      phoneNumber,
      customerName,
      attemptNumber,
      advisorName,
      disposition,
      commentText,
      callbackTime,
    } = body;

    if (!commentText || !phoneNumber) {
      return NextResponse.json(
        { error: "Missing required commentText or phoneNumber" },
        { status: 400 }
      );
    }

    // Determine current attempt number if not explicitly sent
    let currentAttempt = attemptNumber;
    if (!currentAttempt) {
      const priorCount = await prisma.leadNote.count({
        where: { phoneNumber },
      });
      currentAttempt = priorCount + 1;
    }

    // 1. Create chronological LeadNote entry
    const newNote = await prisma.leadNote.create({
      data: {
        leadId: leadId || null,
        callId: callId || null,
        phoneNumber,
        customerName: customerName || "Student",
        attemptNumber: currentAttempt,
        advisorName: advisorName || "Admissions Advisor",
        disposition: disposition || "CALLBACK_SCHEDULED",
        commentText: commentText.trim(),
        callbackTime: callbackTime ? new Date(callbackTime) : null,
      },
    });

    // 2. Fetch all notes for this phone number to create a formatted combined Google Sheet audit log
    const allNotes = await prisma.leadNote.findMany({
      where: { phoneNumber },
      orderBy: { createdAt: "asc" },
    });

    const formattedLog = allNotes
      .map(
        (n) =>
          `[Call #${n.attemptNumber} • ${new Date(n.createdAt).toLocaleDateString([], {
            month: "short",
            day: "numeric",
          })} ${new Date(n.createdAt).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          })} • ${n.advisorName}]: ${n.commentText}`
      )
      .join(" | ");

    // 3. Update Lead record with latest attempt count, latest disposition, and full combined audit log
    if (leadId) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          attemptsCount: currentAttempt,
          lastAttemptAt: new Date(),
          humanDisposition: disposition,
          humanNotes: formattedLog,
          status: disposition === "ENROLLED" ? "ENROLLED" : "WARM",
        },
      }).catch((e) => console.log("Lead note update note:", e));
    } else {
      await prisma.lead.updateMany({
        where: { phoneNumber },
        data: {
          attemptsCount: currentAttempt,
          lastAttemptAt: new Date(),
          humanDisposition: disposition,
          humanNotes: formattedLog,
          status: disposition === "ENROLLED" ? "ENROLLED" : "WARM",
        },
      }).catch((e) => console.log("Lead phone update note:", e));
    }

    // 4. Update Call record if callId provided
    if (callId) {
      await prisma.call.update({
        where: { id: callId },
        data: {
          humanDisposition: disposition,
          humanNotes: formattedLog,
        },
      }).catch((e) => console.log("Call update note:", e));
    }

    // 5. If callback scheduled, add to ScheduledCallback table
    if (callbackTime) {
      await prisma.scheduledCallback.create({
        data: {
          customerName: customerName || "Student",
          phoneNumber,
          scheduledTime: new Date(callbackTime),
          agentAssigned: advisorName || "Admissions Team",
          status: "UPCOMING",
          notes: `Call #${currentAttempt}: ${commentText}`,
        },
      }).catch((e) => console.log("Scheduled callback note:", e));
    }

    return NextResponse.json({
      success: true,
      note: newNote,
      allNotes,
      formattedLog,
      message: `Call #${currentAttempt} comments logged successfully`,
    });
  } catch (error: any) {
    console.error("Failed to create lead note:", error);
    return NextResponse.json(
      { error: "Failed to create lead note" },
      { status: 500 }
    );
  }
}
