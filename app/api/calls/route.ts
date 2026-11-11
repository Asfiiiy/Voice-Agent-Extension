import { NextResponse, NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveCall, setActiveCall, ActiveCall } from "@/lib/liveCallStore";

export interface CallMetrics {
  totalCalls: number;
  answeredCalls: number;
  missedCalls: number;
  avgWaitTime: string;
  avgDuration: string;
  activeCall?: ActiveCall;
}

// Helper to convert total seconds into MM:SS format
function formatSeconds(totalSeconds: number): string {
  if (!totalSeconds || isNaN(totalSeconds)) return "00:00";
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    if (searchParams.get("history") === "true") {
      const calls = await prisma.call.findMany({
        orderBy: { createdAt: "desc" },
        take: 50,
      });
      return NextResponse.json({ calls });
    }

    // 1. Count totals by status
    const totalCalls = await prisma.call.count();
    const answeredCalls = await prisma.call.count({
      where: { status: "ANSWERED" },
    });
    const missedCalls = await prisma.call.count({
      where: { status: "MISSED" },
    });

    // 2. Compute averages using Prisma aggregations
    const aggregations = await prisma.call.aggregate({
      _avg: {
        waitTimeSec: true,
        durationSec: true,
      },
    });

    const avgWaitSec = aggregations._avg.waitTimeSec || 0;
    const avgDurationSec = aggregations._avg.durationSec || 0;

    // 3. Assemble response matching CallMetrics interface
    const metrics: CallMetrics = {
      totalCalls,
      answeredCalls,
      missedCalls,
      avgWaitTime: formatSeconds(avgWaitSec),
      avgDuration: formatSeconds(avgDurationSec),
      activeCall: getActiveCall(),
    };

    return NextResponse.json(metrics);
  } catch (error) {
    console.error("Database query failed:", error);
    return NextResponse.json(
      { error: "Failed to fetch call metrics" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => ({}));
    const { id, phoneNumber, customerName, status, waitTimeSec, durationSec } = body ?? {};

    const call = await prisma.call.create({
      data: {
        ...(id ? { id } : {}),
        phoneNumber: phoneNumber || "MicroSIP (100)",
        customerName: customerName || "MicroSIP Caller",
        status: status || "ANSWERED",
        waitTimeSec: typeof waitTimeSec === "number" ? waitTimeSec : 2,
        durationSec: typeof durationSec === "number" ? durationSec : 0,
      },
    });

    const active = setActiveCall({
      callId: call.id,
      caller: customerName || "MicroSIP Caller",
      phoneNumber: phoneNumber || "MicroSIP (100)",
      status: "ANSWERED",
      startTime: Date.now(),
    });

    return NextResponse.json(
      {
        id: call.id,
        phoneNumber: call.phoneNumber,
        customerName: call.customerName,
        status: call.status,
        activeCall: active,
      },
      { status: 201 }
    );
  } catch (error) {
    console.error("Failed to create call in DB:", error);
    return NextResponse.json(
      { error: "Failed to create call" },
      { status: 500 }
    );
  }
}