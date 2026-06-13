import os
import pypdf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field
from typing import Optional, List
from rag_engine import RAGEngine

app = FastAPI(title="ABC Technologies HR RAG API", version="1.0.0")

# Enable CORS for frontend integration (Vite runs on port 5173 by default)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # For local development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize RAG Engine
CURRENT_DIR = os.path.dirname(os.path.abspath(__file__))
# Detect if PDFs are in the same directory (Docker) or parent directory (local)
if os.path.exists(os.path.join(CURRENT_DIR, "Leave_Policy.pdf")):
    PDF_DIR = CURRENT_DIR
    PERSIST_DIR = os.path.join(CURRENT_DIR, "chroma_db_local")
else:
    PDF_DIR = os.path.dirname(CURRENT_DIR)
    PERSIST_DIR = os.path.join(CURRENT_DIR, "chroma_db_local")

print(f"Loading RAG with PDF_DIR={PDF_DIR} and PERSIST_DIR={PERSIST_DIR}")
rag = RAGEngine(pdf_dir=PDF_DIR, persist_dir=PERSIST_DIR)

# Auto-index on startup if vector database is empty/not loaded
if not rag.vectorstore:
    print("Vector database is empty. Running auto-indexing on startup...")
    try:
        rag.index_documents(chunk_size=600, chunk_overlap=60)
    except Exception as e:
        print(f"Error running auto-indexing on startup: {e}")

# Request Models
class IndexRequest(BaseModel):
    chunk_size: int = Field(default=200, ge=50, le=1000)
    chunk_overlap: int = Field(default=30, ge=0, le=200)

class QueryRequest(BaseModel):
    query: str
    k: int = Field(default=3, ge=1, le=10)
    file_filter: Optional[str] = Field(default=None)

# Response Models
class ChunkResponse(BaseModel):
    text: str
    source: str
    page: int

class QueryResponse(BaseModel):
    answer: str
    retrieved_chunks: List[ChunkResponse]
    raw_prompt: str

class FileInfo(BaseModel):
    name: str
    size_bytes: int
    page_count: int

@app.post("/index", summary="Re-index all documents in the folder")
async def index_documents(req: IndexRequest):
    try:
        num_chunks = rag.index_documents(chunk_size=req.chunk_size, chunk_overlap=req.chunk_overlap)
        return {"status": "success", "message": f"Successfully indexed documents into {num_chunks} chunks."}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.post("/query", response_model=QueryResponse, summary="Query the RAG system")
async def query_rag(req: QueryRequest):
    try:
        result = rag.query(query_text=req.query, k=req.k, file_filter=req.file_filter)
        return result
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/files", response_model=List[FileInfo], summary="Get list of PDF files with metadata")
async def list_files():
    try:
        files = []
        if not os.path.exists(PDF_DIR):
            return []
        
        for name in sorted(os.listdir(PDF_DIR)):
            if name.endswith(".pdf"):
                path = os.path.join(PDF_DIR, name)
                size_bytes = os.path.getsize(path)
                
                # Try getting page count
                page_count = 0
                try:
                    reader = pypdf.PdfReader(path)
                    page_count = len(reader.pages)
                except Exception:
                    pass
                
                files.append(FileInfo(name=name, size_bytes=size_bytes, page_count=page_count))
        return files
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@app.get("/file/{filename}", summary="Get the raw text of a specific PDF file page-by-page")
async def get_file_content(filename: str):
    path = os.path.join(PDF_DIR, filename)
    if not os.path.exists(path) or not filename.endswith(".pdf"):
        raise HTTPException(status_code=404, detail="File not found")
        
    try:
        reader = pypdf.PdfReader(path)
        pages = []
        for idx, page in enumerate(reader.pages):
            text = page.extract_text() or ""
            # Clean up the text a bit for readability
            pages.append({"page_number": idx + 1, "content": text.strip()})
        return {"filename": filename, "pages": pages}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error parsing PDF: {str(e)}")

@app.api_route("/status", methods=["GET", "HEAD"], summary="Check if the vector store is indexed")
async def get_status():
    is_indexed = rag.vectorstore is not None
    return {
        "status": "active" if is_indexed else "requires_indexing",
        "is_indexed": is_indexed,
        "pdf_dir": PDF_DIR,
        "persist_dir": PERSIST_DIR
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)
