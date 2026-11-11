import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

// 1. AI initiates hand-off to least-busy available team member
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      callId,
      leadId,
      customerName,
      phoneNumber,
      courseInquired,
      leadScore,
      transferSummary,
      preferredMember,
    } = body;

    // Find available member: preferred or least-busy available member
    let assignedMember = null;
    if (preferredMember) {
      assignedMember = await prisma.teamMember.findFirst({
        where: { name: preferredMember, status: "AVAILABLE" },
      });
    }

    if (!assignedMember) {
      // Round-robin / Least busy available member
      assignedMember = await prisma.teamMember.findFirst({
        where: { status: "AVAILABLE" },
        orderBy: [{ callsHandled: "asc" }, { updatedAt: "asc" }],
      });
    }

    // If no member is strictly AVAILABLE, report that all advisors are busy or on break
    if (!assignedMember) {
      return NextResponse.json({
        success: false,
        transferred: false,
        allAdvisorsBusyOrAway: true,
        message: "All human admissions advisors are currently busy, on break, or offline. Schedule a callback instead.",
      });
    }

    const assignedName = assignedMember.name;
    const extension = assignedMember.extension || "101";

    // Mark member as ON_CALL while they handle this call
    await prisma.teamMember.update({
      where: { id: assignedMember.id },
      data: {
        status: "ON_CALL",
        activeCallId: callId || undefined,
        callsHandled: { increment: 1 },
      },
    });

    // Update Call record if callId provided
    if (callId) {
      await prisma.call.update({
        where: { id: callId },
        data: {
          transferredTo: `${assignedName} (Ext ${extension})`,
          assignedToMember: assignedName,
          transferSummary: transferSummary || `Warm transfer for ${customerName} interested in ${courseInquired}.`,
          transferStatus: "PENDING_ACCEPT",
          disposition: "TRANSFERRED",
        },
      }).catch((e) => console.log("Call transfer update note:", e));
    }

    // Update Lead record if leadId or phoneNumber provided
    if (leadId) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          assignedToMember: assignedName,
          status: "HOT",
          disposition: "TRANSFERRED",
        },
      }).catch((e) => console.log("Lead transfer update note:", e));
    } else if (phoneNumber) {
      await prisma.lead.updateMany({
        where: { phoneNumber },
        data: {
          assignedToMember: assignedName,
          status: "HOT",
          disposition: "TRANSFERRED",
        },
      }).catch((e) => console.log("Lead transfer phone note:", e));
    }

    return NextResponse.json({
      success: true,
      transferred: true,
      assignedMember: {
        name: assignedName,
        extension,
        role: assignedMember?.role || "Admissions Specialist",
      },
      message: `Call transferred to ${assignedName} (Ext ${extension})`,
    });
  } catch (error: any) {
    console.error("Call transfer failed:", error);
    return NextResponse.json(
      { error: "Failed to process call transfer" },
      { status: 500 }
    );
  }
}

// 2. Human advisor submits Post-Call Wrap-up & comments
export async function PATCH(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      callId,
      leadId,
      memberName,
      humanDisposition, // "ENROLLED", "PAYMENT_PENDING", "FOLLOW_UP_SCHEDULED", "LOST"
      humanNotes,
      scheduledCallback,
    } = body;

    // Free the team member back to AVAILABLE
    if (memberName) {
      const isConversion = humanDisposition === "ENROLLED";
      await prisma.teamMember.updateMany({
        where: { name: memberName },
        data: {
          status: "AVAILABLE",
          activeCallId: null,
          ...(isConversion ? { conversions: { increment: 1 } } : {}),
        },
      }).catch((e) => console.log("Team member release note:", e));
    }

    // Update Call record
    if (callId) {
      await prisma.call.update({
        where: { id: callId },
        data: {
          humanDisposition: humanDisposition || undefined,
          humanNotes: humanNotes || undefined,
          transferStatus: "COMPLETED",
          scheduledCallback: scheduledCallback ? new Date(scheduledCallback) : undefined,
        },
      }).catch((e) => console.log("Call wrap-up update note:", e));
    }

    // Update Lead record
    if (leadId) {
      await prisma.lead.update({
        where: { id: leadId },
        data: {
          humanDisposition: humanDisposition || undefined,
          humanNotes: humanNotes || undefined,
          status: humanDisposition === "ENROLLED" ? "ENROLLED" : "WARM",
          scheduledCallback: scheduledCallback ? new Date(scheduledCallback) : undefined,
        },
      }).catch((e) => console.log("Lead wrap-up update note:", e));
    }

    // If scheduledCallback date provided, create ScheduledCallback record
    if (scheduledCallback) {
      let callInfo = null;
      if (callId) {
        callInfo = await prisma.call.findUnique({ where: { id: callId } });
      }
      await prisma.scheduledCallback.create({
        data: {
          customerName: callInfo?.customerName || "Student",
          phoneNumber: callInfo?.phoneNumber || "+44 7000 000000",
          course: callInfo?.courseInquired || "Inspire London College Qualification",
          scheduledTime: new Date(scheduledCallback),
          agentAssigned: memberName || "Admissions Team",
          status: "UPCOMING",
          notes: humanNotes || "Scheduled by admissions advisor",
        },
      }).catch((e) => console.log("Scheduled callback create note:", e));
    }

    return NextResponse.json({
      success: true,
      message: "Post-call wrap-up saved successfully",
    });
  } catch (error: any) {
    console.error("Failed to save post-call wrap-up:", error);
    return NextResponse.json(
      { error: "Failed to save post-call wrap-up" },
      { status: 500 }
    );
  }
}
