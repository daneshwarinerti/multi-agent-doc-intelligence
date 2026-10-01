"""
api.py
------
FastAPI Backend Server for Multi-Agent Document Intelligence System.
Includes complete authentication, authorization, multi-tenant data isolation,
and user-specific vector search grounding.
"""

import os
os.environ['PROTOCOL_BUFFERS_PYTHON_IMPLEMENTATION'] = 'python'

import tempfile
import shutil
import json
from datetime import datetime
from fastapi import FastAPI, UploadFile, File, HTTPException, status, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

import config
from auth import (
    create_user_account,
    authenticate_user_login,
    invalidate_user_session,
    get_current_user_from_token,
    load_json_file,
    save_json_file,
)
from agents.pipeline import run_ingestion_pipeline, generate_doc_id
from vector_store import VectorStore

from fastapi.responses import JSONResponse

app = FastAPI(
    title="Multi-Agent Document Intelligence API",
    description="REST API wrapping ADK Agents, Vector Grounding, and Multi-Tenant Auth System.",
    version="2.0.0"
)

# Enable CORS for React frontend (supports localhost and Render deployment)
allowed_origins_env = os.getenv("ALLOWED_ORIGINS", "")
origins = []
if allowed_origins_env.strip():
    for o in allowed_origins_env.split(","):
        cleaned = o.strip().rstrip("/")
        if cleaned:
            origins.append(cleaned)

if not origins:
    origins = [
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "*"
    ]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
@app.get("/api/health")
async def health_check():
    """Simple health check endpoint for deployment monitoring."""
    return {
        "status": "ok",
        "timestamp": datetime.now().isoformat(),
        "service": "Multi-Agent Document Intelligence API"
    }


@app.exception_handler(HTTPException)
async def custom_http_exception_handler(request, exc: HTTPException):
    code_map = {
        400: "VALIDATION_ERROR",
        401: "INVALID_CREDENTIALS",
        403: "FORBIDDEN",
        404: "NOT_FOUND",
        500: "INTERNAL_ERROR"
    }
    error_code = code_map.get(exc.status_code, "HTTP_ERROR")
    return JSONResponse(
        status_code=exc.status_code,
        content={
            "success": False,
            "code": error_code,
            "message": str(exc.detail) if exc.detail else "An error occurred."
        }
    )

@app.exception_handler(Exception)
async def custom_global_exception_handler(request, exc: Exception):
    print(f"[AUTH_SERVER_ERROR] Unhandled exception on {request.url.path}: {exc}")
    return JSONResponse(
        status_code=500,
        content={
            "success": False,
            "code": "INTERNAL_ERROR",
            "message": "We couldn't complete your request right now."
        }
    )

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
STORED_RESULTS_FILE = os.path.join(BASE_DIR, "stored_results.json")
CONVERSATIONS_FILE = os.path.join(BASE_DIR, "conversations.json")

def load_stored_results() -> dict:
    return load_json_file(STORED_RESULTS_FILE)

def save_stored_results(data: dict):
    save_json_file(STORED_RESULTS_FILE, data)

def load_conversations() -> dict:
    return load_json_file(CONVERSATIONS_FILE)

def save_conversations(data: dict):
    save_json_file(CONVERSATIONS_FILE, data)

STORED_RESULTS = load_stored_results()
CONVERSATIONS = load_conversations()

# --- Auth Models ---
class SignupRequest(BaseModel):
    email: str
    password: str
    name: str = None

class LoginRequest(BaseModel):
    email: str
    password: str

class AskRequest(BaseModel):
    doc_id: str
    question: str
    replace_index: int = None

@app.get("/")
def read_root():
    return {
        "system": "Multi-Agent Document Intelligence API",
        "status": "online",
        "auth": "enabled",
        "adk_version": "google-adk 1.18.0"
    }

