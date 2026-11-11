import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const callbacks = await prisma.scheduledCallback.findMany({
      orderBy: { scheduledTime: "asc" },
      take: 50,
    });
    return NextResponse.json({ callbacks });
  } catch (error) {
    console.error("Failed to fetch callbacks:", error);
    return NextResponse.json(
      { error: "Failed to fetch callbacks" },
      { status: 500 }
    );
  }
}

function parseFlexibleDate(val?: string | null): Date | null {
  if (!val) return null;
  const lower = val.toLowerCase();
  const target = new Date();

  const weekdays = ["sunday", "monday", "tuesday", "wednesday", "thursday", "friday", "saturday"];
  if (lower.includes("day after tomorrow")) {
    target.setDate(target.getDate() + 2);
  } else if (lower.includes("tomorrow")) {
    target.setDate(target.getDate() + 1);
  } else {
    const matchedDayIdx = weekdays.findIndex((d) => lower.includes(d));
    if (matchedDayIdx !== -1) {
      const currentDayIdx = target.getDay();
      let daysAhead = (matchedDayIdx - currentDayIdx + 7) % 7;
      if (daysAhead === 0) daysAhead = 7;
      target.setDate(target.getDate() + daysAhead);
    } else {
      const direct = new Date(val);
      if (!isNaN(direct.getTime())) return direct;
    }
  }

  const timeMatch = lower.match(/(\d{1,2})(?::(\d{2}))?\s*(am|pm|a\.m\.|p\.m\.)?/);
  if (timeMatch) {
    let hour = parseInt(timeMatch[1], 10);
    const minute = timeMatch[2] ? parseInt(timeMatch[2], 10) : 0;
    const meridian = (timeMatch[3] || "").replace(/\./g, "");
    if (meridian === "pm" && hour < 12) hour += 12;
    if (meridian === "am" && hour === 12) hour = 0;
    target.setHours(hour, minute, 0, 0);
  } else {
    target.setHours(14, 0, 0, 0);
  }

  return isNaN(target.getTime()) ? new Date(Date.now() + 86400000) : target;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerName, phoneNumber, course, scheduledTime, agentAssigned, notes, humanNotes } = body;

    const parsedDate = parseFlexibleDate(scheduledTime) || new Date(Date.now() + 24 * 60 * 60 * 1000);
    const assigned = agentAssigned || "Sarah Jenkins (Ext 101)";
    const cleanPhone = (phoneNumber || "").trim();

    const callbackPromise = prisma.scheduledCallback.create({
      data: {
        customerName: customerName || "Prospective Student",
        phoneNumber: cleanPhone || "+44 7000 000000",
        course: course || "General Qualification",
        scheduledTime: parsedDate,
        agentAssigned: assigned,
        notes: notes || "Callback requested during automated outbound dialing session.",
      },
    });

    const leadPromise = cleanPhone
      ? prisma.lead.updateMany({
          where: { phoneNumber: cleanPhone },
          data: {
            status: "SCHEDULED_CALL",
            disposition: "CALLBACK_SCHEDULED",
            scheduledCallback: parsedDate,
            humanNotes:
              humanNotes ||
              `[AI Sonia Callback • ${scheduledTime || parsedDate.toISOString()} • Assigned: ${assigned}]: ${notes || "Admissions & fee consultation"}`,
            lastAttemptAt: new Date(),
          },
        })
      : Promise.resolve(null);

    const [callbackResult] = await Promise.allSettled([callbackPromise, leadPromise]);
    if (callbackResult.status === "rejected") {
      throw callbackResult.reason;
    }

    return NextResponse.json({ success: true, callback: callbackResult.value }, { status: 201 });
  } catch (error) {
    console.error("Failed to schedule callback:", error);
    return NextResponse.json(
      { error: "Failed to schedule callback" },
      { status: 500 }
    );
  }
}

