"""
vector_store.py
---------------
ChromaDB vector store module using Google Gemini Multimodal Embeddings (gemini-embedding-2, 1536 dimensions).
Manages persistent collection storage, text/image embeddings, semantic search, 
sequential chunk retrieval, and collection deletion per user ID & document ID.
"""

import os
import chromadb
from google import genai
from google.genai import types
import config

class GeminiEmbeddingFunction(chromadb.EmbeddingFunction):
    """
    ChromaDB Custom Embedding Function utilizing Google Gemini Multimodal Embedding Model (gemini-embedding-2).
    Generates 1536-dimensional vector embeddings for document chunks and user queries.
    """
    def __init__(self, api_key: str = config.GOOGLE_API_KEY, model_name: str = config.EMBEDDING_MODEL, dimension: int = config.EMBEDDING_DIMENSION):
        self.api_key = api_key
        self.model_name = model_name
        self.dimension = dimension
        self.client = genai.Client(api_key=self.api_key)

    def __call__(self, input: chromadb.Documents) -> chromadb.Embeddings:
        embeddings = []
        for doc in input:
            try:
                res = self.client.models.embed_content(
                    model=self.model_name,
                    contents=doc,
                    config=types.EmbedContentConfig(output_dimensionality=self.dimension)
                )
                embeddings.append(res.embeddings[0].values)
            except Exception as err:
                print(f"[GEMINI_EMBEDDING_ERROR] Failed to generate embedding for snippet: {err}")
                raise err
        return embeddings

