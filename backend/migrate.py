"""Run Alembic migrations, tolerating databases that already have the
pre-Alembic schema (created previously via Base.metadata.create_all)."""
import asyncio
import logging
import os
from sqlalchemy.engine import make_url

import asyncpg
from alembic import command
from alembic.config import Config

from app.config import settings

BASELINE_REVISION = "da97417e1312"  # initial schema migration

logger = logging.getLogger(__name__)

ALEMBIC_INI_PATH = os.path.join(os.path.dirname(os.path.abspath(__file__)), "alembic.ini")


async def _has_pre_alembic_schema() -> bool:
    dsn = make_url(settings.database_url).set(drivername="postgresql").render_as_string(
        hide_password=False
    )
    try:
        conn = await asyncpg.connect(dsn, timeout=10, command_timeout=10)
    except (asyncpg.PostgresError, OSError) as exc:
        logger.error("Could not connect to database to inspect schema: %s", exc)
        raise
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
    cfg = Config(ALEMBIC_INI_PATH)
    if asyncio.run(_has_pre_alembic_schema()):
        logger.info("Pre-Alembic schema detected; stamping baseline revision %s", BASELINE_REVISION)
        try:
            command.stamp(cfg, BASELINE_REVISION)
        except Exception:
            logger.exception("Failed to stamp baseline revision %s", BASELINE_REVISION)
            raise

    logger.info("Running Alembic migrations to head")
    try:
        command.upgrade(cfg, "head")
    except Exception:
        logger.exception("Failed to upgrade database to head")
        raise


if __name__ == "__main__":
    logging.basicConfig(level=logging.INFO)
    main()
