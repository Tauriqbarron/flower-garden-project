import os
from typing import Optional

from fastapi import APIRouter, Depends, Header, HTTPException
from jose import jwt, JWTError

from app.models.schemas import UserCreate, UserLogin, User
from app.services.auth_service import register, login, get_user_by_id

router = APIRouter(prefix="/api/auth", tags=["auth"])


# ── JWT dependency ────────────────────────────────────────────────────────────

JWT_SECRET = os.getenv("JWT_SECRET", "dev-secret-change-in-production")
JWT_ALGORITHM = "HS256"


async def get_current_user(
    authorization: Optional[str] = Header(None)
) -> User:
    """FastAPI dependency — extract and validate JWT from Authorization header."""
    if not authorization or not authorization.startswith("Bearer "):
        raise HTTPException(status_code=401, detail="Missing or invalid authorization header")
    token = authorization.replace("Bearer ", "")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=[JWT_ALGORITHM])
        user_id = payload.get("sub")
        if not user_id:
            raise HTTPException(status_code=401, detail="Invalid token")
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid or expired token")

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")
    return user


# ── Routes ──────────────────────────────────────────────────────────────────

@router.post("/register")
def register_route(data: UserCreate):
    """Register a new user. Returns {user, token}."""
    result = register(data)
    if "error" in result:
        raise HTTPException(status_code=400, detail=result["error"])
    user, token = result
    return {"user": user, "token": token}


@router.post("/login")
def login_route(data: UserLogin):
    """Login with email + password. Returns {user, token}."""
    result = login(data)
    if "error" in result:
        raise HTTPException(status_code=401, detail=result["error"])
    user, token = result
    return {"user": user, "token": token}


@router.get("/me")
def me_route(current_user: User = Depends(get_current_user)):
    """Get the current authenticated user."""
    return current_user