# --- AUTHENTICATION ENDPOINTS ---
@app.post("/api/auth/signup", status_code=status.HTTP_201_CREATED)
async def signup_endpoint(req: SignupRequest):
    """Creates a new user account with validated email and hashed password."""
    if not req.email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")
    return create_user_account(email=req.email, password=req.password, name=req.name)

@app.post("/api/auth/login")
async def login_endpoint(req: LoginRequest):
    """Authenticates user credentials and returns bearer token."""
    if not req.email or not req.password:
        raise HTTPException(status_code=400, detail="Email and password are required.")
    return authenticate_user_login(email=req.email, password=req.password)

@app.post("/api/auth/logout")
async def logout_endpoint(authorization: str = Header(None)):
    """Invalidates the active session token."""
    if authorization:
        token = authorization.replace("Bearer ", "").strip()
        invalidate_user_session(token)
    return {"status": "success", "message": "Logged out successfully."}

@app.get("/api/auth/me")
async def get_me_endpoint(current_user: dict = Depends(get_current_user_from_token)):
    """Returns currently authenticated user profile."""
    return {"status": "success", "user": current_user}

@app.get("/api/auth/debug")
async def auth_debug_endpoint(current_user: dict = Depends(get_current_user_from_token)):
    """Developer-only authentication diagnostic endpoint."""
    from auth import USERS_FILE, SESSIONS_FILE
    users = load_json_file(USERS_FILE)
    sessions = load_json_file(SESSIONS_FILE)
    return {
        "status": "success",
        "auth_connected": True,
        "db_connected": True,
        "user_count": len(users),
        "active_sessions": len(sessions),
        "current_user": {
            "user_id": current_user["user_id"],
            "email": current_user["email"],
            "name": current_user["name"],
            "record_found": current_user["user_id"] in users,
            "session_valid": True
        }
    }


def get_unique_display_filename(filename: str, user_id: str, stored_results: dict) -> str:
    """Resolves filename collisions per user account."""
    existing_names = [
        res.get("file_name") for res in stored_results.values()
        if res.get("user_id") == user_id and res.get("file_name")
    ]
    if filename not in existing_names:
        return filename

    base, ext = os.path.splitext(filename)
    counter = 1
    new_name = f"{base} ({counter}){ext}"
    while new_name in existing_names:
        counter += 1
        new_name = f"{base} ({counter}){ext}"
    return new_name


# --- PROTECTED DOCUMENT ENDPOINTS ---
@app.post("/api/upload", status_code=status.HTTP_201_CREATED)
async def upload_document(
    file: UploadFile = File(...),
    current_user: dict = Depends(get_current_user_from_token)
):
    """
    Uploads and ingests a document associated with the authenticated user.
    Enforces file format, size limits, and vector store user isolation.
    """
    global STORED_RESULTS
    STORED_RESULTS = load_stored_results()

    user_id = current_user["user_id"]
    ext = os.path.splitext(file.filename)[1].lower()
    if ext not in [".pdf", ".docx", ".txt"]:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Only PDF, DOCX, and TXT are supported."
        )

    with tempfile.NamedTemporaryFile(delete=False, suffix=ext) as tmp:
        shutil.copyfileobj(file.file, tmp)
        tmp_path = tmp.name

    try:
        file_size_mb = os.path.getsize(tmp_path) / (1024 * 1024)
        if file_size_mb > config.MAX_UPLOAD_SIZE_MB:
            raise HTTPException(
                status_code=400,
                detail=f"File size ({file_size_mb:.2f} MB) exceeds limit of {config.MAX_UPLOAD_SIZE_MB} MB."
            )

        original_filename = file.filename or "document.pdf"
        display_name = get_unique_display_filename(original_filename, user_id, STORED_RESULTS)

        doc_id = generate_doc_id(tmp_path)
        pipeline_result = await run_ingestion_pipeline(
            tmp_path,
            doc_id=doc_id,
            original_filename=display_name,
            user_id=user_id
        )

        pipeline_result["user_id"] = user_id
        pipeline_result["created_at"] = datetime.now().strftime("%b %d, %Y")

        STORED_RESULTS[doc_id] = pipeline_result
        save_stored_results(STORED_RESULTS)

        return {
            "status": "success",
            "doc_id": doc_id,
            "user_id": user_id,
            "file_name": display_name,
            "page_count": pipeline_result["page_count"],
            "chunk_count": pipeline_result["chunk_count"],
            "concise_summary": pipeline_result.get("concise_summary"),
            "detailed_summary": pipeline_result.get("detailed_summary"),
            "insights": pipeline_result.get("insights"),
            "message": "Document successfully ingested and indexed."
        }

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Pipeline processing failed: {str(e)}"
        )
    finally:
        if os.path.exists(tmp_path):
            os.remove(tmp_path)


