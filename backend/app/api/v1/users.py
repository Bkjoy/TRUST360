from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from app.core.database import get_db
from app.core.security import get_password_hash
from app.models.user import User, UserRole
from app.schemas.user import UserCreate, UserResponse, UserUpdate
from app.api.deps import get_current_user, require_roles
from app.services.audit_service import AuditService

router = APIRouter(prefix="/users", tags=["Users"])

@router.get("", response_model=List[UserResponse])
def list_users(
    role: Optional[str] = None,
    institution_id: Optional[str] = None,
    current_user: User = Depends(require_roles([UserRole.APPROVING_AUTHORITY, UserRole.SCRUTINY_OFFICER])),
    db: Session = Depends(get_db)
):
    query = db.query(User)
    if role:
        query = query.filter(User.role == role)
    if institution_id:
        query = query.filter(User.institution_id == institution_id)
    return query.order_by(User.created_at.desc()).all()

@router.post("", response_model=UserResponse)
def create_user(
    req: UserCreate,
    current_user: User = Depends(require_roles([UserRole.APPROVING_AUTHORITY])),
    db: Session = Depends(get_db)
):
    existing = db.query(User).filter(User.email == req.email.lower().strip()).first()
    if existing:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="User with this email already exists")

    new_user = User(
        email=req.email.lower().strip(),
        hashed_password=get_password_hash(req.password),
        full_name=req.full_name,
        role=req.role,
        designation=req.designation,
        phone=req.phone,
        institution_id=req.institution_id,
        is_active=req.is_active
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    AuditService.log_event(
        db=db,
        actor_id=current_user.id,
        actor_email=current_user.email,
        actor_role=current_user.role,
        action="CREATE_USER",
        entity_type="USER",
        entity_id=new_user.id,
        after_state={"email": new_user.email, "role": new_user.role}
    )

    return new_user

@router.put("/{user_id}", response_model=UserResponse)
def update_user(
    user_id: str,
    req: UserUpdate,
    current_user: User = Depends(require_roles([UserRole.APPROVING_AUTHORITY])),
    db: Session = Depends(get_db)
):
    target = db.query(User).filter(User.id == user_id).first()
    if not target:
        raise HTTPException(status_code=404, detail="User not found")

    if req.full_name is not None:
        target.full_name = req.full_name
    if req.designation is not None:
        target.designation = req.designation
    if req.phone is not None:
        target.phone = req.phone
    if req.is_active is not None:
        target.is_active = req.is_active
    if req.password:
        target.hashed_password = get_password_hash(req.password)

    db.commit()
    db.refresh(target)
    return target
