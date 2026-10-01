"""
config.py
---------
Central configuration file for the Document Intelligence System.
Stores environment variables, model selection, chunking parameters, and vector store paths.
"""

import os
from dotenv import load_dotenv

# Load environment variables from .env file if present
load_dotenv()

# Gemini API credentials
GOOGLE_API_KEY = os.getenv("GOOGLE_API_KEY", "")

# Recommended Gemini model for ADK agents
DEFAULT_MODEL = os.getenv("DEFAULT_MODEL", "gemini-3.5-flash-lite")

# Gemini Multimodal Embedding Configuration
EMBEDDING_MODEL = os.getenv("EMBEDDING_MODEL", "gemini-embedding-2")
EMBEDDING_DIMENSION = int(os.getenv("EMBEDDING_DIMENSION", "1536"))

# Vector Store (ChromaDB) Configuration
CHROMA_DB_DIR = os.getenv("CHROMA_DB_DIR", "./chroma_db")

# Chunking Parameters (1000 chars with 150 overlap to preserve boundary context)
CHUNK_SIZE = 1000
CHUNK_OVERLAP = 150

# Map-Reduce & RAG Parameters
SUMMARY_BATCH_CHAR_LIMIT = 12000  # Max characters sent per map batch to stay within token budget
TOP_K_RETRIEVAL = 5               # Top K chunks to retrieve during Q&A semantic search
MAX_UPLOAD_SIZE_MB = 25           # Maximum allowable file size for upload
