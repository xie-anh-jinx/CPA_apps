"""
CPA MCP — User Authentication & Identity Context
Resolves user credentials, tokens, roles, and session state.
"""
from dataclasses import dataclass, field
from typing import Optional, List, Tuple
from jose import JWTError, jwt
from passlib.context import CryptContext
from sqlalchemy.orm import Session

from app.config import settings
from app.models.analytics.models import AppUser

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


@dataclass
class MCPUser:
    """Represents the active user context for an MCP connection/session."""
    username: str = "guest"
    role: str = "viewer"
    email: Optional[str] = None
    id_pegawai: Optional[str] = None
    id_gudang_access: Optional[str] = None
    is_authenticated: bool = False
    accessible_warehouses: List[str] = field(default_factory=list)

    def __post_init__(self):
        if self.id_gudang_access:
            self.accessible_warehouses = [
                g.strip() for g in self.id_gudang_access.split(",") if g.strip()
            ]

    @property
    def is_admin(self) -> bool:
        return self.role == "admin"

    @property
    def is_manager(self) -> bool:
        return self.role in ("admin", "manager")

    @property
    def is_sales(self) -> bool:
        return self.role in ("sales", "sales_rep")

    @property
    def is_warehouse(self) -> bool:
        return self.role in ("warehouse", "warehouse_staff")

    @property
    def is_finance(self) -> bool:
        return self.role in ("finance_manager", "ar_staff", "credit_control")

    def to_dict(self) -> dict:
        return {
            "username": self.username,
            "role": self.role,
            "email": self.email,
            "id_pegawai": self.id_pegawai,
            "is_authenticated": self.is_authenticated,
            "accessible_warehouses_count": len(self.accessible_warehouses)
        }


def verify_password(plain_password: str, hashed_password: str) -> bool:
    try:
        return pwd_context.verify(plain_password, hashed_password)
    except Exception:
        return False


def get_user_from_db(username: str, db: Session) -> Optional[AppUser]:
    return db.query(AppUser).filter_by(username=username, is_active=True).first()


def authenticate_credentials(username: str, password: str, db: Session) -> Tuple[bool, Optional[MCPUser], str]:
    """Authenticates username and password directly from analytics.users."""
    user = get_user_from_db(username, db)
    if not user:
        return False, None, "User not found or inactive"
    if not verify_password(password, user.hashed_password):
        return False, None, "Invalid password"

    mcp_user = MCPUser(
        username=user.username,
        role=user.role or "viewer",
        email=user.email,
        id_pegawai=user.id_pegawai,
        id_gudang_access=user.id_gudang_access,
        is_authenticated=True
    )
    return True, mcp_user, "Authentication successful"


def authenticate_jwt(token: str, db: Session) -> Tuple[bool, Optional[MCPUser], str]:
    """Authenticates JWT Bearer token."""
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
        username: str = payload.get("sub")
        if not username:
            return False, None, "Invalid token claims"
    except JWTError as e:
        return False, None, f"JWT verification failed: {str(e)}"

    user = get_user_from_db(username, db)
    if not user:
        return False, None, "User corresponding to token not found or inactive"

    mcp_user = MCPUser(
        username=user.username,
        role=user.role or "viewer",
        email=user.email,
        id_pegawai=user.id_pegawai,
        id_gudang_access=user.id_gudang_access,
        is_authenticated=True
    )
    return True, mcp_user, "Token verified"


def create_role_user(role: str, username: str = None, id_pegawai: str = None, id_gudang_access: str = None) -> MCPUser:
    """Creates a user context with a specified role (for stdio/cli or dev testing)."""
    return MCPUser(
        username=username or f"user_{role}",
        role=role,
        id_pegawai=id_pegawai,
        id_gudang_access=id_gudang_access,
        is_authenticated=True
    )
