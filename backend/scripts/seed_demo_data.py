"""
Seed database with demo data for testing multi-dimensional ratings.

Usage:
    python scripts/seed_demo_data.py
"""

import asyncio
import sys
from pathlib import Path

# Add backend to Python path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import select
from app.database import get_db
from app.models.book import Book, Genre, BookGenre
from app.models.user import User
from app.models.multi_dimensional_rating import MultiDimensionalRating
from app.auth import get_password_hash


# Demo books with interesting fingerprints
DEMO_BOOKS = [
    {
        "title": "The Night Circus",
        "author": "Erin Morgenstern",
        "isbn": "9780307744432",
        "description": "A mesmerizing tale of two young illusionists pitted against each other in a magical competition.",
        "genres": ["Fantasy", "Fiction", "Romance"],
        "ratings": [
            # Slow-paced, beautiful prose, high emotion
            {"pace": 2, "emotional_impact": 5, "complexity": 3, "character_development": 4,
             "plot_quality": 4, "prose_style": 5, "originality": 4},
            {"pace": 2, "emotional_impact": 4, "complexity": 3, "character_development": 5,
             "plot_quality": 3, "prose_style": 5, "originality": 5},
            {"pace": 3, "emotional_impact": 5, "complexity": 2, "character_development": 4,
             "plot_quality": 4, "prose_style": 5, "originality": 4},
        ]
    },
    {
        "title": "The Martian",
        "author": "Andy Weir",
        "isbn": "9780553418026",
        "description": "An astronaut becomes one of the first people to walk on Mars. Now, he's sure he'll be the first person to die there.",
        "genres": ["Science Fiction", "Thriller"],
        "ratings": [
            # Fast-paced, moderate emotion, high plot
            {"pace": 5, "emotional_impact": 3, "complexity": 4, "character_development": 3,
             "plot_quality": 5, "prose_style": 3, "originality": 4},
            {"pace": 5, "emotional_impact": 4, "complexity": 3, "character_development": 4,
             "plot_quality": 5, "prose_style": 3, "originality": 4},
            {"pace": 4, "emotional_impact": 3, "complexity": 4, "character_development": 3,
             "plot_quality": 5, "prose_style": 4, "originality": 5},
        ]
    },
    {
        "title": "All the Light We Cannot See",
        "author": "Anthony Doerr",
        "isbn": "9781476746586",
        "description": "A blind French girl and a German boy's paths collide in occupied France as both try to survive World War II.",
        "genres": ["Fiction", "Historical Fiction"],
        "ratings": [
            # Slow-paced, very high emotion, beautiful prose
            {"pace": 2, "emotional_impact": 5, "complexity": 3, "character_development": 5,
             "plot_quality": 4, "prose_style": 5, "originality": 4},
            {"pace": 2, "emotional_impact": 5, "complexity": 4, "character_development": 5,
             "plot_quality": 4, "prose_style": 5, "originality": 3},
            {"pace": 1, "emotional_impact": 5, "complexity": 3, "character_development": 5,
             "plot_quality": 4, "prose_style": 5, "originality": 4},
        ]
    },
    {
        "title": "Recursion",
        "author": "Blake Crouch",
        "isbn": "9781524759780",
        "description": "A mind-bending thriller about memory, time, and reality itself.",
        "genres": ["Science Fiction", "Thriller"],
        "ratings": [
            # Very fast, high complexity, strong plot
            {"pace": 5, "emotional_impact": 4, "complexity": 5, "character_development": 4,
             "plot_quality": 5, "prose_style": 4, "originality": 5},
            {"pace": 5, "emotional_impact": 5, "complexity": 5, "character_development": 3,
             "plot_quality": 5, "prose_style": 3, "originality": 5},
            {"pace": 5, "emotional_impact": 4, "complexity": 4, "character_development": 4,
             "plot_quality": 5, "prose_style": 4, "originality": 5},
        ]
    },
    {
        "title": "The Book Thief",
        "author": "Markus Zusak",
        "isbn": "9780375842207",
        "description": "Death tells the story of Liesel, a young girl living in Nazi Germany who steals books and shares them.",
        "genres": ["Fiction", "Historical Fiction", "Young Adult"],
        "ratings": [
            # Moderate pace, devastating emotion, unique prose
            {"pace": 3, "emotional_impact": 5, "complexity": 3, "character_development": 5,
             "plot_quality": 4, "prose_style": 5, "originality": 5},
            {"pace": 2, "emotional_impact": 5, "complexity": 2, "character_development": 5,
             "plot_quality": 4, "prose_style": 5, "originality": 5},
            {"pace": 3, "emotional_impact": 5, "complexity": 3, "character_development": 5,
             "plot_quality": 5, "prose_style": 5, "originality": 4},
        ]
    },
    {
        "title": "Project Hail Mary",
        "author": "Andy Weir",
        "isbn": "9780593135204",
        "description": "A lone astronaut must save humanity in this gripping science fiction thriller.",
        "genres": ["Science Fiction", "Thriller"],
        "ratings": [
            # Fast, fun, high plot quality
            {"pace": 5, "emotional_impact": 4, "complexity": 3, "character_development": 4,
             "plot_quality": 5, "prose_style": 4, "originality": 5},
            {"pace": 5, "emotional_impact": 4, "complexity": 4, "character_development": 3,
             "plot_quality": 5, "prose_style": 3, "originality": 5},
            {"pace": 4, "emotional_impact": 5, "complexity": 3, "character_development": 4,
             "plot_quality": 5, "prose_style": 4, "originality": 4},
        ]
    },
]


