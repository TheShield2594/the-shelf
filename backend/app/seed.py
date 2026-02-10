"""Seed database with sample data. Run with: python -m app.seed"""
import asyncio
from datetime import date

from sqlalchemy import select

from .database import engine, async_session, Base
from .models import Book, Genre, User, UserBook, Review, ContentRating, RelatedBook
from .auth import hash_password

GENRES = [
    "Fantasy", "Science Fiction", "Mystery", "Thriller", "Romance",
    "Historical Fiction", "Literary Fiction", "Horror", "Non-Fiction",
    "Biography", "Self-Help", "Young Adult", "Dystopian", "Adventure",
    "Philosophy",
]

BOOKS = [
    {
        "title": "The Name of the Wind",
        "author": "Patrick Rothfuss",
        "isbn": "9780756404741",
        "description": "Told in Kvothe's own voice, this is the tale of the magically gifted young man who grows to be the most notorious wizard his world has ever seen.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780756404741-L.jpg",
        "publication_date": date(2007, 3, 27),
        "genres": ["Fantasy", "Adventure"],
    },
    {
        "title": "Dune",
        "author": "Frank Herbert",
        "isbn": "9780441013593",
        "description": "Set on the desert planet Arrakis, Dune is the story of the boy Paul Atreides, heir to a noble family tasked with ruling an inhospitable world.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780441013593-L.jpg",
        "publication_date": date(1965, 8, 1),
        "genres": ["Science Fiction", "Adventure"],
    },
    {
        "title": "Project Hail Mary",
        "author": "Andy Weir",
        "isbn": "9780593135204",
        "description": "Ryland Grace is the sole survivor on a desperate, last-chance mission—and if he can't figure out what he's doing, humanity and the earth itself are finished.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780593135204-L.jpg",
        "publication_date": date(2021, 5, 4),
        "genres": ["Science Fiction", "Adventure"],
    },
    {
        "title": "The Silent Patient",
        "author": "Alex Michaelides",
        "isbn": "9781250301697",
        "description": "Alicia Berenson's life is seemingly perfect until one evening she shoots her husband five times and never speaks another word.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9781250301697-L.jpg",
        "publication_date": date(2019, 2, 5),
        "genres": ["Thriller", "Mystery"],
    },
    {
        "title": "Circe",
        "author": "Madeline Miller",
        "isbn": "9780316556347",
        "description": "In the house of Helios, god of the sun, a daughter is born. Circe is a strange child—not powerful like her father, nor viciously alluring like her mother.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780316556347-L.jpg",
        "publication_date": date(2018, 4, 10),
        "genres": ["Fantasy", "Historical Fiction", "Literary Fiction"],
    },
    {
        "title": "The Hobbit",
        "author": "J.R.R. Tolkien",
        "isbn": "9780547928227",
        "description": "Bilbo Baggins is a hobbit who enjoys a comfortable, unambitious life, rarely traveling any farther than his pantry or cellar.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780547928227-L.jpg",
        "publication_date": date(1937, 9, 21),
        "genres": ["Fantasy", "Adventure"],
    },
    {
        "title": "Gone Girl",
        "author": "Gillian Flynn",
        "isbn": "9780307588371",
        "description": "On a warm summer morning in North Carthage, Missouri, it is Nick and Amy Dunne's fifth wedding anniversary.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780307588371-L.jpg",
        "publication_date": date(2012, 6, 5),
        "genres": ["Thriller", "Mystery"],
    },
    {
        "title": "Educated",
        "author": "Tara Westover",
        "isbn": "9780399590504",
        "description": "A memoir about a young girl who, kept out of school, leaves her survivalist family and goes on to earn a PhD from Cambridge University.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780399590504-L.jpg",
        "publication_date": date(2018, 2, 20),
        "genres": ["Non-Fiction", "Biography"],
    },
    {
        "title": "The Martian",
        "author": "Andy Weir",
        "isbn": "9780553418026",
        "description": "Six days ago, astronaut Mark Watney became one of the first people to walk on Mars. Now, he's sure he'll be the first person to die there.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780553418026-L.jpg",
        "publication_date": date(2014, 2, 11),
        "genres": ["Science Fiction", "Adventure"],
    },
    {
        "title": "1984",
        "author": "George Orwell",
        "isbn": "9780451524935",
        "description": "Among the seminal texts of the 20th century, Nineteen Eighty-Four is a rare work that grows more haunting as its dystopian proscriptions have become reality.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780451524935-L.jpg",
        "publication_date": date(1949, 6, 8),
        "genres": ["Dystopian", "Science Fiction", "Literary Fiction"],
    },
    {
        "title": "Atomic Habits",
        "author": "James Clear",
        "isbn": "9780735211292",
        "description": "An easy and proven way to build good habits and break bad ones with tiny changes that deliver remarkable results.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780735211292-L.jpg",
        "publication_date": date(2018, 10, 16),
        "genres": ["Non-Fiction", "Self-Help"],
    },
    {
        "title": "The Great Gatsby",
        "author": "F. Scott Fitzgerald",
        "isbn": "9780743273565",
        "description": "The story of the mysteriously wealthy Jay Gatsby and his love for the beautiful Daisy Buchanan.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780743273565-L.jpg",
        "publication_date": date(1925, 4, 10),
        "genres": ["Literary Fiction"],
    },
    {
        "title": "The Hunger Games",
        "author": "Suzanne Collins",
        "isbn": "9780439023481",
        "description": "In the ruins of a place once known as North America lies the nation of Panem, a shining Capitol surrounded by twelve outlying districts.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780439023481-L.jpg",
        "publication_date": date(2008, 9, 14),
        "genres": ["Young Adult", "Dystopian", "Science Fiction"],
    },
    {
        "title": "Mexican Gothic",
        "author": "Silvia Moreno-Garcia",
        "isbn": "9780525620785",
        "description": "After receiving a frantic letter from her newlywed cousin begging for someone to save her from a mysterious doom, Noemí Taboada heads to High Place.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780525620785-L.jpg",
        "publication_date": date(2020, 6, 30),
        "genres": ["Horror", "Historical Fiction"],
    },
    {
        "title": "Sapiens",
        "author": "Yuval Noah Harari",
        "isbn": "9780062316097",
        "description": "A brief history of humankind exploring how Homo sapiens came to dominate the Earth.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780062316097-L.jpg",
        "publication_date": date(2015, 2, 10),
        "genres": ["Non-Fiction", "Philosophy"],
    },
    {
        "title": "Pride and Prejudice",
        "author": "Jane Austen",
        "isbn": "9780141439518",
        "description": "The story follows the main character, Elizabeth Bennet, as she deals with issues of manners, upbringing, morality, and marriage.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780141439518-L.jpg",
        "publication_date": date(1813, 1, 28),
        "genres": ["Romance", "Literary Fiction"],
    },
    {
        "title": "The Road",
        "author": "Cormac McCarthy",
        "isbn": "9780307387899",
        "description": "A father and his son walk alone through burned America, heading through the ravaged landscape to the coast.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780307387899-L.jpg",
        "publication_date": date(2006, 9, 26),
        "genres": ["Literary Fiction", "Dystopian"],
    },
    {
        "title": "Anxious People",
        "author": "Fredrik Backman",
        "isbn": "9781501160837",
        "description": "A poignant comedy about a crime that never took place, a would-be bank robber who disappears into thin air, and eight extremely anxious strangers.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9781501160837-L.jpg",
        "publication_date": date(2020, 6, 2),
        "genres": ["Literary Fiction", "Mystery"],
    },
    {
        "title": "Klara and the Sun",
        "author": "Kazuo Ishiguro",
        "isbn": "9780593318171",
        "description": "From the window of her store, Klara, an Artificial Friend, observes the behavior of those who come to browse, and of those who pass on the street outside.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780593318171-L.jpg",
        "publication_date": date(2021, 3, 2),
        "genres": ["Science Fiction", "Literary Fiction"],
    },
    {
        "title": "The House in the Cerulean Sea",
        "author": "TJ Klune",
        "isbn": "9781250217288",
        "description": "A magical island. A dangerous task. A burning secret. Linus Baker leads a quiet, solitary life as a Case Worker at the Department in Charge Of Magical Youth.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9781250217288-L.jpg",
        "publication_date": date(2020, 3, 17),
        "genres": ["Fantasy", "Romance"],
    },
    {
        "title": "Piranesi",
        "author": "Susanna Clarke",
        "isbn": "9781635575996",
        "description": "Piranesi's house is no ordinary building: its rooms are infinite, its corridors endless, its walls are lined with thousands of statues.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9781635575996-L.jpg",
        "publication_date": date(2020, 9, 15),
        "genres": ["Fantasy", "Mystery"],
    },
    {
        "title": "Becoming",
        "author": "Michelle Obama",
        "isbn": "9781524763138",
        "description": "In her memoir, former First Lady Michelle Obama invites readers into her world, chronicling the experiences that have shaped her.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9781524763138-L.jpg",
        "publication_date": date(2018, 11, 13),
        "genres": ["Non-Fiction", "Biography"],
    },
    {
        "title": "The Poppy War",
        "author": "R.F. Kuang",
        "isbn": "9780062662569",
        "description": "A brilliantly imaginative talent makes her exciting debut with this epic historical military fantasy inspired by China's bloody 20th century history.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780062662569-L.jpg",
        "publication_date": date(2018, 5, 1),
        "genres": ["Fantasy", "Historical Fiction"],
    },
    {
        "title": "Normal People",
        "author": "Sally Rooney",
        "isbn": "9781984822178",
        "description": "Connell and Marianne grow up in the same small town in the west of Ireland, but the similarities end there.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9781984822178-L.jpg",
        "publication_date": date(2019, 4, 16),
        "genres": ["Literary Fiction", "Romance"],
    },
    {
        "title": "Brave New World",
        "author": "Aldous Huxley",
        "isbn": "9780060850524",
        "description": "Aldous Huxley's profoundly important classic of world literature, a searching vision of an unequal, technologically-advanced future.",
        "cover_url": "https://covers.openlibrary.org/b/isbn/9780060850524-L.jpg",
        "publication_date": date(1932, 1, 1),
        "genres": ["Dystopian", "Science Fiction", "Literary Fiction"],
    },
]