class VectorStore:
    """
    Manages vector storage and retrieval using ChromaDB with Gemini Multimodal Embeddings (1536-dim).
    Each uploaded document gets its isolated collection named 'doc_gemini_v2_<user_id>_<doc_id>'.
    Enforces strict user isolation at the retrieval layer.
    """

    def __init__(self, db_dir: str = config.CHROMA_DB_DIR):
        self.db_dir = db_dir
        os.makedirs(self.db_dir, exist_ok=True)
        # Initialize persistent ChromaDB client on disk
        self.client = chromadb.PersistentClient(path=self.db_dir)
        self.embedding_fn = GeminiEmbeddingFunction()
        self.genai_client = genai.Client(api_key=config.GOOGLE_API_KEY)

    def _get_collection_name(self, doc_id: str, user_id: str = None) -> str:
        """Helper to sanitize collection names for ChromaDB with Gemini 1536 versioning."""
        user_prefix = f"{user_id.replace('-', '_')}_" if user_id else ""
        clean_doc = doc_id.replace('-', '_')
        return f"doc_gemini_v2_{user_prefix}{clean_doc}"

    def add_chunks(self, doc_id: str, chunks: list[dict], user_id: str = "default_user") -> int:
        """
        Stores chunks in a dedicated Gemini 1536 collection for `doc_id` belonging to `user_id`.
        Generates 1536-dimensional Gemini embeddings via client.models.embed_content.
        """
        if not chunks:
            return 0

        col_name = self._get_collection_name(doc_id, user_id)
        collection = self.client.get_or_create_collection(
            name=col_name,
            embedding_function=self.embedding_fn
        )

        ids = [f"{c['chunk_id']}" for c in chunks]
        documents = [c["text"] for c in chunks]
        metadatas = [
            {
                "page_num": int(c["page_num"]),
                "chunk_index": int(c["chunk_index"]),
                "doc_id": doc_id,
                "user_id": user_id,
                "content_type": c.get("content_type", "text"),
                "embedding_model": config.EMBEDDING_MODEL,
                "embedding_dim": config.EMBEDDING_DIMENSION
            }
            for c in chunks
        ]

        # Generate 1536-dimensional Gemini embeddings
        embeddings = []
        for text in documents:
            res = self.genai_client.models.embed_content(
                model=config.EMBEDDING_MODEL,
                contents=text,
                config=types.EmbedContentConfig(output_dimensionality=config.EMBEDDING_DIMENSION)
            )
            embeddings.append(res.embeddings[0].values)

        print(f"[GEMINI_EMBEDDING] Ingested {len(chunks)} chunks into '{col_name}' using '{config.EMBEDDING_MODEL}' (1536 dims).")

        collection.add(
            ids=ids,
            documents=documents,
            embeddings=embeddings,
            metadatas=metadatas
        )

        return len(chunks)

    def search_chunks(self, doc_id: str, query: str, user_id: str = "default_user", top_k: int = config.TOP_K_RETRIEVAL) -> list[dict]:
        """
        Performs semantic similarity search for `query` within `doc_id` collection using 1536-dim Gemini embeddings.
        """
        col_name = self._get_collection_name(doc_id, user_id)
        collection = None
        try:
            collection = self.client.get_collection(name=col_name, embedding_function=self.embedding_fn)
        except Exception:
            try:
                collection = self.client.get_collection(name=f"doc_{doc_id}", embedding_function=self.embedding_fn)
            except Exception:
                return []

        # Embed query using the exact same Gemini 1536 embedding model
        query_res = self.genai_client.models.embed_content(
            model=config.EMBEDDING_MODEL,
            contents=query,
            config=types.EmbedContentConfig(output_dimensionality=config.EMBEDDING_DIMENSION)
        )
        query_vector = query_res.embeddings[0].values

        results = None
        if user_id:
            try:
                results = collection.query(
                    query_embeddings=[query_vector],
                    n_results=top_k,
                    where={"user_id": user_id}
                )
            except Exception:
                results = None

        if not results or not results.get("documents") or not results["documents"][0]:
            results = collection.query(
                query_embeddings=[query_vector],
                n_results=top_k
            )

        retrieved = []
        if results and results.get("documents") and len(results["documents"]) > 0:
            docs = results["documents"][0]
            metas = results["metadatas"][0] if results.get("metadatas") else []
            dists = results["distances"][0] if results.get("distances") else []

            for i in range(len(docs)):
                meta = metas[i] if i < len(metas) else {}
                if user_id and meta.get("user_id") and meta.get("user_id") != user_id:
                    continue
                dist = dists[i] if i < len(dists) else 0.0
                retrieved.append({
                    "text": docs[i],
                    "page_num": meta.get("page_num", 1),
                    "chunk_index": meta.get("chunk_index", i),
                    "distance": round(float(dist), 4)
                })

        return retrieved

    def get_all_chunks(self, doc_id: str, user_id: str = "default_user") -> list[dict]:
        """
        Retrieves ALL chunks for a document belonging to `user_id`.
        """
        col_name = self._get_collection_name(doc_id, user_id)
        collection = None
        try:
            collection = self.client.get_collection(name=col_name, embedding_function=self.embedding_fn)
        except Exception:
            try:
                collection = self.client.get_collection(name=f"doc_{doc_id}", embedding_function=self.embedding_fn)
            except Exception:
                return []

        data = None
        if user_id:
            try:
                data = collection.get(include=["documents", "metadatas"], where={"user_id": user_id})
            except Exception:
                data = None

        if not data or not data.get("documents"):
            data = collection.get(include=["documents", "metadatas"])

        if not data or not data.get("documents"):
            return []

        chunks = []
        docs = data["documents"]
        metas = data["metadatas"]

        for i in range(len(docs)):
            meta = metas[i] if i < len(metas) else {}
            if user_id and meta.get("user_id") and meta.get("user_id") != user_id:
                continue
            chunks.append({
                "text": docs[i],
                "page_num": meta.get("page_num", 1),
                "chunk_index": meta.get("chunk_index", i)
            })

        chunks.sort(key=lambda c: c["chunk_index"])
        return chunks

    def delete_document(self, doc_id: str, user_id: str = "default_user") -> bool:
        """Deletes the ChromaDB collection associated with `doc_id` and `user_id`."""
        col_name = self._get_collection_name(doc_id, user_id)
        try:
            self.client.delete_collection(name=col_name)
            return True
        except Exception:
            return False
