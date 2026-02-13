import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { searchBooks, searchBooksByISBN, OpenLibraryBook, getCoverUrl, getBookId } from '../lib/open-library';
import { api } from '../services/api';
import { BookDetail } from '../types';
import { useAuth } from '../context/AuthContext';

export default function SearchPage() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const query = searchParams.get('q') || '';
  const isISBN = searchParams.get('isbn') === 'true';

  const [books, setBooks] = useState<OpenLibraryBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [importing, setImporting] = useState<string | null>(null);
  const [importedBookIds, setImportedBookIds] = useState<Set<string>>(new Set());

  useEffect(() => {
    if (!query) {
      setBooks([]);
      setLoading(false);
      return;
    }

    const fetchBooks = async () => {
      setLoading(true);
      try {
        const results = isISBN
          ? await searchBooksByISBN(query)
          : await searchBooks(query, 24);
        setBooks(results);
      } catch (error) {
        console.error('Search error:', error);
        setBooks([]);
      }
      setLoading(false);
    };

    fetchBooks();
  }, [query, isISBN]);

  const handleImport = async (book: OpenLibraryBook) => {
    const bookId = getBookId(book);

    // Check if user is authenticated
    if (!user) {
      navigate('/login?redirect=/search?q=' + encodeURIComponent(query));
      return;
    }

    // Prevent duplicate imports
    if (importedBookIds.has(bookId)) {
      return;
    }

    setImporting(bookId);

    try {
      const bookData = {
        title: book.title,
        author: book.author_name?.[0] || 'Unknown Author',
        isbn: book.isbn?.[0] || null,
        cover_url: getCoverUrl(book.cover_i, 'L'),
        publication_year: book.first_publish_year || null,
        description: null,
      };

      const newBook: BookDetail = await api.createBook(bookData);

      // Mark as imported to prevent duplicates
      setImportedBookIds(prev => new Set(prev).add(bookId));

      navigate(`/books/${newBook.id}`);
    } catch (error: any) {
      alert(error.message || 'Failed to import book');
    } finally {
      setImporting(null);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-2">
          Search Results {query && `for "${query}"`}
        </h1>
        <p className="text-gray-600">
          {loading ? 'Searching Open Library...' : `${books.length} books found`}
        </p>
      </div>

      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {[...Array(10)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="bg-gray-200 aspect-[2/3] rounded-lg mb-2"></div>
              <div className="bg-gray-200 h-4 rounded mb-1"></div>
              <div className="bg-gray-200 h-3 rounded w-3/4"></div>
            </div>
          ))}
        </div>
      ) : books.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No books found</p>
          <p className="text-sm text-gray-400">Try a different search term</p>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
          {books.map((book) => {
            const bookId = getBookId(book);
            const coverUrl = getCoverUrl(book.cover_i, 'M');

            return (
              <div
                key={bookId}
                className="bg-white rounded-lg shadow-md hover:shadow-xl transition-shadow overflow-hidden group"
              >
                <div className="aspect-[2/3] bg-gray-100 overflow-hidden">
                  {coverUrl ? (
                    <img
                      src={coverUrl}
                      alt={book.title}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      loading="lazy"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center p-4">
                      <span className="text-center text-sm text-gray-500 line-clamp-3">
                        {book.title}
                      </span>
                    </div>
                  )}
                </div>
                <div className="p-3">
                  <h3 className="font-semibold text-sm line-clamp-2 mb-1">{book.title}</h3>
                  {book.author_name?.[0] && (
                    <p className="text-xs text-gray-500 mb-2">{book.author_name[0]}</p>
                  )}
                  {book.first_publish_year && (
                    <p className="text-xs text-gray-400 mb-2">{book.first_publish_year}</p>
                  )}
                  <button
                    type="button"
                    onClick={() => handleImport(book)}
                    disabled={importing === bookId || importedBookIds.has(bookId)}
                    className="w-full bg-shelf-500 text-white text-xs py-1.5 rounded hover:bg-shelf-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition"
                  >
                    {importing === bookId
                      ? 'Importing...'
                      : importedBookIds.has(bookId)
                      ? 'Imported ✓'
                      : user
                      ? 'Import Book'
                      : 'Login to Import'}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
