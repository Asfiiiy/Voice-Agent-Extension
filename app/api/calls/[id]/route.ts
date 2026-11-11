import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { clearActiveCall } from "@/lib/liveCallStore";

function parseFlexibleDate(val?: string | null): Date | null {
  if (!val) return null;
  const direct = new Date(val);
  if (!isNaN(direct.getTime())) return direct;

  const lower = val.toLowerCase();
  const target = new Date();

  if (lower.includes("tomorrow")) {
    target.setDate(target.getDate() + 1);
  } else if (lower.includes("day after tomorrow")) {
    target.setDate(target.getDate() + 2);
  }

  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm)?/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridian = timeMatch[3];
    if (meridian === "pm" && hour < 12) hour += 12;
    if (meridian === "am" && hour === 12) hour = 0;
    target.setHours(hour, minute, 0, 0);
  } else {
    target.setHours(17, 0, 0, 0);
  }

  return isNaN(target.getTime()) ? new Date(Date.now() + 86400000) : target;
}

export async function PATCH(
  req: NextRequest,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;

    if (!id) {
      clearActiveCall();
      return NextResponse.json({ error: "Call ID is required" }, { status: 400 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      status,
      durationSec,
      summary,
      transcript,
      disposition,
      courseInquired,
      leadScore,
      transferredTo,
      assignedToMember,
      transferSummary,
      transferStatus,
      humanDisposition,
      humanNotes,
      scheduledCallback,
      recordingUrl,
      notes,
    } = body ?? {};

    let callId = id;
    if (id === "current" || id === "last") {
      const latestCall = await prisma.call.findFirst({
        orderBy: { createdAt: "desc" },
      });
      if (latestCall) {
        callId = latestCall.id;
      } else {
        clearActiveCall();
        return NextResponse.json({ success: true, message: "Cleared active state" });
      }
    }

    const parsedCallbackDate = scheduledCallback ? parseFlexibleDate(scheduledCallback) : undefined;

    const updated = await prisma.call.update({
      where: { id: callId },
      data: {
        ...(status ? { status } : {}),
        ...(typeof durationSec === "number" ? { durationSec } : {}),
        ...(summary ? { summary } : {}),
        ...(transcript ? { transcript } : {}),
        ...(disposition ? { disposition } : {}),
        ...(courseInquired ? { courseInquired } : {}),
        ...(typeof leadScore === "number" ? { leadScore } : {}),
        ...(transferredTo ? { transferredTo } : {}),
        ...(assignedToMember ? { assignedToMember } : {}),
        ...(transferSummary ? { transferSummary } : {}),
        ...(transferStatus ? { transferStatus } : {}),
        ...(humanDisposition ? { humanDisposition } : {}),
        ...(humanNotes ? { humanNotes } : {}),
        ...(parsedCallbackDate ? { scheduledCallback: parsedCallbackDate } : {}),
        ...(recordingUrl ? { recordingUrl } : {}),
        ...(notes ? { notes } : {}),
      },
    });

    clearActiveCall();

    return NextResponse.json({ success: true, call: updated });
  } catch (error) {
    console.error("Failed to update call:", error);
    clearActiveCall();
    return NextResponse.json(
      { error: "Failed to update call record" },
      { status: 500 }
    );
  }
}
