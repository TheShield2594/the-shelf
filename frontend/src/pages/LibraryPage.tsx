import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { UserBook, STATUS_LABELS, ReadingStatus } from '../types';
import StarRating from '../components/StarRating';
import { LibraryItemSkeleton } from '../components/ui/Skeleton';
import EmptyState from '../components/ui/EmptyState';
import { useToast } from '../components/ui/Toast';

const TABS: { value: string; label: string; icon: string }[] = [
  { value: '', label: 'All', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' },
  { value: 'currently_reading', label: 'Reading', icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253' },
  { value: 'want_to_read', label: 'To Read', icon: 'M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z' },
  { value: 'finished', label: 'Finished', icon: 'M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z' },
  { value: 'dnf', label: 'DNF', icon: 'M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636' },
];

export default function LibraryPage() {
  const [books, setBooks] = useState<UserBook[]>([]);
  const [tab, setTab] = useState('');
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

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
      toast('Status updated', 'success');
      fetchLibrary();
    } catch {
      toast('Failed to update status', 'error');
    }
  };

  const handleRate = async (bookId: number, rating: number) => {
    try {
      await api.updateLibraryEntry(bookId, { rating });
      toast('Rating saved', 'success');
      fetchLibrary();
    } catch {
      toast('Failed to save rating', 'error');
    }
  };

  const handleRemove = async (bookId: number) => {
    if (!confirm('Remove from library?')) return;
    try {
      await api.removeFromLibrary(bookId);
      toast('Removed from library', 'info');
      fetchLibrary();
    } catch {
      toast('Failed to remove', 'error');
    }
  };

  return (
    <div className="max-w-5xl mx-auto px-4 py-6 sm:py-8 pb-24 sm:pb-8">
      <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white mb-6">My Books</h1>

      {/* Tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0" role="tablist">
        {TABS.map((t) => (
          <button
            key={t.value}
            role="tab"
            aria-selected={tab === t.value}
            onClick={() => setTab(t.value)}
            className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-medium whitespace-nowrap transition ${
              tab === t.value
                ? 'bg-shelf-600 text-white shadow-sm'
                : 'bg-white dark:bg-gray-900 text-gray-600 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 border border-gray-200 dark:border-gray-800'
            }`}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={t.icon} />
            </svg>
            {t.label}
          </button>
        ))}
      </div>

      {/* Content */}
      {loading ? (
        <div className="space-y-3">
          {Array.from({ length: 5 }).map((_, i) => (
            <LibraryItemSkeleton key={i} />
          ))}
        </div>
      ) : books.length === 0 ? (
        <EmptyState
          title="No books here yet"
          description="Start building your library by browsing and adding books."
          actionLabel="Browse Books"
          actionHref="/"
        />
      ) : (
        <div className="space-y-3 animate-fade-in">
          {books.map((ub) => (
            <div
              key={ub.id}
              className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex gap-4 items-start hover:border-gray-300 dark:hover:border-gray-700 transition"
            >
              <Link to={`/books/${ub.book_id}`} className="flex-shrink-0">
                {ub.book.cover_url ? (
                  <img
                    src={ub.book.cover_url}
                    alt={`Cover of ${ub.book.title}`}
                    className="w-16 h-24 object-cover rounded-lg shadow-sm"
                    loading="lazy"
                  />
                ) : (
                  <div className="w-16 h-24 bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center text-xs text-gray-400 dark:text-gray-600">
                    No Cover
                  </div>
                )}
              </Link>

              <div className="flex-1 min-w-0">
                <Link to={`/books/${ub.book_id}`} className="hover:text-shelf-600 dark:hover:text-shelf-400 transition">
                  <h3 className="font-semibold text-gray-900 dark:text-gray-100 truncate">{ub.book.title}</h3>
                </Link>
                <p className="text-sm text-gray-500 dark:text-gray-400">{ub.book.author}</p>

                <div className="flex flex-wrap items-center gap-3 mt-2">
                  <select
                    value={ub.status}
                    onChange={(e) => handleStatusChange(ub.book_id, e.target.value)}
                    className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-2 py-1 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-shelf-400 outline-none"
                    aria-label={`Status for ${ub.book.title}`}
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
                    <span className="text-xs text-gray-400 dark:text-gray-500">
                      Avg: {ub.book.avg_rating.toFixed(1)}
                    </span>
                  )}

                  <button
                    onClick={() => handleRemove(ub.book_id)}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs ml-auto transition"
                    aria-label={`Remove ${ub.book.title} from library`}
                  >
                    Remove
                  </button>
                </div>

                {ub.book.genres.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-2">
                    {ub.book.genres.map((g) => (
                      <span key={g.id} className="text-xs bg-shelf-50 dark:bg-shelf-900/30 text-shelf-700 dark:text-shelf-400 px-1.5 py-0.5 rounded-full">
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
