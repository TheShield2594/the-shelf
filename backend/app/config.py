from pydantic import field_validator
from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str = "postgresql+asyncpg://shelf:shelf_secret@localhost:5432/the_shelf"
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 60 * 24 * 7  # 1 week
    cors_origins: str = "http://localhost:3000"
    google_books_api_key: str | None = None
    cookie_secure: bool = False

    model_config = {"env_file": ".env"}

    @field_validator("cors_origins")
    @classmethod
    def _normalize_cors_origins(cls, value: str) -> str:
        origins = [origin.strip() for origin in value.split(",")]
        origins = [origin for origin in origins if origin]
        if not origins:
            raise ValueError("CORS_ORIGINS must contain at least one origin")
        return ",".join(origins)


settings = Settings()
