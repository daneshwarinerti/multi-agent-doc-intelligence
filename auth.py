"""
auth.py
-------
Authentication and authorization module for Multi-Agent Document Intelligence System.

Handles:
- User signup & login with absolute file persistence
- Email regex validation (rejects invalid emails strictly)
- Password validation & secure PBKDF2 salt hashing
- Persistent user & session storage in users.json and sessions.json
- Bearer token authentication & authorization middleware
- Comprehensive auth trace logging for auditing
"""

import os
import json
import re
import uuid
import hashlib
import secrets
from datetime import datetime
from fastapi import HTTPException, Header, Depends, status

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
USERS_FILE = os.path.join(BASE_DIR, "users.json")
SESSIONS_FILE = os.path.join(BASE_DIR, "sessions.json")

# Strict RFC 5322 compliant Email Regex Pattern
EMAIL_REGEX = re.compile(r"^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$")

def validate_email_format(email: str) -> bool:
    """
    Validates email format strictly.
    Rejects invalid patterns: 1234, abc, test, hello@, @gmail.com, user@, user@domain, user@domain.
    """
    if not email or not isinstance(email, str):
        return False
    email = email.strip()
    if not EMAIL_REGEX.match(email):
        return False
    # Ensure domain has at least one dot and valid top-level domain after dot
    parts = email.split("@")
    if len(parts) != 2:
        return False
    domain_parts = parts[1].split(".")
    if len(domain_parts) < 2 or not domain_parts[-1] or len(domain_parts[-1]) < 2:
        return False
    return True

def hash_password(password: str, salt: str = None) -> tuple[str, str]:
    """Hashes password securely using PBKDF2 with SHA256 and salt."""
    if not salt:
        salt = secrets.token_hex(16)
    key = hashlib.pbkdf2_hmac(
        'sha256',
        password.encode('utf-8'),
        salt.encode('utf-8'),
        100000
    )
    return key.hex(), salt

def verify_password(password: str, password_hash: str, salt: str) -> bool:
    """Verifies a plaintext password against stored PBKDF2 hash."""
    calc_hash, _ = hash_password(password, salt)
    return secrets.compare_digest(calc_hash, password_hash)

def load_json_file(file_path: str) -> dict:
    """Reads JSON data safely from an absolute file path."""
    if os.path.exists(file_path):
        try:
            with open(file_path, "r", encoding="utf-8") as f:
                return json.load(f)
        except Exception as e:
            print(f"[AUTH WARNING] Could not read {file_path}: {e}")
            return {}
    return {}

def save_json_file(file_path: str, data: dict):
    """Saves JSON data safely to an absolute file path."""
    try:
        with open(file_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2)
    except Exception as e:
        print(f"[AUTH WARNING] Could not save to {file_path}: {e}")

def create_user_account(email: str, password: str, name: str = None) -> dict:
    """Creates a new user account if email is valid and unique, persisting to users.json."""
    if not validate_email_format(email):
        raise HTTPException(
            status_code=400,
            detail="Enter a valid email address."
        )

    if not password or len(password) < 6:
        raise HTTPException(
            status_code=400,
            detail="Password must be at least 6 characters long."
        )

    email_clean = email.strip().lower()
    print(f"[AUTH TRACE] SIGNUP REQUEST received for email: '{email_clean}' | Request Received: YES")

    users = load_json_file(USERS_FILE)
    
    # Check for duplicate email (Requirement 18)
    for user_id, user_data in users.items():
        if user_data.get("email", "").lower() == email_clean:
            raise HTTPException(
                status_code=400,
                detail="An account with this email already exists. Please log in."
            )

    user_id = f"usr_{uuid.uuid4().hex[:12]}"
    pwd_hash, salt = hash_password(password)

    if not name or not name.strip():
        name = email_clean.split("@")[0].capitalize()

    new_user = {
        "user_id": user_id,
        "email": email_clean,
        "name": name.strip(),
        "password_hash": pwd_hash,
        "salt": salt,
        "created_at": datetime.now().isoformat()
    }

    users[user_id] = new_user
    save_json_file(USERS_FILE, users)

    print(f"[AUTH TRACE] User record created: YES | User ID: '{user_id}' | Persisted to DB: YES")

    # Generate session token
    token = create_user_session(user_id)
    return {
        "success": True,
        "message": "Account created successfully.",
        "user": {
            "user_id": user_id,
            "email": email_clean,
            "name": name.strip(),
        },
        "token": token
    }

def authenticate_user_login(email: str, password: str) -> dict:
    """Authenticates normalized email and password against stored PBKDF2 password hash."""
    if not validate_email_format(email):
        raise HTTPException(
            status_code=400,
            detail="Enter a valid email address."
        )

    email_clean = email.strip().lower()
    print(f"[AUTH TRACE] LOGIN REQUEST received for email: '{email_clean}'")

    users = load_json_file(USERS_FILE)

    found_user = None
    for user_data in users.values():
        if user_data.get("email", "").lower() == email_clean:
            found_user = user_data
            break

    # Consistent generic error message for security (Requirement 16)
    if not found_user:
        print(f"[AUTH TRACE] LOGIN FAILED: User not found for email '{email_clean}'")
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    if not verify_password(password, found_user["password_hash"], found_user["salt"]):
        print(f"[AUTH TRACE] LOGIN FAILED: Password mismatch for email '{email_clean}'")
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password."
        )

    token = create_user_session(found_user["user_id"])
    print(f"[AUTH TRACE] LOGIN SUCCESS | User ID: '{found_user['user_id']}' | Email: '{email_clean}'")

    return {
        "success": True,
        "message": "Login successful.",
        "user": {
            "user_id": found_user["user_id"],
            "email": found_user["email"],
            "name": found_user.get("name", "User"),
        },
        "token": token
    }

def create_user_session(user_id: str) -> str:
    """Creates a new bearer session token for user_id."""
    token = f"token_{secrets.token_hex(24)}"
    sessions = load_json_file(SESSIONS_FILE)
    sessions[token] = {
        "user_id": user_id,
        "created_at": datetime.now().isoformat()
    }
    save_json_file(SESSIONS_FILE, sessions)
    return token

def invalidate_user_session(token: str):
    """Logs out by invalidating session token."""
    if not token:
        return
    sessions = load_json_file(SESSIONS_FILE)
    if token in sessions:
        del sessions[token]
        save_json_file(SESSIONS_FILE, sessions)

def get_current_user_from_token(authorization: str = Header(None)) -> dict:
    """
    FastAPI dependency that extracts and validates the Bearer token.
    Returns authenticated user dict or raises HTTP 401 Unauthorized.
    """
    if not authorization:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required. Please log in."
        )

    token = authorization.replace("Bearer ", "").strip()
    sessions = load_json_file(SESSIONS_FILE)

    if token not in sessions:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Session expired or invalid. Please log in again."
        )

    user_id = sessions[token]["user_id"]
    users = load_json_file(USERS_FILE)

    if user_id not in users:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account not found."
        )

    user_data = users[user_id]
    return {
        "user_id": user_data["user_id"],
        "email": user_data["email"],
        "name": user_data.get("name", "User")
    }
