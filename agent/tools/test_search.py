import os
import sys
from dotenv import load_dotenv

load_dotenv(os.path.join(os.path.dirname(__file__), "..", ".env"))
load_dotenv()

sys.path.append(os.path.join(os.path.dirname(__file__), ".."))
from rag import search_knowledge_base

def test_query(question: str):
    print(f"\n========================================================")
    print(f"SEARCH QUERY: \"{question}\"")
    print(f"========================================================")
    results = search_knowledge_base(question, top_k=3)
    print(results)
    print("========================================================\n")

if __name__ == "__main__":
    if len(sys.argv) > 1:
        query = " ".join(sys.argv[1:])
    else:
        query = "Tell me about the Phlebotomy course and fee"
    test_query(query)
