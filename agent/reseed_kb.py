import os
import sys
import logging
from dotenv import load_dotenv

load_dotenv()

from qdrant_client import QdrantClient
from qdrant_client.http import models
from rag import get_embedding, COLLECTION_NAME, QDRANT_HOST, QDRANT_PORT, INDEX_CONTENT_TABLE, ensure_payload_indexes

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger("reseed")

COMPLETE_KNOWLEDGE_BASE = INDEX_CONTENT_TABLE

def reseed():
    print(f"Connecting to Qdrant at {QDRANT_HOST}:{QDRANT_PORT}...")
    client = QdrantClient(host=QDRANT_HOST, port=QDRANT_PORT, timeout=10.0)

    # Check collection
    collections = client.get_collections().collections
    if not any(c.name == COLLECTION_NAME for c in collections):
        print(f"Creating collection {COLLECTION_NAME}...")
        client.create_collection(
            collection_name=COLLECTION_NAME,
            vectors_config=models.VectorParams(size=3072, distance=models.Distance.COSINE)
        )

    print(f"Generating embeddings and uploading {len(COMPLETE_KNOWLEDGE_BASE)} comprehensive items...")
    points = []
    for item in COMPLETE_KNOWLEDGE_BASE:
        print(f"  Embedding ID {item['id']}: {item['title']}...")
        vec = get_embedding(item["content"])
        if all(v == 0.0 for v in vec):
            print(f"    WARNING: Zero vector generated for item {item['id']}")
        points.append(
            models.PointStruct(
                id=item["id"],
                vector=vec,
                payload=item
            )
        )

    client.upsert(collection_name=COLLECTION_NAME, points=points)
    ensure_payload_indexes()
    print(f"SUCCESS: Seeded {len(points)} comprehensive items into Qdrant collection '{COLLECTION_NAME}' with payload indexes!")

if __name__ == "__main__":
    reseed()