async def seed_demo_data():
    """Seed database with demo data."""
    print("🌱 Seeding demo data...")
    print()

    async for db in get_db():
        # 1. Create demo users
        print("👤 Creating demo users...")
        demo_user = User(
            username="demo",
            email="demo@theshelf.app",
            hashed_password=get_password_hash("demo1234"),
            display_name="Demo User"
        )
        db.add(demo_user)

        # Additional users for ratings
        user2 = User(
            username="reader2",
            email="reader2@theshelf.app",
            hashed_password=get_password_hash("password"),
        )
        user3 = User(
            username="reader3",
            email="reader3@theshelf.app",
            hashed_password=get_password_hash("password"),
        )
        db.add_all([user2, user3])
        await db.commit()
        print(f"✅ Created 3 users (demo, reader2, reader3)")

        # 2. Create genres
        print("\n📚 Creating genres...")
        genre_names = ["Fiction", "Science Fiction", "Fantasy", "Thriller",
                      "Romance", "Historical Fiction", "Young Adult"]

        genres = {}
        for name in genre_names:
            genre = Genre(name=name)
            db.add(genre)
            genres[name] = genre

        await db.commit()
        print(f"✅ Created {len(genres)} genres")

        # 3. Create books with ratings
        print("\n📖 Creating books with multi-dimensional ratings...")
        users = [demo_user, user2, user3]

        for book_data in DEMO_BOOKS:
            # Create book
            book = Book(
                title=book_data["title"],
                author=book_data["author"],
                isbn=book_data.get("isbn"),
                description=book_data.get("description"),
            )
            db.add(book)
            await db.flush()  # Get book.id

            # Add genres
            for genre_name in book_data["genres"]:
                book_genre = BookGenre(
                    book_id=book.id,
                    genre_id=genres[genre_name].id
                )
                db.add(book_genre)

            # Add ratings from different users
            for i, rating_data in enumerate(book_data["ratings"]):
                rating = MultiDimensionalRating(
                    user_id=users[i].id,
                    book_id=book.id,
                    **rating_data
                )
                db.add(rating)

            print(f"   ✅ {book.title} by {book.author}")
            print(f"      - Genres: {', '.join(book_data['genres'])}")
            print(f"      - Ratings: {len(book_data['ratings'])}")

        await db.commit()

        print(f"\n✅ Created {len(DEMO_BOOKS)} books with ratings")

        # 4. Verify fingerprints were created
        print("\n🔍 Verifying book fingerprints...")
        from app.models.multi_dimensional_rating import BookFingerprint

        result = await db.execute(
            select(BookFingerprint).filter(BookFingerprint.total_ratings > 0)
        )
        fingerprints = result.scalars().all()

        print(f"✅ {len(fingerprints)} book fingerprints created automatically")

        if fingerprints:
            print("\n📊 Sample fingerprint:")
            fp = fingerprints[0]
            print(f"   Book ID: {fp.book_id}")
            print(f"   Pace: {fp.avg_pace}")
            print(f"   Emotional Impact: {fp.avg_emotional_impact}")
            print(f"   Complexity: {fp.avg_complexity}")
            print(f"   Character: {fp.avg_character_development}")
            print(f"   Plot: {fp.avg_plot_quality}")
            print(f"   Prose: {fp.avg_prose_style}")
            print(f"   Originality: {fp.avg_originality}")
            print(f"   ⭐ Star Equivalent: {fp.star_equivalent}")
            print(f"   Total Ratings: {fp.total_ratings}")

        print("\n🎉 Demo data seeded successfully!")
        print("\n📝 Demo credentials:")
        print("   Username: demo")
        print("   Password: demo1234")

        break  # Exit generator


async def main():
    """Main entry point."""
    print("=" * 60)
    print("🌱 The Shelf - Demo Data Seeder")
    print("=" * 60)
    print()

    try:
        await seed_demo_data()
    except Exception as e:
        print(f"\n❌ Seeding failed: {e}")
        import traceback
        traceback.print_exc()
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())
