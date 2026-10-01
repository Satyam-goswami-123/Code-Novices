from datetime import datetime, timedelta, timezone
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
from passlib.context import CryptContext
from .config import settings
from .db import get_conn

pwd = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2 = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

ROLE_PERMS = {
    "admin":        {"chat","networks","hotspots","trends","predict","export","audit","users"},
    "investigator": {"chat","networks","hotspots","trends","predict","export"},
    "analyst":      {"chat","networks","hotspots","trends","predict","export"},
    "viewer":       {"chat","hotspots","trends","export"},
}

def verify_password(p, h): return pwd.verify(p, h)
def hash_password(p): return pwd.hash(p)

def create_token(user: dict) -> str:
    payload = {
        "sub": user["username"],
        "uid": user["id"],
        "role": user["role"],
        "exp": datetime.now(timezone.utc) + timedelta(minutes=settings.JWT_EXPIRES_MIN),
    }
    return jwt.encode(payload, settings.JWT_SECRET, algorithm=settings.JWT_ALGORITHM)

def authenticate(username: str, password: str):
    conn = get_conn()
    try:
        row = conn.execute("SELECT * FROM users WHERE username=?", (username,)).fetchone()
        if not row: return None
        if not verify_password(password, row["password_hash"]): return None
        return dict(row)
    finally:
        conn.close()

def current_user(token: str = Depends(oauth2)) -> dict:
    try:
        payload = jwt.decode(token, settings.JWT_SECRET, algorithms=[settings.JWT_ALGORITHM])
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")
    return {"id": payload["uid"], "username": payload["sub"], "role": payload["role"]}

def require(perm: str):
    def dep(user: dict = Depends(current_user)):
        if perm not in ROLE_PERMS.get(user["role"], set()):
            raise HTTPException(status_code=403, detail=f"Role '{user['role']}' lacks '{perm}'")
        return user
    return dep
