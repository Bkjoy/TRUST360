from typing import Generator, List, Optional
from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import decode_access_token
from app.core.exceptions import ForbiddenException, UnauthorizedException
from app.models.user import User, UserRole

bearer_scheme = HTTPBearer(auto_error=False)

def get_current_user(
    token_auth: Optional[HTTPAuthorizationCredentials] = Depends(bearer_scheme),
    db: Session = Depends(get_db)
) -> User:
    if not token_auth:
        raise UnauthorizedException("Authentication token required")
    
    payload = decode_access_token(token_auth.credentials)
    if not payload or not payload.get("sub"):
        raise UnauthorizedException("Invalid or expired authentication token")
    
    user_id = payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise UnauthorizedException("User associated with token no longer exists")
    if not user.is_active:
        raise ForbiddenException("User account is inactive")
    
    return user

def require_roles(allowed_roles: List[str]):
    def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role not in allowed_roles:
            raise ForbiddenException(f"Role '{current_user.role}' is not authorized to perform this operation. Allowed: {allowed_roles}")
        return current_user
    return role_checker

def verify_institution_access(institution_id: str, current_user: User) -> None:
    """
    Guarantees strict multi-tenant institutional isolation.
    Officers and Admins can view any institution; Institution Admins can ONLY view their own.
    """
    if current_user.role == UserRole.INSTITUTION_ADMIN:
        if str(current_user.institution_id) != str(institution_id):
            raise ForbiddenException("Access denied: You cannot access or modify records of another institution")
