"""
Router — Auth & User Management
JWT authentication + RBAC
"""
from datetime import datetime, timedelta
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from jose import JWTError, jwt
from passlib.context import CryptContext
from pydantic import BaseModel
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_analytics_db
from app.models.analytics.models import AppUser

router = APIRouter()

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")


class Token(BaseModel):
    access_token: str
    token_type: str = "Bearer"
    expires_in: int | None = 86400
    scope: str | None = "openid profile email read write"
    id_token: str | None = None
    user: dict | None = None


class UserCreate(BaseModel):
    username: str
    email: str
    password: str
    full_name: str
    role: str = "viewer"
    id_pegawai: str | None = None


def verify_password(plain_password: str, hashed_password: str) -> bool:
    return pwd_context.verify(plain_password, hashed_password)


def get_password_hash(password: str) -> str:
    return pwd_context.hash(password)


def create_access_token(data: dict) -> str:
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(minutes=settings.access_token_expire_minutes)
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)


def get_current_user(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_analytics_db),
) -> AppUser:
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Token tidak valid atau sudah expired",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception

    user = db.query(AppUser).filter_by(username=username, is_active=True).first()
    if not user:
        raise credentials_exception
    return user


CurrentUser = Annotated[AppUser, Depends(get_current_user)]


def require_roles(*roles: str):
    """Dependency untuk RBAC — contoh: require_roles('admin', 'manager')"""
    def checker(current_user: CurrentUser):
        if current_user.role not in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Akses ditolak. Role yang dibutuhkan: {', '.join(roles)}"
            )
        return current_user
    return checker


def forbid_roles(*roles: str, detail: str = "Akses ditolak. Anda tidak memiliki izin untuk modul ini."):
    """Dependency untuk memblokir role tertentu dari endpoint/router."""
    def checker(current_user: CurrentUser):
        if current_user.role in roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=detail
            )
        return current_user
    return checker


from fastapi import Request

@router.post("/token", response_model=Token)
async def login(
    request: Request,
    db: Session = Depends(get_analytics_db),
):
    try:
        content_type = request.headers.get("content-type", "")
        if "application/json" in content_type:
            data = await request.json()
        else:
            form = await request.form()
            data = dict(form)
    except Exception:
        data = {}

    grant_type = data.get("grant_type", "password")

    if grant_type == "authorization_code":
        code = data.get("code")
        code_verifier = data.get("code_verifier")
        from app.routers.oauth2_ui import get_and_consume_auth_code, verify_pkce
        code_data = get_and_consume_auth_code(code)
        if not code_data:
            raise HTTPException(status_code=401, detail="Invalid or expired authorization code")

        # Verify PKCE if a code challenge was stored
        code_challenge = code_data.get("code_challenge")
        if code_challenge:
            if not code_verifier or not verify_pkce(code_verifier, code_challenge):
                raise HTTPException(status_code=400, detail="Invalid PKCE code_verifier")

        username = code_data.get("username")
        user = db.query(AppUser).filter_by(username=username).first()
    else:
        # Default to password grant (Frontend Login)
        username = data.get("username")
        password = data.get("password")
        user = db.query(AppUser).filter_by(username=username).first()
        if not user or not verify_password(password, user.hashed_password):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Username atau password salah",
            )

    if not user or not user.is_active:
        raise HTTPException(status_code=400, detail="Akun tidak aktif")

    user.last_login = datetime.now()
    db.commit()

    access_token = create_access_token(data={"sub": user.username, "role": user.role})

    # Generate OpenID Connect ID Token for ChatGPT / OAuth clients
    client_id = data.get("client_id") or "chatgpt_mcp_client"
    id_token_payload = {
        "iss": "https://warehouse.pengajaran.com/mcp",
        "sub": user.username,
        "aud": client_id,
        "exp": datetime.utcnow() + timedelta(days=1),
        "iat": datetime.utcnow(),
        "name": user.full_name or user.username,
        "preferred_username": user.username,
        "email": user.email or f"{user.username}@pengajaran.com",
        "role": user.role,
    }
    id_token = jwt.encode(id_token_payload, settings.secret_key, algorithm=settings.algorithm)

    return Token(
        access_token=access_token,
        token_type="Bearer",
        expires_in=86400,
        scope="openid profile email read write",
        id_token=id_token,
        user={
            "username": user.username,
            "full_name": user.full_name,
            "role": user.role,
            "email": user.email or f"{user.username}@pengajaran.com",
        },
    )


@router.post("/register", status_code=201)
async def register(
    user_data: UserCreate,
    db: Session = Depends(get_analytics_db),
    _: AppUser = Depends(require_roles("admin")),
):
    """Hanya admin yang bisa buat user baru."""
    existing = db.query(AppUser).filter_by(username=user_data.username).first()
    if existing:
        raise HTTPException(status_code=400, detail="Username sudah ada")

    new_user = AppUser(
        username=user_data.username,
        email=user_data.email,
        full_name=user_data.full_name,
        hashed_password=get_password_hash(user_data.password),
        role=user_data.role,
        id_pegawai=user_data.id_pegawai,
    )
    db.add(new_user)
    db.commit()
    return {"message": "User berhasil dibuat", "username": user_data.username}


@router.get("/me")
async def get_me(current_user: CurrentUser):
    return {
        "username": current_user.username,
        "full_name": current_user.full_name,
        "email": current_user.email,
        "role": current_user.role,
        "id_pegawai": current_user.id_pegawai,
        "id_gudang_access": current_user.id_gudang_access,
        "last_login": current_user.last_login,
    }

