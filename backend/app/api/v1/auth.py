from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import create_access_token, verify_password
from app.models.user import User, UserRole
from app.models.institution import Institution
from app.schemas.auth import LoginRequest, Token, PasswordResetRequest
from app.schemas.user import UserResponse
from app.api.deps import get_current_user
from app.services.audit_service import AuditService

router = APIRouter(prefix="/auth", tags=["Authentication"])

@router.post("/login", response_model=Token)
def login(request: LoginRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == request.email.lower().strip()).first()
    if not user or not verify_password(request.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account is inactive. Contact AICTE administrator."
        )

    # Only Institute Admin, Scrutiny Officer, and Competent Authority are permitted to log in
    allowed_roles = [UserRole.INSTITUTION_ADMIN, UserRole.SCRUTINY_OFFICER, UserRole.APPROVING_AUTHORITY]
    if user.role not in allowed_roles:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted: Only Institute Admin, Scrutiny Officer, and Competent Authority can access the TRUST portal."
        )

    # Update last login
    user.last_login = datetime.now(timezone.utc)
    db.commit()

    token = create_access_token(
        subject=user.id,
        role=user.role,
        institution_id=user.institution_id
    )

    inst_name = None
    if user.institution_id:
        inst = db.query(Institution).filter(Institution.id == user.institution_id).first()
        if inst:
            inst_name = inst.name

    AuditService.log_event(
        db=db,
        actor_id=user.id,
        actor_email=user.email,
        actor_role=user.role,
        action="USER_LOGIN",
        entity_type="USER",
        entity_id=user.id
    )

    return Token(
        access_token=token,
        token_type="bearer",
        expires_in=60 * 12 * 60,
        user_id=user.id,
        email=user.email,
        full_name=user.full_name,
        role=user.role,
        institution_id=user.institution_id,
        institution_name=inst_name
    )

@router.get("/me", response_model=UserResponse)
def get_current_user_profile(current_user: User = Depends(get_current_user), db: Session = Depends(get_db)):
    inst_name = None
    if current_user.institution_id:
        inst = db.query(Institution).filter(Institution.id == current_user.institution_id).first()
        if inst:
            inst_name = inst.name
    
    resp = UserResponse.model_validate(current_user)
    resp.institution_name = inst_name
    return resp

@router.post("/forgot-password")
def forgot_password(req: PasswordResetRequest, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == req.email.lower().strip()).first()
    # Always return success to prevent email enumeration attacks
    return {"message": "If this email exists in the system, password recovery instructions have been dispatched."}
