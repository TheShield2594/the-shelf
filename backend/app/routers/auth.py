from fastapi import APIRouter, Depends, HTTPException, Response, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.user import User
from ..models.user_book import UserBook
from ..models.review import Review
from ..schemas.user import UserCreate, UserLogin, UserOut, UserProfile, PasswordChange, EmailChange
from ..auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_current_user,
    set_auth_cookie,
    clear_auth_cookie,
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    existing = await db.execute(
        select(User).where((User.username == data.username) | (User.email == data.email))
    )
    if existing.scalar_one_or_none():
        raise HTTPException(status_code=400, detail="Username or email already taken")

    user = User(
        username=data.username,
        email=data.email,
        password_hash=hash_password(data.password),
    )
    db.add(user)
    await db.commit()
    await db.refresh(user)
    return user


@router.post("/login", response_model=UserOut)
async def login(data: UserLogin, response: Response, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id)})
    set_auth_cookie(response, token)
    return user


@router.post("/logout", status_code=204)
async def logout(response: Response):
    clear_auth_cookie(response)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user


@router.get("/profile", response_model=UserProfile)
async def profile(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    status_result = await db.execute(
        select(UserBook.status, func.count())
        .where(UserBook.user_id == user.id)
        .group_by(UserBook.status)
    )
    counts = dict(status_result.all())

    review_count = await db.execute(
        select(func.count()).where(Review.user_id == user.id)
    )

    return UserProfile(
        id=user.id,
        username=user.username,
        created_at=user.created_at,
        books_read=counts.get("finished", 0),
        currently_reading=counts.get("currently_reading", 0),
        want_to_read=counts.get("want_to_read", 0),
        dnf=counts.get("dnf", 0),
        reviews_count=review_count.scalar(),
    )


@router.put("/password", status_code=204)
async def change_password(
    data: PasswordChange,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    user.password_hash = hash_password(data.new_password)
    await db.commit()


@router.put("/email", response_model=UserOut)
async def change_email(
    data: EmailChange,
    user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db),
):
    if not verify_password(data.current_password, user.password_hash):
        raise HTTPException(status_code=401, detail="Current password is incorrect")
    existing = await db.execute(select(User).where(User.email == data.new_email))
    other = existing.scalar_one_or_none()
    if other and other.id != user.id:
        raise HTTPException(status_code=400, detail="Email already in use")
    user.email = data.new_email
    await db.commit()
    await db.refresh(user)
    return user
