import os
import sys
from dotenv import load_dotenv
from rag_engine import RAGEngine

# Load env variables
load_dotenv()

def test_backend():
    print("=" * 60)
    print("Starting Backend RAG verification...")
    print("=" * 60)
    
    # Check for NVIDIA_API_KEY
    api_key = os.getenv("NVIDIA_API_KEY")
    if not api_key:
        print("[ERROR] NVIDIA_API_KEY is not set in backend/.env!")
        print("Please edit backend/.env and paste your actual NVIDIA API key before running tests.")
        sys.exit(1)
        
    print("[INFO] NVIDIA_API_KEY is configured.")
    
    try:
        # Initialize RAGEngine
        print("[INFO] Initializing RAGEngine...")
        engine = RAGEngine()
        
        # Re-index documents
        print("[INFO] Re-indexing documents...")
        num_chunks = engine.index_documents(chunk_size=600, chunk_overlap=60)
        print(f"[SUCCESS] Indexed {num_chunks} text chunks successfully.")
        
        # Test Query
        test_query = "How many leaves are allowed annually?"
        print(f"[INFO] Running test query: '{test_query}'...")
        res = engine.query(test_query, k=2)
        
        print("\n" + "=" * 60)
        print("QUERY RESULTS")
        print("=" * 60)
        print(f"Answer:\n{res['answer']}\n")
        print("Retrieved Chunks:")
        for idx, chunk in enumerate(res["retrieved_chunks"]):
            print(f"  {idx+1}. [{chunk['source']} Page {chunk['page']}]")
            print(f"     Text: {chunk['text'][:120]}...")
            
        print("\n[SUCCESS] Backend RAG pipeline verified successfully!")
        
    except Exception as e:
        print(f"\n[ERROR] An error occurred during verification: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)

if __name__ == "__main__":
    test_backend()
