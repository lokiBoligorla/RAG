FROM python:3.11-slim

# Set environment variables to prevent Python from writing pyc files and buffering stdout/stderr.
# Also redirect Hugging Face cache directory to a local writeable workspace directory.
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    HF_HOME=/app/.cache

# Create a non-root user. Hugging Face Spaces runs containers with user ID 1000.
RUN useradd -m -u 1000 user

WORKDIR /app

# Install system build dependencies required for compiling some packages
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    && rm -rf /var/lib/apt/lists/*

# Copy and install python dependencies first to leverage Docker layer caching
COPY backend/requirements.txt /app/requirements.txt
RUN pip install --no-cache-dir --upgrade pip && \
    pip install --no-cache-dir -r /app/requirements.txt

# Create cache directory and grant owner permissions to the non-root user
RUN mkdir -p /app/.cache && chown -R user:user /app

# Switch to the non-root user
USER user

# Pre-download the Hugging Face sentence-transformers model during build time
# so that the container is fully loaded and starts up instantly at runtime.
RUN python -c "from langchain_community.embeddings import HuggingFaceEmbeddings; HuggingFaceEmbeddings(model_name='all-MiniLM-L6-v2')"

# Copy the rest of the application files
COPY --chown=user:user . /app/

# Expose port 7860 (Hugging Face Spaces default exposed port)
EXPOSE 7860

# Run FastAPI using uvicorn on port 7860
CMD ["uvicorn", "backend.main:app", "--host", "0.0.0.0", "--port", "7860"]
