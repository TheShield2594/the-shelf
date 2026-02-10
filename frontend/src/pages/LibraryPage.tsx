import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { UserBook, STATUS_LABELS, ReadingStatus } from '../types';
import StarRating from '../components/StarRating';

const TABS: { value: string; label: string }[] = [
  { value: '', label: 'All' },
  { value: 'currently_reading', label: 'Currently Reading' },
  { value: 'want_to_read', label: 'Want to Read' },
  { value: 'finished', label: 'Finished' },
  { value: 'dnf', label: 'DNF' },
];

export default function LibraryPage() {
  const [books, setBooks] = useState<UserBook[]>([]);
  const [tab, setTab] = useState('');
  const [loading, setLoading] = useState(true);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const data = await api.getLibrary(tab || undefined);
      setBooks(data);
    } catch {
      // ignore
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchLibrary();
  }, [tab]);

  const handleStatusChange = async (bookId: number, status: string) => {
    try {
      await api.updateLibraryEntry(bookId, { status });
      fetchLibrary();
    } catch {
      // ignore
    }
  };

  const handleRate = async (bookId: number, rating: number) => {
    try {
      await api.updateLibraryEntry(bookId, { rating });
      fetchLibrary();
    } catch {
      // ignore
    }
  };

  const handleRemove = async (bookId: number) => {
    if (!confirm('Remove from library?')) return;
    try {
      await api.removeFromLibrary(bookId);
      fetchLibrary();
    } catch {
      // ignore
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold text-gray-900 mb-6">My Books</h1>

      <div className="flex flex-wrap gap-2 mb-6 border-b border-gray-200 pb-4">
        {TABS.map((t) => (
          <button
            key={t.value}
            onClick={() => setTab(t.value)}
            className={`px-4 py-2 rounded-full text-sm font-medium transition ${
              tab === t.value
                ? 'bg-shelf-600 text-white'
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {loading ? (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      ) : books.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No books in this category</p>
          <Link to="/" className="text-shelf-600 hover:text-shelf-800 font-medium">
            Browse books to add some
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {books.map((ub) => (
            <div
              key={ub.id}
              className="bg-white border border-gray-200 rounded-lg p-4 flex gap-4 items-start"
            >
              <Link to={`/books/${ub.book_id}`} className="flex-shrink-0">
                {ub.book.cover_url ? (
                  <img
                    src={ub.book.cover_url}
                    alt={ub.book.title}
                    className="w-16 h-24 object-cover rounded"
                  />
                ) : (
                  <div className="w-16 h-24 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                    No Cover
                  </div>
                )}
              </Link>

              <div className="flex-1 min-w-0">
                <Link to={`/books/${ub.book_id}`} className="hover:text-shelf-600 transition">
                  <h3 className="font-semibold text-gray-900 truncate">{ub.book.title}</h3>
                </Link>
                <p className="text-sm text-gray-600">{ub.book.author}</p>

                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <select
                    value={ub.status}
                    onChange={(e) => handleStatusChange(ub.book_id, e.target.value)}
                    className="border border-gray-300 rounded px-2 py-1 text-sm"
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>

                  <StarRating
                    rating={ub.rating || 0}
                    size="sm"
                    interactive
                    onRate={(r) => handleRate(ub.book_id, r)}
                  />

                  {ub.book.avg_rating !== null && (
                    <span className="text-xs text-gray-500">
                      Avg: {ub.book.avg_rating.toFixed(1)}
                    </span>
                  )}

                  <button
                    onClick={() => handleRemove(ub.book_id)}
                    className="text-red-500 hover:text-red-700 text-xs ml-auto transition"
                  >
                    Remove
                  </button>
                </div>

                {ub.book.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ub.book.genres.map((g) => (
                      <span key={g.id} className="text-xs bg-shelf-100 text-shelf-700 px-1.5 py-0.5 rounded">
                        {g.name}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
