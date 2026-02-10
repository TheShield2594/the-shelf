from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..database import get_db
from ..models.user import User
from ..models.user_book import UserBook
from ..models.review import Review
from ..schemas.user import UserCreate, UserLogin, UserOut, Token, UserProfile
from ..auth import hash_password, verify_password, create_access_token, get_current_user

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


@router.post("/login", response_model=Token)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(User).where(User.username == data.username))
    user = result.scalar_one_or_none()
    if not user or not verify_password(data.password, user.password_hash):
        raise HTTPException(status_code=401, detail="Invalid credentials")

    token = create_access_token({"sub": str(user.id)})
    return Token(access_token=token)


@router.get("/me", response_model=UserOut)
async def me(user: User = Depends(get_current_user)):
    return user


@router.get("/profile", response_model=UserProfile)
async def profile(user: User = Depends(get_current_user), db: AsyncSession = Depends(get_db)):
    counts = {}
    for status_val in ["finished", "currently_reading", "want_to_read", "dnf"]:
        result = await db.execute(
            select(func.count()).where(
                UserBook.user_id == user.id, UserBook.status == status_val
            )
        )
        counts[status_val] = result.scalar()

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
