from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://shelf:shelf_secret@localhost:5432/the_shelf"
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 1 week
    cors_origins: str = "http://localhost:3000"
    google_books_api_key: str | None = None
    nyt_books_api_key: str | None = None
    cookie_secure: bool = False

    # Password reset email. If smtp_host is unset, password reset requests
    # are accepted but no email is sent (logged server-side instead).
    smtp_host: str | None = None
    smtp_port: int = 587
    smtp_user: str | None = None
    smtp_password: str | None = None
    smtp_from: str = "no-reply@the-shelf.local"
    smtp_use_tls: bool = True
    frontend_base_url: str = "http://localhost:3000"
    password_reset_expire_minutes: int = 30

    model_config = {"env_file": ".env"}

    @field_validator("password_reset_expire_minutes")
    @classmethod
    def _validate_password_reset_expire_minutes(cls, value: int) -> int:
        if value <= 0:
            raise ValueError("PASSWORD_RESET_EXPIRE_MINUTES must be greater than 0")
        return value

    @field_validator("cors_origins")
    @classmethod
    def _normalize_cors_origins(cls, value: str) -> str:
        origins = [origin.strip() for origin in value.split(",")]
        origins = [origin for origin in origins if origin]
        if not origins:
            raise ValueError("CORS_ORIGINS must contain at least one origin")
        return ",".join(origins)


settings = Settings()
