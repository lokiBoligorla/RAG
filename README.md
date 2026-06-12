# PolicyPilot: Secure Corporate HR RAG Assistant

**PolicyPilot** is a secure, Retrieval-Augmented Generation (RAG) assistant designed for **ABC Technologies Pvt Ltd**. It allows employees to query corporate policy PDFs (HR, IT, leaves, insurance, etc.) with high accuracy, speed, and strict citation privacy.

This project is built using a decoupled architecture: a **FastAPI backend** utilizing local offline embeddings with the NVIDIA Mistral-Nemotron API, and a **React + Vite frontend** styled in a premium, clean Nordic Frost theme.

---

## 🚀 Key Features

*   **Offline Local Embeddings**: Uses **`all-MiniLM-L6-v2`** via HuggingFace (384-dimensional vectors) to run all text embeddings locally. This avoids API usage fees and eliminates indexing rate limits.
*   **Fast Generation**: Queries the **`mistralai/mistral-nemotron`** model via NVIDIA's developer API for fluent, context-grounded answers in under **0.3 seconds**.
*   **CONFIDENTIALITY (Zero citation leaks)**: Replaces file sources with strict system prompt constraints and client-side regex filters to prevent sensitive PDF filenames or page citations from rendering in user chat bubbles.
*   **Nordic Frost UI Theme**: A clean, off-white glassmorphic interface with soft ambient glows, modern typography (Outfit & Plus Jakarta Sans), and responsive prompt cards.
*   **Interactive Inquiry Cards**: Pre-loaded cards on the main interface that allow users to ask standard policy questions (leaves, remote work, onboarding, insurance) with a single click.
*   **100% Free Cloud Deployment**: Fully configured to host the backend container on **Hugging Face Spaces** (with 16GB free RAM) and the frontend on **Vercel** without paying anything.

---

## 📁 Project Directory Structure

```text
Traditional_RAG/
├── backend/
│   ├── .env               <- Paste your NVIDIA_API_KEY here (Ignored by Git)
│   ├── main.py            <- FastAPI HTTP web server & CORS configuration
│   ├── rag_engine.py      <- Core RAG logic (Embeddings, Chroma search, Nvidia LLM chain)
│   ├── test_rag.py        <- Local backend verification script
│   ├── requirements.txt   <- Python dependencies list
│   └── chroma_db_local/   <- Local vector store database (Ignored by Git)
├── frontend/
│   ├── src/
│   │   ├── App.jsx        <- Chat UI, suggested questions, and regex sanitizer
│   │   ├── index.css      <- Nordic Frost Light theme styling variables
│   │   └── main.jsx       <- App entrypoint
│   ├── package.json       <- Node dependencies list
│   └── vite.config.js     <- Vite configuration
├── .gitignore             <- Root git ignore file (protects credentials & cache files)
├── Dockerfile             <- Docker recipe for Hugging Face Spaces deployment
└── [10 PDF files]         <- Corporate policy documents (HR, Leave, Finance, remote work, etc.)
```

---

## ⚙️ Technical Workflow

### 1. Ingestion Pipeline
When the server starts (or when the `/index` endpoint is triggered):
1. **Load**: `PyPDFDirectoryLoader` reads all PDF files in the directory.
2. **Split**: `RecursiveCharacterTextSplitter` segments pages into chunks (size: `600` characters, overlap: `60` characters). The splitter recursively uses paragraph breaks (`\n\n`), sentence ends (`\n`), and spaces (`" "`) to avoid cutting words in half.
3. **Embed**: The local `all-MiniLM-L6-v2` model converts the text chunks into mathematical vectors.
4. **Persist**: Vectors and text are saved locally inside the `chroma_db_local` directory.

### 2. Retrieval-Augmentation & Generation Pipeline
When a user asks a question:
1. **Greeting Check**: The query is checked against common greetings. If it matches, a static welcome message is returned (bypasses LLM to save tokens).
2. **Retrieve**: The query is converted into a vector and ChromaDB retrieves the $K=3$ most similar chunks.
3. **Augment**: The chunks are formatted into a system prompt. The prompt mandates the LLM to answer using *only* the context, output a fallback string (`I cannot find this in the corporate policies.`) if not found, and omit any document names.
4. **Generate**: The prompt is sent to `mistralai/mistral-nemotron` via the NVIDIA API.
5. **Sanitize**: The React client uses regex filters to remove any accidental bracketed page or source citations before rendering the text bubble.

---

## 🛠️ Local Setup & Installation

### Prerequsites
* Python 3.11+
* Node.js 18+

### Step 1: Run the Backend
1. Navigate to the project root and create a virtual environment:
   ```powershell
   python -m venv .venv
   .venv\Scripts\activate
   ```
2. Install Python dependencies:
   ```powershell
   pip install -r backend/requirements.txt
   ```
3. Create a `backend/.env` file and add your key:
   ```env
   NVIDIA_API_KEY=your_nvidia_api_key_here
   ```
4. Run the server:
   ```powershell
   python backend/main.py
   ```
   *(Backend will start on `http://localhost:8000`)*

### Step 2: Run the Frontend
1. Open a new terminal tab and navigate to the `frontend` folder:
   ```powershell
   cd frontend
   npm install
   npm run dev
   ```
2. Open your browser and navigate to `http://localhost:5173`.

---

## ☁️ Public Cloud Deployment (100% Free)

### Backend: Hugging Face Spaces (Free 16GB RAM)
1. Create a new Space on [Hugging Face](https://huggingface.co/spaces) selecting **Docker** (Blank SDK) and the **CPU Basic (Free - 16GB RAM)** tier.
2. Upload the `main.py`, `rag_engine.py`, `requirements.txt`, `Dockerfile`, and all `*.pdf` policy documents.
3. In your Space **Settings**, add a private secret:
   * **Name**: `NVIDIA_API_KEY`
   * **Value**: *Your Nvidia Developer Key*
4. Hugging Face will build and start the server automatically. Copy the direct Space URL (e.g. `https://username-spacename.hf.space`).

### Frontend: Vercel (Free Static Hosting)
1. In `frontend/src/App.jsx`, update the `API_BASE` endpoint (Line 6) to point to your live Hugging Face URL:
   ```javascript
   const API_BASE = 'https://username-spacename.hf.space';
   ```
2. Commit and push the code to a GitHub repository.
3. Import the repository into [Vercel](https://vercel.com).
4. Configure the Vite framework settings:
   * **Root Directory**: `frontend`
   * **Build Command**: `npm run build`
   * **Output Directory**: `dist`
5. Click **Deploy**. Vercel will host your client interface on a secure public domain.
