import { NextRequest } from "next/server";
import { getTranscriptEntries, subscribeToTranscript, TranscriptEntry } from "@/lib/transcriptStore";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const encoder = new TextEncoder();

  const stream = new ReadableStream({
    start(controller) {
      const sendSnapshot = () => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "snapshot", entries: getTranscriptEntries() })}\n\n`));
      };

      sendSnapshot();

      const unsubscribe = subscribeToTranscript((entry: TranscriptEntry) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: "entry", entry })}\n\n`));
      });

      req.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
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
