FROM python:3.11-slim

# Set environment variables to prevent Python from writing pyc files and buffering stdout/stderr.
# Also redirect Hugging Face cache directory to a local writeable workspace directory.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HF_HOME=/app/.cache

# Create a non-root user. Hugging Face Spaces runs containers with user ID 1000.
RUN useradd -m -u 1000 user

WORKDIR /app

# Install system build dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies first.
# Since files are in the root directory on Hugging Face, we read requirements.txt directly from root.
COPY requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Create cache directory and grant owner permissions to the non-root user
RUN mkdir -p /app/.cache && chown -R user:user /app

# Switch to the non-root user
USER user

# Pre-download the Hugging Face sentence-transformers model during build time
RUN python -c "from langchain_community.embeddings import HuggingFaceEmbeddings; HuggingFaceEmbeddings(model_name='all-MiniLM-L6-v2')"

# Copy the rest of the application files (assuming main.py is in the root)
COPY --chown=user:user . /app/

# Expose port 7860 (Hugging Face Spaces default exposed port)
EXPOSE 7860

# Run FastAPI using uvicorn (assuming main.py is in root)
CMD ["uvicorn", "main:app", "--host", "0.0.0.0", "--port", "7860"]
