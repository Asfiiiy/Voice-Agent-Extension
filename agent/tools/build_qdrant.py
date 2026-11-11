import os
import sys
import json
import logging
from dotenv import load_dotenv

# Load env variables from parent directory if present
load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv()

from qdrant_client import QdrantClient
from qdrant_client.http import models

# Import get_embedding from rag module
sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from rag import get_embedding, COLLECTION_NAME, QDRANT_HOST, QDRANT_PORT

logging.basicConfig(level=logging.INFO, format="%(message)s")


def chunk_text(text: str, max_chunk_size: int = 700, overlap: int = 100):
    """Splits text into chunks of roughly max_chunk_size characters with overlap."""
    words = text.split()
    chunks = []
    current_words = []
    current_len = 0

    for w in words:
        current_words.append(w)
        current_len += len(w) + 1
        if current_len >= max_chunk_size:
            chunk = " ".join(current_words)
            chunks.append(chunk)
            # Retain last few words for overlap context
            overlap_words = current_words[-15:] if len(current_words) > 15 else []
            current_words = list(overlap_words)
            current_len = sum(len(x) + 1 for x in current_words)

    if current_words:
        chunks.append(" ".join(current_words))

    return chunks


def build_database_from_json(json_path=None):
    if json_path is None:
        json_path = os.path.join(os.path.dirname(__file__), "..", "data", "my_knowledge_base.json")
    json_path = os.path.abspath(json_path)

    if not os.path.exists(json_path):
        print(f"[-] Error: File '{json_path}' not found!")
        print("    Pehle 'python tools/extract_data.py' run karein taake data extract ho sake.")
        return

    with open(json_path, "r", encoding="utf-8") as f:
        pages = json.load(f)

    print(f"[*] Found {len(pages)} pages in '{json_path}'.")
    print(f"[*] Connecting to Qdrant at {QDRANT_HOST}:{QDRANT_PORT}...")
    client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT, timeout=10.0)

    # Recreate or ensure collection
    collections = client.get_collections().collections
    exists = any(c.name == COLLECTION_NAME for c in collections)
    if not exists:
        print(f"[*] Creating Qdrant collection '{COLLECTION_NAME}' (3072 dimensions)...")
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(size=3072, distance=models.Distance.COSINE)
        )

    all_points = []
    point_id = 1

    print("\n[*] Processing chunks and generating Gemini embeddings...")
    for page in pages:
        title = page.get("title", "Page")
        url = page.get("url", "")
        category = page.get("category", "general")
        content = page.get("content", "")

        tenant_id = "default"
        if "inspirelondoncollege" in url.lower():
            tenant_id = "inspirelondoncollege"
        elif "ukpdacademy" in url.lower():
            tenant_id = "ukpdacademy"

        chunks = chunk_text(content, max_chunk_size=700, overlap=100)
        print(f"  --> Page: '{title[:45]}...' ({len(chunks)} chunks)")

        for idx, chunk in enumerate(chunks):
            # Rich context title
            chunk_title = f"{title} (Part {idx+1})" if len(chunks) > 1 else title
            vector = get_embedding(chunk)

            if all(v == 0.0 for v in vector):
                print(f"      [!] Warning: Zero embedding for chunk {point_id}")

            payload = {
                "id": point_id,
                "title": chunk_title,
                "url": url,
                "category": category,
                "tenant_id": tenant_id,
                "content": chunk
            }

            all_points.append(
                models.PointStruct(
                    id=point_id,
                    vector=vector,
                    payload=payload
                )
            )
            point_id += 1

    print(f"\n[*] Uploading {len(all_points)} total vector points into Qdrant '{COLLECTION_NAME}'...")
    # Batch upload
    client.upsert(collection_name=COLLECTION_NAME, points=all_points)
    print(f"\n[✓] SUCCESS: Qdrant Database successfully built with {len(all_points)} searchable vectors!")
    print(f"    RAG Agent ab foran aapka naya data use karega!")


if __name__ == "__main__":
    path = sys.argv[1] if len(sys.argv) > 1 else None
    build_database_from_json(path)
