import { NextResponse } from "next/server";
import { addTranscriptEntry, getTranscriptEntries } from "@/lib/transcriptStore";

export async function GET() {
  return NextResponse.json({ entries: getTranscriptEntries() });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const { role, text } = body ?? {};

    if (!text || typeof text !== "string") {
      return NextResponse.json({ error: "Transcript text is required." }, { status: 400 });
    }

    const normalizedRole =
      role === "user"
        ? "user"
        : role === "agent" || role === "assistant"
        ? "agent"
        : "system";

    const entry = addTranscriptEntry({
      role: normalizedRole,
      text,
    });

    return NextResponse.json({ entry }, { status: 201 });
  } catch (error) {
    console.error("Transcript insert failed:", error);
    return NextResponse.json({ error: "Failed to save transcript." }, { status: 500 });
  }
}
