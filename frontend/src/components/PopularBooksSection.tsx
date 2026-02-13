import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { fetchTrendingBooks, TrendingBook } from '../services/openLibrary';

export default function PopularBooksSection() {
  const navigate = useNavigate();
  const [books, setBooks] = useState<TrendingBook[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadTrendingBooks = async () => {
      setLoading(true);
      const trendingBooks = await fetchTrendingBooks(12);
      setBooks(trendingBooks);
      setLoading(false);
    };

    loadTrendingBooks();
  }, []);

  const handleBookClick = (book: TrendingBook) => {
    const query = `${book.title}${book.authors[0] !== 'Unknown Author' ? ' ' + book.authors[0] : ''}`;
    navigate(`/search?q=${encodeURIComponent(query)}`);
  };

  if (loading) {
    return (
      <div className="bg-gradient-to-br from-shelf-100 to-shelf-200 dark:from-shelf-900/40 dark:to-shelf-800/40 rounded-xl p-6 mb-8 border border-shelf-200 dark:border-shelf-700 shadow-sm">
        <div className="flex items-center gap-3 mb-6">
          <svg className="w-6 h-6 text-shelf-600 dark:text-shelf-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
          </svg>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Trending on Open Library</h2>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-hide">
          {Array.from({ length: 6 }).map((_, i) => (
            <div key={i} className="flex-shrink-0 w-40">
              <div className="bg-gray-300 dark:bg-gray-700 rounded-lg h-56 animate-pulse" />
              <div className="mt-3 space-y-2">
                <div className="h-4 bg-gray-300 dark:bg-gray-700 rounded animate-pulse" />
                <div className="h-3 bg-gray-300 dark:bg-gray-700 rounded w-2/3 animate-pulse" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (books.length === 0) {
    return null;
  }

  return (
    <div className="bg-gradient-to-br from-shelf-100 to-shelf-200 dark:from-shelf-900/40 dark:to-shelf-800/40 rounded-xl p-6 mb-8 border border-shelf-200 dark:border-shelf-700 shadow-sm">
      <div className="flex items-center gap-3 mb-6">
        <svg className="w-6 h-6 text-shelf-600 dark:text-shelf-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
        </svg>
        <div>
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Trending on Open Library</h2>
          <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">
            Discover what readers are adding to their shelves
          </p>
        </div>
      </div>

      <div className="relative">
        <div className="flex gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-shelf-400 scrollbar-track-shelf-100 dark:scrollbar-thumb-shelf-600 dark:scrollbar-track-shelf-800">
          {books.map((book) => (
            <button
              key={book.key}
              onClick={() => handleBookClick(book)}
              className="flex-shrink-0 w-40 group cursor-pointer text-left transition-transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-shelf-500 focus:ring-offset-2 rounded-lg"
            >
              <div className="relative">
                {book.coverUrl ? (
                  <img
                    src={book.coverUrl}
                    alt={book.title}
                    className="w-full h-56 object-cover rounded-lg shadow-md group-hover:shadow-xl transition-shadow"
                  />
                ) : (
                  <div className="w-full h-56 bg-gradient-to-br from-shelf-300 to-shelf-400 dark:from-shelf-700 dark:to-shelf-800 rounded-lg shadow-md group-hover:shadow-xl transition-shadow flex items-center justify-center">
                    <svg className="w-16 h-16 text-shelf-600 dark:text-shelf-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                  </div>
                )}
                {book.rating && (
                  <div className="absolute top-2 right-2 bg-yellow-500 text-white text-xs font-bold px-2 py-1 rounded-md shadow-lg flex items-center gap-1">
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    {book.rating.toFixed(1)}
                  </div>
                )}
              </div>
              <div className="mt-3">
                <h3 className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 text-sm group-hover:text-shelf-600 dark:group-hover:text-shelf-400 transition-colors">
                  {book.title}
                </h3>
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 line-clamp-1">
                  {book.authors.join(', ')}
                </p>
                {book.publishYear && (
                  <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">
                    {book.publishYear}
                  </p>
                )}
              </div>
            </button>
          ))}
        </div>
      </div>

      <div className="mt-4 flex justify-center">
        <button
          onClick={() => navigate('/search?q=trending')}
          className="text-sm font-medium text-shelf-600 dark:text-shelf-400 hover:text-shelf-700 dark:hover:text-shelf-300 transition-colors flex items-center gap-2 group"
        >
          View more trending books
          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
