import os
from dotenv import load_dotenv
from langchain_community.document_loaders import PyPDFDirectoryLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_openai import ChatOpenAI
from langchain_community.vectorstores import Chroma
from langchain.chains import create_retrieval_chain
from langchain.chains.combine_documents import create_stuff_documents_chain
from langchain_core.prompts import ChatPromptTemplate

# Load environment variables
load_dotenv()

class RAGEngine:
    def __init__(self, pdf_dir: str = None, persist_dir: str = None):
        # Resolve default paths dynamically if not provided
        current_dir = os.path.dirname(os.path.abspath(__file__))
        if not pdf_dir:
            if os.path.exists(os.path.join(current_dir, "Leave_Policy.pdf")):
                pdf_dir = current_dir
            else:
                pdf_dir = os.path.dirname(current_dir)
        if not persist_dir:
            persist_dir = os.path.join(current_dir, "chroma_db_local")
            
        self.pdf_dir = pdf_dir
        self.persist_dir = persist_dir
        self.embeddings = HuggingFaceEmbeddings(model_name="all-MiniLM-L6-v2")
        self.vectorstore = None
        
        # Load existing vectorstore if it exists
        if os.path.exists(self.persist_dir) and os.listdir(self.persist_dir):
            try:
                self.vectorstore = Chroma(
                    persist_directory=self.persist_dir,
                    embedding_function=self.embeddings
                )
                print("Loaded existing ChromaDB vector store.")
            except Exception as e:
                print(f"Error loading ChromaDB: {e}. Re-indexing might be required.")

    def index_documents(self, chunk_size: int = 200, chunk_overlap: int = 30):
        """
        Parses all PDFs in the folder, chunks them, computes embeddings,
        and saves them to the local ChromaDB.
        """
        print(f"Indexing PDFs from {self.pdf_dir} (chunk_size={chunk_size}, chunk_overlap={chunk_overlap})...")
        
        # 1. Load PDF Documents
        # PyPDFDirectoryLoader extracts document pages and saves metadata like 'source' and 'page'
        loader = PyPDFDirectoryLoader(self.pdf_dir, glob="*.pdf")
        documents = loader.load()
        if not documents:
            raise FileNotFoundError(f"No PDF files found in {self.pdf_dir}")
        print(f"Successfully loaded {len(documents)} PDF pages.")

        # 2. Split documents into chunks
        text_splitter = RecursiveCharacterTextSplitter(
            chunk_size=chunk_size,
            chunk_overlap=chunk_overlap,
            length_function=len,
            separators=["\n\n", "\n", " ", ""]
        )
        chunks = text_splitter.split_documents(documents)
        print(f"Created {len(chunks)} text chunks.")

        # 3. Create and persist vectorstore
        # Clear existing collection database directory if it exists for a clean slate
        import shutil
        import time
        if os.path.exists(self.persist_dir):
            try:
                shutil.rmtree(self.persist_dir)
                print("Cleared existing database folder.")
            except Exception as e:
                print(f"Warning: could not clear directory: {e}")

        # Batch indexing to prevent Gemini free tier API rate limits (100 requests per minute)
        batch_size = 20
        self.vectorstore = None
        
        for i in range(0, len(chunks), batch_size):
            batch = chunks[i:i + batch_size]
            if not self.vectorstore:
                self.vectorstore = Chroma.from_documents(
                    documents=batch,
                    embedding=self.embeddings,
                    persist_directory=self.persist_dir
                )
            else:
                self.vectorstore.add_documents(batch)
            print(f"Indexed batch {i//batch_size + 1}/{(len(chunks)-1)//batch_size + 1} ({len(batch)} chunks)...")
            
            # Pause between batches if there are more chunks left to prevent 429 rate limit
            if i + batch_size < len(chunks):
                time.sleep(3)

        print("ChromaDB vector store successfully created and persisted.")
        return len(chunks)

    def query(self, query_text: str, k: int = 3, file_filter: str = None):
        """
        Queries the vector store and generates an answer using Gemini,
        returning the answer, the prompt, and the retrieved context chunks.
        """
        # 1. Direct local response for greetings / simple check-ins (saves API quota and prevents 503 spikes)
        greetings = {"hi", "hello", "hey", "hii", "hi there", "greetings", "good morning", "good afternoon", "good evening", "howdy", "hola", "heyy"}
        cleaned_query = query_text.lower().strip().rstrip('?').rstrip('!').rstrip('.')
        if cleaned_query in greetings:
            return {
                "answer": "Hello! I am your ABC Technologies HR Assistant. How can I help you today? You can ask me questions about leaves, remote work rules, onboarding, or insurance claims.",
                "retrieved_chunks": [],
                "raw_prompt": "System:\n[Local Greeting Handler Activated]\n\nHuman:\n" + query_text
            }

        if not self.vectorstore:
            raise ValueError("Vector store is not initialized. Please index documents first.")

        # 2. Configure search arguments (K nearest neighbors and optional file filtering)
        search_kwargs = {"k": k}
        if file_filter:
            full_pdf_path = os.path.join(self.pdf_dir, file_filter)
            search_kwargs["filter"] = {"source": full_pdf_path}

        retriever = self.vectorstore.as_retriever(search_kwargs=search_kwargs)

        # 3. Retrieve document chunks with automatic retry on 503 / transient errors
        import time
        max_retries = 3
        delay = 2
        retrieved_docs = []
        
        for attempt in range(max_retries):
            try:
                retrieved_docs = retriever.invoke(query_text)
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                print(f"Embedding API returned error: {e}. Retrying in {delay}s (Attempt {attempt+1}/{max_retries})...")
                time.sleep(delay)
                delay *= 2

        # Format the retrieved context for response representation
        context_docs = []
        for doc in retrieved_docs:
            source_file = os.path.basename(doc.metadata.get("source", "Unknown"))
            page_num = doc.metadata.get("page", 0) + 1  # 0-indexed to 1-indexed
            context_docs.append({
                "text": doc.page_content,
                "source": source_file,
                "page": page_num
            })

        # 4. Setup prompt template and LLM
        llm = ChatOpenAI(
            base_url="https://integrate.api.nvidia.com/v1",
            api_key=os.getenv("NVIDIA_API_KEY"),
            model="mistralai/mistral-nemotron",
            temperature=0.0
        )
        
        system_prompt = (
            "You are the ABC Technologies HR Assistant. Answer the question using ONLY the "
            "provided contexts below. If the user asks a general question about the company, "
            "its policies, or what information is available, you may summarize the key guidelines "
            "present in the contexts (such as onboarding procedures, attendance rules, leave policies, "
            "reimbursements, and IT security) in a professional manner. If the query asks for information "
            "that is completely unrelated or cannot be found or deduced from the contexts, state clearly "
            "that 'I cannot find this in the corporate policies.'\n"
            "Be professional, clear, and structured. Do NOT mention any document names, PDF names, "
            "file sources, or reference document filenames in your answer. Keep the response completely "
            "clean of file references.\n\n"
            "Contexts:\n{context}"
        )
        prompt_template = ChatPromptTemplate.from_messages([
            ("system", system_prompt),
            ("human", "{input}"),
        ])

        # 5. Create and run RAG chain with retry mechanism
        question_answer_chain = create_stuff_documents_chain(llm, prompt_template)
        rag_chain = create_retrieval_chain(retriever, question_answer_chain)

        response = None
        delay = 2 # Reset delay for generation call
        
        for attempt in range(max_retries):
            try:
                response = rag_chain.invoke({"input": query_text})
                break
            except Exception as e:
                if attempt == max_retries - 1:
                    raise e
                print(f"Generation API returned error: {e}. Retrying in {delay}s (Attempt {attempt+1}/{max_retries})...")
                time.sleep(delay)
                delay *= 2
        
        # 6. Format prompt sent to the model for visual display
        formatted_context = "\n\n".join(
            f"[Source: {os.path.basename(doc.metadata.get('source', ''))} Page {doc.metadata.get('page', 0)+1}]\n{doc.page_content}"
            for doc in retrieved_docs
        )
        full_system_prompt = system_prompt.format(context=formatted_context)

        return {
            "answer": response["answer"],
            "retrieved_chunks": context_docs,
            "raw_prompt": f"System:\n{full_system_prompt}\n\nHuman:\n{query_text}"
        }
