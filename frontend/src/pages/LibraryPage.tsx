import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { UserBook, STATUS_LABELS, ReadingStatus } from '../types';
import StarRating from '../components/StarRating';
import { Button, Badge, Select, Modal, ModalFooter, Card, ListItemSkeleton } from '../components/ui';

const TABS: { value: string; label: string; icon: string }[] = [
  { value: '', label: 'All Books', icon: 'library' },
  { value: 'currently_reading', label: 'Currently Reading', icon: 'book-open' },
  { value: 'want_to_read', label: 'Want to Read', icon: 'bookmark' },
  { value: 'finished', label: 'Finished', icon: 'check' },
  { value: 'dnf', label: 'DNF', icon: 'x' },
];

const TAB_ICONS: Record<string, JSX.Element> = {
  library: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
    </svg>
  ),
  'book-open': (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
    </svg>
  ),
  bookmark: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
    </svg>
  ),
  check: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
  x: (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  ),
};

export default function LibraryPage() {
  const toast = useToast();
  const [books, setBooks] = useState<UserBook[]>([]);
  const [tab, setTab] = useState('');
  const [loading, setLoading] = useState(true);
  const [bookToRemove, setBookToRemove] = useState<UserBook | null>(null);

  const fetchLibrary = async () => {
    setLoading(true);
    try {
      const data = await api.getLibrary(tab || undefined);
      setBooks(data);
    } catch (error: any) {
      toast.error(error.message || 'Failed to load library');
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
      toast.success(`Moved to ${STATUS_LABELS[status as ReadingStatus]}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
  };

  const handleRate = async (bookId: number, rating: number) => {
    try {
      await api.updateLibraryEntry(bookId, { rating });
      fetchLibrary();
      toast.success('Rating saved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save rating');
    }
  };

  const handleRemove = async () => {
    if (!bookToRemove) return;
    try {
      await api.removeFromLibrary(bookToRemove.book_id);
      fetchLibrary();
      toast.success('Removed from library');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove book');
    } finally {
      setBookToRemove(null);
    }
  };

  // Calculate stats
  const stats = {
    total: books.length,
    currently_reading: books.filter((b) => b.status === 'currently_reading').length,
    want_to_read: books.filter((b) => b.status === 'want_to_read').length,
    finished: books.filter((b) => b.status === 'finished').length,
    dnf: books.filter((b) => b.status === 'dnf').length,
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">My Library</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Track your reading journey
          </p>
        </div>

        {/* Stats Cards */}
        {!loading && books.length > 0 && tab === '' && (
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-8">
            <Card padding="md" className="text-center">
              <div className="text-3xl font-bold text-shelf-600 dark:text-shelf-400 mb-1">
                {stats.total}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Total Books</div>
            </Card>
            <Card padding="md" className="text-center">
              <div className="text-3xl font-bold text-blue-600 dark:text-blue-400 mb-1">
                {stats.currently_reading}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Reading</div>
            </Card>
            <Card padding="md" className="text-center">
              <div className="text-3xl font-bold text-yellow-600 dark:text-yellow-400 mb-1">
                {stats.want_to_read}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Want to Read</div>
            </Card>
            <Card padding="md" className="text-center">
              <div className="text-3xl font-bold text-green-600 dark:text-green-400 mb-1">
                {stats.finished}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Finished</div>
            </Card>
            <Card padding="md" className="text-center">
              <div className="text-3xl font-bold text-gray-600 dark:text-gray-400 mb-1">
                {stats.dnf}
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">DNF</div>
            </Card>
          </div>
        )}

        {/* Tabs */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm border border-gray-200 dark:border-gray-700 p-2 mb-6 overflow-x-auto">
          <div className="flex gap-2 min-w-max">
            {TABS.map((t) => (
              <button
                key={t.value}
                onClick={() => setTab(t.value)}
                className={`flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap ${
                  tab === t.value
                    ? 'bg-shelf-600 text-white shadow-sm'
                    : 'bg-transparent text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }`}
              >
                {TAB_ICONS[t.icon]}
                {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* Books List */}
        {loading ? (
          <div className="space-y-3">
            {Array.from({ length: 5 }).map((_, i) => (
              <ListItemSkeleton key={i} />
            ))}
          </div>
        ) : books.length === 0 ? (
          <div className="text-center py-20">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <p className="text-gray-600 dark:text-gray-400 text-lg font-medium mb-2">
              {tab ? 'No books in this category' : 'Your library is empty'}
            </p>
            <p className="text-gray-500 dark:text-gray-500 text-sm mb-4">
              {tab ? 'Try adding some books or switching to another category' : 'Start building your library'}
            </p>
            <Link to="/">
              <Button variant="primary">Browse Books</Button>
            </Link>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-4">
              <p className="text-sm text-gray-600 dark:text-gray-400">
                {books.length} {books.length === 1 ? 'book' : 'books'}
              </p>
            </div>
            <div className="space-y-3">
              {books.map((ub) => (
                <Card key={ub.id} padding="md" hover className="transition-all">
                  <div className="flex gap-4 items-start">
                    {/* Cover Image */}
                    <Link to={`/books/${ub.book_id}`} className="flex-shrink-0 group">
                      {ub.book.cover_url ? (
                        <img
                          src={ub.book.cover_url}
                          alt={`Cover of ${ub.book.title}`}
                          className="w-20 h-30 object-cover rounded shadow-sm group-hover:shadow-md transition-shadow"
                        />
                      ) : (
                        <div className="w-20 h-30 bg-gray-200 dark:bg-gray-700 rounded flex items-center justify-center text-gray-400 dark:text-gray-500">
                          <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                    </Link>

                    {/* Book Info */}
                    <div className="flex-1 min-w-0">
                      <Link
                        to={`/books/${ub.book_id}`}
                        className="hover:text-shelf-600 dark:hover:text-shelf-400 transition-colors"
                      >
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-lg mb-1 truncate">
                          {ub.book.title}
                        </h3>
                      </Link>
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-3">{ub.book.author}</p>

                      {/* Genres */}
                      {ub.book.genres.length > 0 && (
                        <div className="flex flex-wrap gap-1 mb-3">
                          {ub.book.genres.slice(0, 3).map((g) => (
                            <Badge key={g.id} variant="default" size="sm">
                              {g.name}
                            </Badge>
                          ))}
                          {ub.book.genres.length > 3 && (
                            <Badge variant="default" size="sm">
                              +{ub.book.genres.length - 3}
                            </Badge>
                          )}
                        </div>
                      )}

                      {/* Actions */}
                      <div className="flex flex-wrap items-center gap-3">
                        <Select
                          value={ub.status}
                          onChange={(e) => handleStatusChange(ub.book_id, e.target.value)}
                          aria-label="Change reading status"
                          className="w-auto text-sm"
                        >
                          {Object.entries(STATUS_LABELS).map(([val, label]) => (
                            <option key={val} value={val}>
                              {label}
                            </option>
                          ))}
                        </Select>

                        <div className="flex items-center gap-2">
                          <span className="text-xs font-medium text-gray-600 dark:text-gray-400">Your rating:</span>
                          <StarRating
                            rating={ub.rating || 0}
                            size="sm"
                            interactive
                            onRate={(r) => handleRate(ub.book_id, r)}
                          />
                        </div>

                        {ub.book.avg_rating !== null && (
                          <span className="text-xs text-gray-500 dark:text-gray-400">
                            Avg: {ub.book.avg_rating.toFixed(1)} ⭐
                          </span>
                        )}

                        <button
                          onClick={() => setBookToRemove(ub)}
                          className="ml-auto text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-xs font-medium transition-colors"
                        >
                          Remove
                        </button>
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Remove Confirmation Modal */}
      <Modal
        isOpen={bookToRemove !== null}
        onClose={() => setBookToRemove(null)}
        title="Remove from Library"
      >
        {bookToRemove && (
          <>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              Are you sure you want to remove <strong>{bookToRemove.book.title}</strong> from your library?
            </p>
            <ModalFooter>
              <Button variant="ghost" onClick={() => setBookToRemove(null)}>
                Cancel
              </Button>
              <Button variant="danger" onClick={handleRemove}>
                Remove
              </Button>
            </ModalFooter>
          </>
        )}
      </Modal>
    </div>
  );
}
