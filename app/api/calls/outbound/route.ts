import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const disposition = searchParams.get("disposition");
    const search = searchParams.get("search");
    const member = searchParams.get("member");

    const whereClause: any = {
      direction: "OUTBOUND",
    };

    if (disposition && disposition !== "all") {
      whereClause.disposition = disposition.toUpperCase();
    }

    if (member && member !== "all") {
      whereClause.assignedToMember = member;
    }

    if (search) {
      whereClause.OR = [
        { customerName: { contains: search, mode: "insensitive" } },
        { phoneNumber: { contains: search, mode: "insensitive" } },
        { courseInquired: { contains: search, mode: "insensitive" } },
        { summary: { contains: search, mode: "insensitive" } },
        { assignedToMember: { contains: search, mode: "insensitive" } },
      ];
    }

    const calls = await prisma.call.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
      take: 100,
    });

    return NextResponse.json({ calls });
  } catch (error) {
    console.error("Failed to fetch outbound calls:", error);
    return NextResponse.json(
      { error: "Failed to fetch outbound calls" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      phoneNumber,
      customerName,
      courseInquired,
      disposition,
      summary,
      transcript,
      leadScore,
      durationSec,
      transferredTo,
      assignedToMember,
      transferSummary,
      humanDisposition,
      humanNotes,
      scheduledCallback,
      recordingUrl,
    } = body;

    const call = await prisma.call.create({
      data: {
        ...(id ? { id } : {}),
        phoneNumber: phoneNumber || "+44 7000 000000",
        customerName: customerName || "Prospective Student",
        status: "ANSWERED",
        direction: "OUTBOUND",
        courseInquired: courseInquired || "General Qualification Inquiry",
        disposition: disposition || "CALLBACK_SCHEDULED",
        summary: summary || "Outbound campaign call completed by Sonia AI.",
        transcript: transcript || "",
        leadScore: typeof leadScore === "number" ? leadScore : 70,
        durationSec: typeof durationSec === "number" ? durationSec : 60,
        transferredTo: transferredTo || null,
        assignedToMember: assignedToMember || null,
        transferSummary: transferSummary || null,
        humanDisposition: humanDisposition || null,
        humanNotes: humanNotes || null,
        scheduledCallback: scheduledCallback ? new Date(scheduledCallback) : null,
        recordingUrl: recordingUrl || null,
      },
    });

    return NextResponse.json({ success: true, call }, { status: 201 });
  } catch (error) {
    console.error("Failed to create outbound call:", error);
    return NextResponse.json(
      { error: "Failed to create outbound call record" },
      { status: 500 }
    );
  }
}
