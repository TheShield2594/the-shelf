"""
Initialize database with pgvector extension and run migrations.

Usage:
    python scripts/init_db.py
"""

import asyncio
import os
import sys
from pathlib import Path

# Add backend to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import text
from app.database import async_engine, Base


async def init_database():
    """Initialize database with extensions and tables."""
    print("🔧 Initializing database...")

    async with async_engine.begin() as conn:
        # 1. Enable pgvector extension
        print("📦 Enabling pgvector extension...")
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector;"))

        # Verify extension
        result = await conn.execute(
            text("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';")
        )
        row = result.fetchone()
        if row:
            print(f"✅ pgvector {row[1]} enabled")
        else:
            print("❌ Failed to enable pgvector")
            return False

        # 2. Create all tables
        print("📊 Creating tables...")
        await conn.run_sync(Base.metadata.create_all)
        print("✅ Tables created")

        # 3. Verify tables
        result = await conn.execute(
            text("""
                SELECT table_name
                FROM information_schema.tables
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """)
        )
        tables = [row[0] for row in result.fetchall()]

        print(f"\n📋 Created {len(tables)} tables:")
        for table in tables:
            print(f"   - {table}")

        # 4. Create triggers and functions
        print("\n🔨 Creating triggers and functions...")

        # Fingerprint update trigger
        await conn.execute(text("""
            CREATE OR REPLACE FUNCTION update_book_fingerprint()
            RETURNS TRIGGER AS $$
            BEGIN
                INSERT INTO book_fingerprints (
                    book_id,
                    avg_pace,
                    avg_emotional_impact,
                    avg_complexity,
                    avg_character_development,
                    avg_plot_quality,
                    avg_prose_style,
                    avg_originality,
                    star_equivalent,
                    total_ratings,
                    updated_at
                )
                SELECT
                    book_id,
                    AVG(pace)::DECIMAL(3,2),
                    AVG(emotional_impact)::DECIMAL(3,2),
                    AVG(complexity)::DECIMAL(3,2),
                    AVG(character_development)::DECIMAL(3,2),
                    AVG(plot_quality)::DECIMAL(3,2),
                    AVG(prose_style)::DECIMAL(3,2),
                    AVG(originality)::DECIMAL(3,2),
                    AVG(star_equivalent)::DECIMAL(3,2),
                    COUNT(*)::INTEGER,
                    CURRENT_TIMESTAMP
                FROM multi_dimensional_ratings
                WHERE book_id = COALESCE(NEW.book_id, OLD.book_id)
                GROUP BY book_id
                ON CONFLICT (book_id) DO UPDATE SET
                    avg_pace = EXCLUDED.avg_pace,
                    avg_emotional_impact = EXCLUDED.avg_emotional_impact,
                    avg_complexity = EXCLUDED.avg_complexity,
                    avg_character_development = EXCLUDED.avg_character_development,
                    avg_plot_quality = EXCLUDED.avg_plot_quality,
                    avg_prose_style = EXCLUDED.avg_prose_style,
                    avg_originality = EXCLUDED.avg_originality,
                    star_equivalent = EXCLUDED.star_equivalent,
                    total_ratings = EXCLUDED.total_ratings,
                    updated_at = EXCLUDED.updated_at;

                RETURN NEW;
            END;
            $$ LANGUAGE plpgsql;
        """))

        await conn.execute(text("""
            DROP TRIGGER IF EXISTS trigger_update_fingerprint_on_rating
            ON multi_dimensional_ratings;
        """))

        await conn.execute(text("""
            CREATE TRIGGER trigger_update_fingerprint_on_rating
                AFTER INSERT OR UPDATE OR DELETE ON multi_dimensional_ratings
                FOR EACH ROW
                EXECUTE FUNCTION update_book_fingerprint();
        """))

        print("✅ Triggers created")

    print("\n🎉 Database initialization complete!")
    print("\nNext steps:")
    print("  1. Run: python -m app.seed")
    print("  2. Start backend: uvicorn app.main:app --reload")
    return True


async def check_database():
    """Check database connection and extensions."""
    try:
        async with async_engine.connect() as conn:
            # Check PostgreSQL version
            result = await conn.execute(text("SELECT version();"))
            version = result.scalar()
            print(f"🗄️  PostgreSQL: {version.split(',')[0]}")

            # Check pgvector
            result = await conn.execute(
                text("SELECT extname, extversion FROM pg_extension WHERE extname = 'vector';")
            )
            row = result.fetchone()
            if row:
                print(f"📦 pgvector: {row[1]}")
            else:
                print("⚠️  pgvector not installed")

            return True
    except Exception as e:
        print(f"❌ Database connection failed: {e}")
        return False


async def main():
    """Main entry point."""
    print("=" * 60)
    print("🚀 The Shelf - Database Initialization")
    print("=" * 60)
    print()

    # Check database connection
    if not await check_database():
        print("\n❌ Failed to connect to database")
        print("Make sure DATABASE_URL is set correctly:")
        print(f"   {os.getenv('DATABASE_URL', 'Not set')}")
        sys.exit(1)

    print()

    # Initialize
    success = await init_database()

    if not success:
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
