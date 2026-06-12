import os
from dotenv import load_dotenv
from rag_engine import RAGEngine

load_dotenv()

engine = RAGEngine()
query = "what to know to more about this company"
res = engine.query(query, k=3)

print("="*60)
print(f"QUERY: {query}")
print("="*60)
print("RETRIEVED CHUNKS:")
for idx, chunk in enumerate(res["retrieved_chunks"]):
    print(f"\nChunk {idx+1} (Source: {chunk['source']}, Page: {chunk['page']}):")
    print(chunk["text"])
print("="*60)
print("ANSWER:")
print(res["answer"])
print("="*60)
