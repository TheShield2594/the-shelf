"""Run Alembic migrations, tolerating databases that already have the
pre-Alembic schema (created previously via Base.metadata.create_all)."""
import asyncio

import asyncpg
from alembic import command
from alembic.config import Config

from app.config import settings

BASELINE_REVISION = "da97417e1312"  # initial schema migration


async def _has_pre_alembic_schema() -> bool:
    dsn = settings.database_url.replace("postgresql+asyncpg://", "postgresql://")
    conn = await asyncpg.connect(dsn)
    try:
        has_version = await conn.fetchval(
            "SELECT to_regclass('public.alembic_version') IS NOT NULL"
        )
        has_badges = await conn.fetchval(
            "SELECT to_regclass('public.badges') IS NOT NULL"
        )
    finally:
        await conn.close()
    return not has_version and has_badges


def main() -> None:
    cfg = Config("alembic.ini")
    if asyncio.run(_has_pre_alembic_schema()):
        command.stamp(cfg, BASELINE_REVISION)
    command.upgrade(cfg, "head")


if __name__ == "__main__":
    main()