RELATED_PAIRS = [
    ("Dune", "Project Hail Mary"),
    ("Dune", "The Martian"),
    ("The Martian", "Project Hail Mary"),
    ("1984", "Brave New World"),
    ("1984", "The Hunger Games"),
    ("The Hobbit", "The Name of the Wind"),
    ("Gone Girl", "The Silent Patient"),
    ("Circe", "The Poppy War"),
    ("Pride and Prejudice", "Normal People"),
    ("The Road", "Brave New World"),
    ("Klara and the Sun", "Brave New World"),
    ("The House in the Cerulean Sea", "Piranesi"),
]


async def seed():
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with async_session() as db:
        # Check if already seeded
        existing = await db.execute(select(Genre))
        if existing.scalars().first():
            print("Database already seeded, skipping.")
            return

        # Create genres
        genre_map = {}
        for name in GENRES:
            g = Genre(name=name)
            db.add(g)
            genre_map[name] = g
        await db.flush()

        # Create books
        book_map = {}
        for b in BOOKS:
            book = Book(
                title=b["title"],
                author=b["author"],
                isbn=b["isbn"],
                description=b["description"],
                cover_url=b["cover_url"],
                publication_date=b["publication_date"],
            )
            book.genres = [genre_map[g] for g in b["genres"]]
            db.add(book)
            book_map[b["title"]] = book
        await db.flush()

        # Create related books
        for title1, title2 in RELATED_PAIRS:
            b1 = book_map[title1]
            b2 = book_map[title2]
            db.add(RelatedBook(book_id=b1.id, related_book_id=b2.id))
            db.add(RelatedBook(book_id=b2.id, related_book_id=b1.id))

        # Create demo user
        demo = User(
            username="demo",
            email="demo@example.com",
            password_hash=hash_password("demo1234"),
        )
        db.add(demo)
        await db.flush()

        # Add some books to demo user's library
        books_list = list(book_map.values())
        for i, book in enumerate(books_list[:5]):
            ub = UserBook(user_id=demo.id, book_id=book.id, status="finished", rating=4 + (i % 2))
            db.add(ub)
        for book in books_list[5:8]:
            ub = UserBook(user_id=demo.id, book_id=book.id, status="currently_reading")
            db.add(ub)
        for book in books_list[8:12]:
            ub = UserBook(user_id=demo.id, book_id=book.id, status="want_to_read")
            db.add(ub)
        await db.flush()

        # Add some reviews
        review_texts = [
            "Absolutely captivating from start to finish. The world-building is phenomenal.",
            "A masterpiece of storytelling that keeps you on the edge of your seat.",
            "Beautifully written with complex characters. Highly recommended.",
            "A thrilling ride. Couldn't put it down once I started.",
            "One of the best books I've read this year. The prose is stunning.",
        ]
        for i, book in enumerate(books_list[:5]):
            review = Review(
                user_id=demo.id,
                book_id=book.id,
                review_text=review_texts[i],
            )
            db.add(review)

        # Add content ratings for finished books
        content_data = [
            {"violence": 2, "language": 1, "sexual": 0, "substance": 1, "tags": []},
            {"violence": 3, "language": 1, "sexual": 0, "substance": 1, "tags": ["war", "death"]},
            {"violence": 1, "language": 2, "sexual": 0, "substance": 0, "tags": []},
            {"violence": 3, "language": 2, "sexual": 1, "substance": 0, "tags": ["domestic abuse"]},
            {"violence": 2, "language": 1, "sexual": 1, "substance": 1, "tags": []},
        ]
        for i, book in enumerate(books_list[:5]):
            cd = content_data[i]
            cr = ContentRating(
                book_id=book.id,
                user_id=demo.id,
                violence_level=cd["violence"],
                language_level=cd["language"],
                sexual_content_level=cd["sexual"],
                substance_use_level=cd["substance"],
                other_tags=cd["tags"] or None,
            )
            db.add(cr)

        await db.commit()
        print("Database seeded successfully!")
        print(f"  - {len(GENRES)} genres")
        print(f"  - {len(BOOKS)} books")
        print(f"  - {len(RELATED_PAIRS)} related book pairs")
        print(f"  - 1 demo user (demo / demo1234)")


if __name__ == "__main__":
    asyncio.run(seed())