@app.get("/api/documents")
async def list_documents(current_user: dict = Depends(get_current_user_from_token)):
    """Returns list of documents belonging STRICTLY to the authenticated user."""
    global STORED_RESULTS
    STORED_RESULTS = load_stored_results()

    user_id = current_user["user_id"]
    docs = []
    for doc_id, res in STORED_RESULTS.items():
        if res.get("user_id") == user_id:
            docs.append({
                "doc_id": doc_id,
                "user_id": user_id,
                "file_name": res.get("file_name", "document.pdf"),
                "page_count": res.get("page_count", 1),
                "chunk_count": res.get("chunk_count", 0),
                "concise_summary": res.get("concise_summary"),
                "detailed_summary": res.get("detailed_summary"),
                "insights": res.get("insights"),
                "created_at": res.get("created_at") or "Recently",
                "status": "Ready" if res.get("chunk_count", 0) > 0 else "Indexing failed"
            })
    return {"status": "success", "documents": docs}


@app.get("/api/summary/{doc_id}")
async def get_summary(
    doc_id: str,
    current_user: dict = Depends(get_current_user_from_token)
):
    """Retrieves summary for `doc_id`, verifying ownership."""
    global STORED_RESULTS
    STORED_RESULTS = load_stored_results()

    if doc_id not in STORED_RESULTS:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found.")

    res = STORED_RESULTS[doc_id]
    if res.get("user_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="You do not have permission to access this document.")

    return {
        "status": "success",
        "doc_id": doc_id,
        "concise_summary": res.get("concise_summary"),
        "detailed_summary": res.get("detailed_summary")
    }


@app.get("/api/insights/{doc_id}")
async def get_insights(
    doc_id: str,
    current_user: dict = Depends(get_current_user_from_token)
):
    """Retrieves structured insights for `doc_id`, verifying ownership."""
    global STORED_RESULTS
    STORED_RESULTS = load_stored_results()

    if doc_id not in STORED_RESULTS:
        raise HTTPException(status_code=404, detail=f"Document '{doc_id}' not found.")

    res = STORED_RESULTS[doc_id]
    if res.get("user_id") != current_user["user_id"]:
        raise HTTPException(status_code=403, detail="You do not have permission to access this document.")

    return {
        "status": "success",
        "doc_id": doc_id,
        "insights": res.get("insights")
    }


@app.get("/api/conversations/{doc_id}")
async def get_conversation_history(
    doc_id: str,
    current_user: dict = Depends(get_current_user_from_token)
):
    """Retrieves persisted Q&A messages for the specified user and document."""
    global CONVERSATIONS
    CONVERSATIONS = load_conversations()

    key = f"{current_user['user_id']}_{doc_id}"
    conv = CONVERSATIONS.get(key, {"messages": []})
    return {
        "status": "success",
        "doc_id": doc_id,
        "messages": conv.get("messages", [])
    }


@app.post("/api/ask")
async def ask_question_endpoint(
    req: AskRequest,
    current_user: dict = Depends(get_current_user_from_token)
):
    """
    Executes grounded Q&A with strict vector retrieval isolation and stores conversation history.
    """
    if not req.doc_id or not req.question.strip():
        raise HTTPException(status_code=400, detail="Both 'doc_id' and 'question' must be provided.")

    global STORED_RESULTS
    STORED_RESULTS = load_stored_results()

    doc_info = STORED_RESULTS.get(req.doc_id)
    if not doc_info:
        raise HTTPException(status_code=404, detail="Document not found.")

    user_id = current_user["user_id"]
    if doc_info.get("user_id") != user_id:
        raise HTTPException(status_code=403, detail="You do not have permission to ask questions about this document.")

    try:
        global CONVERSATIONS
        CONVERSATIONS = load_conversations()
        conv_key = f"{user_id}_{req.doc_id}"
        conv_entry = CONVERSATIONS.get(conv_key, {})
        history_messages = conv_entry.get("messages", [])

        if req.replace_index is not None and isinstance(req.replace_index, int) and req.replace_index >= 0:
            history_messages = history_messages[:req.replace_index]

        from agents.qa import ask_question
        qa_result = await ask_question(
            doc_id=req.doc_id,
            question=req.question.strip(),
            user_id=user_id,
            history=history_messages
        )

        # Persist message to conversation history
        if conv_key not in CONVERSATIONS:
            CONVERSATIONS[conv_key] = {"user_id": user_id, "doc_id": req.doc_id, "messages": []}

        if req.replace_index is not None and isinstance(req.replace_index, int) and req.replace_index >= 0:
            CONVERSATIONS[conv_key]["messages"] = CONVERSATIONS[conv_key]["messages"][:req.replace_index]

        user_msg = {
            "id": f"usr_{datetime.now().timestamp()}",
            "sender": "user",
            "text": req.question.strip(),
            "timestamp": datetime.now().isoformat()
        }
        ai_msg = {
            "id": f"ai_{datetime.now().timestamp()}",
            "sender": "assistant",
            "text": qa_result["answer"],
            "sources": qa_result.get("sources", []),
            "is_conversational": qa_result.get("is_conversational", False),
            "has_citations": len(qa_result.get("sources", [])) > 0,
            "timestamp": datetime.now().isoformat()
        }

        CONVERSATIONS[conv_key]["messages"].append(user_msg)
        CONVERSATIONS[conv_key]["messages"].append(ai_msg)
        save_conversations(CONVERSATIONS)

        return {
            "status": "success",
            "doc_id": req.doc_id,
            "question": req.question,
            "answer": qa_result["answer"],
            "sources": qa_result.get("sources", []),
            "is_conversational": qa_result.get("is_conversational", False),
            "has_citations": len(qa_result.get("sources", [])) > 0,
            "latency_ms": qa_result.get("latency_ms", 0),
            "debug": qa_result.get("debug")
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Q&A Agent processing failed: {str(e)}")


@app.delete("/api/document/{doc_id}")
async def delete_document(
    doc_id: str,
    current_user: dict = Depends(get_current_user_from_token)
):
    """Deletes document collection from ChromaDB and stored results cache if owned by user."""
    global STORED_RESULTS
    STORED_RESULTS = load_stored_results()

    user_id = current_user["user_id"]
    if doc_id in STORED_RESULTS:
        if STORED_RESULTS[doc_id].get("user_id") != user_id:
            raise HTTPException(status_code=403, detail="You do not have permission to delete this document.")

        vs = VectorStore()
        vs.delete_document(doc_id, user_id=user_id)

        del STORED_RESULTS[doc_id]
        save_stored_results(STORED_RESULTS)

    # Delete conversation history
    global CONVERSATIONS
    CONVERSATIONS = load_conversations()
    conv_key = f"{user_id}_{doc_id}"
    if conv_key in CONVERSATIONS:
        del CONVERSATIONS[conv_key]
        save_conversations(CONVERSATIONS)

    return {"status": "success", "message": f"Document '{doc_id}' deleted."}
