import json
import os
import uuid
from datetime import datetime, timedelta
from typing import Optional

from app.models.schemas import User, UserCreate, UserLogin

USERS_PATH = os.path.join(
    os.path.dirname(os.path.dirname(os.path.dirname(__file__))),
    "database", "users.json"
)

# JWT — set JWT_SECRET env var in backend/.env
JWT_SECRET = os.getenv("JWT_SECRET", "")
if not JWT_SECRET or JWT_SECRET == "dev-secret-change-in-production":
    import warnings
    warnings.warn(
        "JWT_SECRET is not set or using the default value. "
        "Set JWT_SECRET in backend/.env for production use."
    )
    JWT_SECRET = "dev-secret-change-in-production"
JWT_ALGORITHM = "HS256"
JWT_EXPIRY_DAYS = 7


def _load_users():
    if os.path.exists(USERS_PATH):
        with open(USERS_PATH, "r") as f:
            data = json.load(f)
            return data.get("users", [])
    return []


def _save_users(users):
    with open(USERS_PATH, "w") as f:
        json.dump({"users": users}, f, indent=2)


def _get_password_hash(password: str) -> str:
    """Hash a password using bcrypt."""
    import bcrypt
    return bcrypt.hashpw(password.encode(), bcrypt.gensalt()).decode()


def _verify_password(password: str, hashed: str) -> bool:
    """Verify a password against a bcrypt hash."""
    import bcrypt
    return bcrypt.checkpw(password.encode(), hashed.encode())


def _create_token(user_id: str) -> str:
    """Create a JWT token for a user."""
    from jose import jwt
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(days=JWT_EXPIRY_DAYS),
    }
    return jwt.encode(payload, JWT_SECRET, algorithm=JWT_ALGORITHM)


def register(data: UserCreate) -> tuple[User, str] | dict:
    """Register a new user. Returns (user, token) or error dict."""
    users = _load_users()

    # Check duplicate email
    if any(u["email"] == data.email for u in users):
        return {"error": "Email already registered"}

    user = {
        "id": str(uuid.uuid4()),
        "email": data.email,
        "password_hash": _get_password_hash(data.password),
        "name": data.name,
        "created_at": datetime.utcnow().isoformat(),
    }
    users.append(user)
    _save_users(users)

    # Return user without password_hash
    safe_user = User(**{k: v for k, v in user.items() if k != "password_hash"})
    token = _create_token(user["id"])
    return safe_user, token


def login(data: UserLogin) -> tuple[User, str] | dict:
    """Login a user. Returns (user, token) or error dict."""
    users = _load_users()

    for u in users:
        if u["email"] == data.email and _verify_password(data.password, u["password_hash"]):
            safe_user = User(**{k: v for k, v in u.items() if k != "password_hash"})
            token = _create_token(u["id"])
            return safe_user, token

    return {"error": "Invalid email or password"}


def get_user_by_id(user_id: str) -> Optional[User]:
    """Get a user by ID. Used by protected route dependencies."""
    users = _load_users()
    for u in users:
        if u["id"] == user_id:
            return User(**{k: v for k, v in u.items() if k != "password_hash"})
    return None
