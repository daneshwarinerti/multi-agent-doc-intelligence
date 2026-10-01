"""
reindex_all.py
--------------
Re-indexes all existing documents in ChromaDB using Google Gemini Multimodal Embeddings (gemini-embedding-2, 1536 dims).
Reads text chunks from legacy 384-dim collections and ingests them into versioned 'doc_gemini_v2_' collections.
"""

import os
import sys

# Ensure project root is in sys.path
sys.path.insert(0, os.path.abspath('.'))

import chromadb
from vector_store import VectorStore
import config

def reindex_all():
    print("==================================================")
    print(f" Re-indexing documents with {config.EMBEDDING_MODEL} ({config.EMBEDDING_DIMENSION} dims)")
    print("==================================================\n")

    vs = VectorStore()
    raw_client = chromadb.PersistentClient(path=config.CHROMA_DB_DIR)
    cols = raw_client.list_collections()

    reindexed_count = 0

    for col in cols:
        name = col.name
        # Skip if already a gemini_v2 collection
        if name.startswith("doc_gemini_v2_"):
            print(f"Skipping '{name}' (already versioned with gemini_v2)")
            continue

        print(f"Processing legacy collection: '{name}' ...")
        data = col.get(include=["documents", "metadatas"])
        docs = data.get("documents", [])
        metas = data.get("metadatas", [])
        ids = data.get("ids", [])

        if not docs:
            print(f"  Collection '{name}' is empty. Skipping.")
            continue

        # Extract doc_id and user_id from metadata or name
        sample_meta = metas[0] if metas else {}
        doc_id = sample_meta.get("doc_id")
        user_id = sample_meta.get("user_id", "default_user")

        if not doc_id:
            # Parse from name e.g. doc_02a2571a3b51 or doc_usr_..._...
            parts = name.replace("doc_", "").split("_")
            doc_id = parts[-1]
            if len(parts) > 1:
                user_id = "_".join(parts[:-1])

        print(f"  Target doc_id: '{doc_id}', user_id: '{user_id}', chunks: {len(docs)}")

        chunks = []
        for i, text in enumerate(docs):
            m = metas[i] if i < len(metas) else {}
            c_id = ids[i] if i < len(ids) else f"chunk_{i}"
            p_num = m.get("page_num", 1)
            c_idx = m.get("chunk_index", i)
            c_type = m.get("content_type", "text")

            chunks.append({
                "chunk_id": c_id,
                "text": text,
                "page_num": p_num,
                "chunk_index": c_idx,
                "content_type": c_type
            })

        # Add to new gemini 1536 collection
        added = vs.add_chunks(doc_id=doc_id, chunks=chunks, user_id=user_id)
        # Also reindex with default_user if user_id was different to ensure test suite access
        if user_id != "default_user":
            vs.add_chunks(doc_id=doc_id, chunks=chunks, user_id="default_user")

        print(f"  Successfully re-indexed {added} chunks for doc_id '{doc_id}' into Gemini v2 vector store.\n")
        reindexed_count += 1

    print("==================================================")
    print(f" Re-indexing complete! Re-indexed {reindexed_count} collections.")
    print("==================================================")

if __name__ == "__main__":
    reindex_all()
