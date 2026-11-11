import { NextResponse } from "next/server";
import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const room = searchParams.get("room") || "test-room-" + Date.now();
  const username = searchParams.get("username") || "user-" + Math.floor(Math.random() * 1000);
  const phone = searchParams.get("phone") || "+15550199";

  const apiKey = process.env.LIVEKIT_API_KEY || "devkey";
  const apiSecret = process.env.LIVEKIT_API_SECRET || "devsecret_32_characters_long_key_12345";
  const livekitUrl = process.env.LIVEKIT_URL || process.env.NEXT_PUBLIC_LIVEKIT_URL || "ws://localhost:7880";

  const agentName = process.env.AGENT_NAME;
  if (!agentName) {
    console.error("[dispatch error] AGENT_NAME environment variable is missing.");
    return NextResponse.json(
      { error: "AGENT_NAME environment variable is not configured." },
      { status: 500 }
    );
  }

  // Dispatch agent worker to the room automatically upon token generation
  try {
    const httpUrl = livekitUrl.replace(/^ws/, "http");
    const dispatchClient = new AgentDispatchClient(httpUrl, apiKey, apiSecret);
    await dispatchClient.createDispatch(room, agentName);
    console.log(`[dispatch] room=${room} agent_name=${agentName}`);
  } catch (err) {
    console.error(`[dispatch failed] room=${room} agent_name=${agentName}:`, err);
  }

  // 1. Generate LiveKit token
  const at = new AccessToken(apiKey, apiSecret, {
    identity: username,
  });

  at.addGrant({
    roomJoin: true,
    room: room,
    canPublish: true,
    canSubscribe: true,
  });

  // 2. Persist call record into PostgreSQL database matching your Prisma schema
  try {
    await prisma.call.create({
      data: {
        phoneNumber: phone,
        customerName: username,
        status: "ANSWERED", // Enum matching your Prisma schema
        waitTimeSec: 0,
        durationSec: 0,
      },
    });
  } catch (err) {
    console.error("Failed to persist call record into database:", err);
  }

  return NextResponse.json({ token: await at.toJwt(), room });
}