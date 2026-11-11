import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { getActiveCall, subscribeToLiveCalls, LiveCallUpdate } from "@/lib/liveCallStore";

export const dynamic = "force-dynamic";

function formatSeconds(totalSeconds: number): string {
  if (!totalSeconds || isNaN(totalSeconds)) return "00:00";
  const mins = Math.floor(totalSeconds / 60);
  const secs = Math.floor(totalSeconds % 60);
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}

async function fetchDbMetrics() {
  try {
    const totalCalls = await prisma.call.count();
    const answeredCalls = await prisma.call.count({
      where: { status: "ANSWERED" },
    });
    const missedCalls = await prisma.call.count({
      where: { status: "MISSED" },
    });

    const aggregations = await prisma.call.aggregate({
      _avg: {
        waitTimeSec: true,
        durationSec: true,
      },
    });

    const avgWaitSec = aggregations._avg.waitTimeSec || 0;
    const avgDurationSec = aggregations._avg.durationSec || 0;

    return {
      totalCalls,
      answeredCalls,
      missedCalls,
      avgWaitTime: formatSeconds(avgWaitSec),
      avgDuration: formatSeconds(avgDurationSec),
    };
  } catch (err) {
    console.error("Error fetching db metrics for SSE:", err);
    return null;
  }
}

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    async start(controller) {
      let isClosed = false;

      const sendEvent = (data: Record<string, unknown>) => {
        if (isClosed) return;
        try {
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
        } catch {
          // stream already closed
        }
      };

      // 1. Initial connection event & immediate current state
      sendEvent({ type: "CONNECTED", timestamp: new Date().toISOString() });
      const initialMetrics = await fetchDbMetrics();
      if (initialMetrics) {
        sendEvent({
          ...initialMetrics,
          activeCall: getActiveCall(),
        });
      }

      // 2. Real-time active call listener (instant trigger on call start/end)
      const unsubscribeLiveStore = subscribeToLiveCalls(async (update: LiveCallUpdate) => {
        const metrics = await fetchDbMetrics();
        sendEvent({
          ...(metrics || {}),
          activeCall: update.activeCall,
        });
      });

      // 3. Periodic refresh every 5 seconds to keep metrics in sync
      const interval = setInterval(async () => {
        const metrics = await fetchDbMetrics();
        if (metrics) {
          sendEvent({
            ...metrics,
            activeCall: getActiveCall(),
          });
        }
      }, 5000);

      // Clean up connection when client disconnects
      req.signal.addEventListener("abort", () => {
        isClosed = true;
        unsubscribeLiveStore();
        clearInterval(interval);
        try {
          controller.close();
        } catch {
          // ignore
        }
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}