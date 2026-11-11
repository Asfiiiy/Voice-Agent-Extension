import { NextResponse } from "next/server";
import { AccessToken, AgentDispatchClient } from "livekit-server-sdk";

export async function POST(request: Request) {
  try {
    const { room, identity } = await request.json();

    const apiKey = process.env.LIVEKIT_API_KEY;
    const apiSecret = process.env.LIVEKIT_API_SECRET;
    const livekitUrl = process.env.NEXT_PUBLIC_LIVEKIT_URL || process.env.LIVEKIT_URL;

    if (!apiKey || !apiSecret || !livekitUrl) {
      return NextResponse.json(
        { error: "LiveKit credentials are not configured." },
        { status: 500 }
      );
    }

    if (!room || !identity) {
      return NextResponse.json(
        { error: "Room and identity are required." },
        { status: 400 }
      );
    }

    const agentName = process.env.AGENT_NAME;
    if (!agentName) {
      console.error("[dispatch error] AGENT_NAME environment variable is missing.");
      return NextResponse.json(
        { error: "AGENT_NAME environment variable is not configured." },
        { status: 500 }
      );
    }

    // Automatically dispatch agent to room if not already dispatched
    try {
      const httpUrl = livekitUrl.replace(/^ws/, "http");
      const dispatchClient = new AgentDispatchClient(httpUrl, apiKey, apiSecret);
      await dispatchClient.createDispatch(room, agentName);
      console.log(`[dispatch] room=${room} agent_name=${agentName}`);
    } catch (err) {
      console.error(`[dispatch failed] room=${room} agent_name=${agentName}:`, err);
    }

    const token = new AccessToken(apiKey, apiSecret, {
      identity,
      ttl: 60 * 60,
    });

    token.addGrant({
      room,
      roomJoin: true,
      canPublish: true,
      canSubscribe: true,
      canPublishData: true,
    });

    return NextResponse.json({
      token: await token.toJwt(),
      url: livekitUrl,
    });
  } catch (error) {
    console.error("Failed to issue LiveKit token:", error);
    return NextResponse.json(
      {
        error: "Unable to generate a LiveKit access token.",
      },
      { status: 500 }
    );
  }
}
