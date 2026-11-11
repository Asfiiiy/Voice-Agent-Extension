import { NextRequest, NextResponse } from "next/server";

const QDRANT_HOST = process.env.QDRANT_HOST || "localhost";
const QDRANT_PORT = process.env.QDRANT_PORT || "6333";
const QDRANT_URL = `http://${QDRANT_HOST}:${QDRANT_PORT}`;
const GOOGLE_API_KEY = process.env.GOOGLE_API_KEY || "";

const VECTOR_SIZE = 3072;

async function getEmbedding(text: string): Promise<number[]> {
  if (!GOOGLE_API_KEY) {
    return new Array(VECTOR_SIZE).fill(0);
  }
  try {
    const res = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-embedding-001:embedContent?key=${GOOGLE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "models/gemini-embedding-001",
          content: { parts: [{ text }] },
        }),
      }
    );
    if (res.ok) {
      const data = await res.json();
      return data.embedding?.values || new Array(VECTOR_SIZE).fill(0);
    }
  } catch (err) {
    console.error("Embedding generation error:", err);
  }
  return new Array(VECTOR_SIZE).fill(0);
}

// GET: Fetch knowledge base points
export async function GET() {
  try {
    const res = await fetch(`${QDRANT_URL}/collections/knowledge_base/points/scroll`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ limit: 50, with_payload: true }),
    });

    if (!res.ok) {
      return NextResponse.json({ points: [], status: "empty_or_unavailable" });
    }

    const data = await res.json();
    return NextResponse.json({ points: data.result?.points || [] });
  } catch (error) {
    return NextResponse.json(
      { error: "Failed to connect to Qdrant vector database" },
      { status: 500 }
    );
  }
}

// POST: Add new knowledge base article
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { title, content, category, tenant_id = "default" } = body;

    if (!title || !content) {
      return NextResponse.json(
        { error: "Title and content are required." },
        { status: 400 }
      );
    }

    const vector = await getEmbedding(content);
    const id = Date.now();

    const point = {
      id,
      vector,
      payload: {
        id,
        title,
        content,
        category: category || "general",
        tenant_id,
        created_at: new Date().toISOString(),
      },
    };

    const res = await fetch(`${QDRANT_URL}/collections/knowledge_base/points`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ points: [point] }),
    });

    if (!res.ok) {
      const errText = await res.text();
      return NextResponse.json({ error: errText }, { status: 500 });
    }

    return NextResponse.json({ success: true, point });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
