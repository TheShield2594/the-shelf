import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import {
  BookDetail,
  UserBook,
  ContentRating,
  STATUS_LABELS,
  ReadingStatus,
} from '../types';
import StarRating from '../components/StarRating';
import ContentRatingDisplay from '../components/ContentRatingDisplay';
import ContentRatingForm from '../components/ContentRatingForm';
import { BookDetailSkeleton } from '../components/ui/Skeleton';
import ErrorState from '../components/ui/ErrorState';
import { useToast } from '../components/ui/Toast';

type Tab = 'details' | 'reviews' | 'related';

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const { toast } = useToast();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [userBook, setUserBook] = useState<UserBook | null>(null);
  const [myContentRating, setMyContentRating] = useState<ContentRating | null>(null);
  const [showCRForm, setShowCRForm] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<Tab>('details');

  const bookId = Number(id);

  const fetchData = async () => {
    try {
      const bookData = await api.getBook(bookId);
      setBook(bookData);

      if (user) {
        try {
          const lib = await api.getLibrary();
          const entry = lib.find((ub) => ub.book_id === bookId);
          setUserBook(entry || null);
        } catch { /* not in library */ }

        try {
          const ratings = await api.getBookContentRatings(bookId);
          const mine = ratings.find((r) => r.user_id === user.id);
          setMyContentRating(mine || null);
        } catch { /* no ratings */ }
      }
    } catch {
      setError('Book not found');
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchData();
  }, [bookId, user]);

  const handleAddToLibrary = async (status: ReadingStatus) => {
    setActionLoading(true);
    try {
      await api.addToLibrary({ book_id: bookId, status });
      toast(`Added to ${STATUS_LABELS[status]}`, 'success');
      await fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    }
    setActionLoading(false);
  };

  const handleStatusChange = async (status: string) => {
    setActionLoading(true);
    try {
      await api.updateLibraryEntry(bookId, { status });
      toast('Status updated', 'success');
      await fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    }
    setActionLoading(false);
  };

  const handleRate = async (rating: number) => {
    try {
      await api.updateLibraryEntry(bookId, { rating });
      toast('Rating saved', 'success');
      await fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const handleRemove = async () => {
    setActionLoading(true);
    try {
      await api.removeFromLibrary(bookId);
      setUserBook(null);
      toast('Removed from library', 'info');
      await fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    }
    setActionLoading(false);
  };

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) return;
    setActionLoading(true);
    try {
      await api.createReview({ book_id: bookId, review_text: reviewText });
      setReviewText('');
      toast('Review submitted', 'success');
      await fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    }
    setActionLoading(false);
  };

  const handleEditReview = async (reviewId: number) => {
    setActionLoading(true);
    try {
      await api.updateReview(reviewId, { review_text: editText });
      setEditingReviewId(null);
      toast('Review updated', 'success');
      await fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    }
    setActionLoading(false);
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Delete this review?')) return;
    try {
      await api.deleteReview(reviewId);
      toast('Review deleted', 'info');
      await fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    }
  };

  const handleSubmitContentRating = async (data: {
    violence_level: number;
    language_level: number;
    sexual_content_level: number;
    substance_use_level: number;
    other_tags: string[];
  }) => {
    setActionLoading(true);
    try {
      if (myContentRating) {
        await api.updateContentRating(myContentRating.id, data);
      } else {
        await api.createContentRating({ book_id: bookId, ...data });
      }
      setShowCRForm(false);
      toast('Content rating saved', 'success');
      await fetchData();
    } catch (e: any) {
      toast(e.message, 'error');
    }
    setActionLoading(false);
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8 pb-24 sm:pb-8">
        <BookDetailSkeleton />
      </div>
    );
  }

  if (!book) {
    return (
      <div className="max-w-4xl mx-auto px-4 py-8">
        <ErrorState message={error || 'Book not found'} onRetry={fetchData} />
      </div>
    );
  }

  const canRateContent = userBook?.status === 'finished';
  const myReview = book.reviews.find((r) => r.user_id === user?.id);

  const tabs: { key: Tab; label: string; count?: number }[] = [
    { key: 'details', label: 'Details' },
    { key: 'reviews', label: 'Reviews', count: book.reviews.length },
    { key: 'related', label: 'Related', count: book.related_books.length },
  ];

  return (
    <div className="max-w-4xl mx-auto px-4 py-6 sm:py-8 pb-24 sm:pb-8 animate-fade-in">
      {/* Hero Section */}
      <div className="flex flex-col md:flex-row gap-6 md:gap-8 mb-8">
        <div className="w-48 md:w-64 flex-shrink-0 mx-auto md:mx-0">
          {book.cover_url ? (
            <img
              src={book.cover_url}
              alt={`Cover of ${book.title}`}
              className="w-full rounded-xl shadow-lg dark:shadow-gray-950/50"
            />
          ) : (
            <div className="w-full aspect-[2/3] bg-gray-200 dark:bg-gray-800 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-600">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-2xl sm:text-3xl font-bold text-gray-900 dark:text-white">{book.title}</h1>
          <p className="text-lg text-gray-500 dark:text-gray-400 mt-1">by {book.author}</p>

          <div className="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500 dark:text-gray-400">
            {book.isbn && <span>ISBN: {book.isbn}</span>}
            {book.publication_date && (
              <span>Published: {new Date(book.publication_date).toLocaleDateString()}</span>
            )}
          </div>

          {book.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {book.genres.map((g) => (
                <span key={g.id} className="bg-shelf-50 dark:bg-shelf-900/30 text-shelf-700 dark:text-shelf-400 px-3 py-1 rounded-full text-sm font-medium">
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {book.avg_rating !== null && (
            <div className="flex items-center mt-4 gap-2">
              <StarRating rating={book.avg_rating} size="lg" />
              <span className="text-gray-500 dark:text-gray-400">({book.rating_count} ratings)</span>
            </div>
          )}

          {/* Library actions */}
          {user && (
            <div className="mt-5">
              {userBook ? (
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={userBook.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={actionLoading}
                    className="bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-700 dark:text-gray-300 focus:ring-2 focus:ring-shelf-400 outline-none"
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-gray-500 dark:text-gray-400">Your rating:</span>
                    <StarRating
                      rating={userBook.rating || 0}
                      interactive
                      onRate={handleRate}
                    />
                  </div>
                  <button
                    onClick={handleRemove}
                    className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300 text-sm transition"
                  >
                    Remove
                  </button>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {(Object.entries(STATUS_LABELS) as [ReadingStatus, string][]).map(
                    ([val, label]) => (
                      <button
                        key={val}
                        onClick={() => handleAddToLibrary(val)}
                        disabled={actionLoading}
                        className="bg-shelf-600 hover:bg-shelf-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                      >
                        {label}
                      </button>
                    )
                  )}
                </div>
              )}
            </div>
          )}

          {book.description && (
            <p className="mt-5 text-gray-700 dark:text-gray-300 leading-relaxed">{book.description}</p>
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200 dark:border-gray-800 mb-6">
        <div className="flex gap-0" role="tablist">
          {tabs.map((tab) => (
            <button
              key={tab.key}
              role="tab"
              aria-selected={activeTab === tab.key}
              onClick={() => setActiveTab(tab.key)}
              className={`px-4 py-3 text-sm font-medium border-b-2 transition ${
                activeTab === tab.key
                  ? 'border-shelf-600 text-shelf-600 dark:text-shelf-400 dark:border-shelf-400'
                  : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              {tab.label}
              {tab.count !== undefined && (
                <span className="ml-1.5 text-xs bg-gray-100 dark:bg-gray-800 text-gray-500 dark:text-gray-400 px-1.5 py-0.5 rounded-full">
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* Tab Content */}
      <div className="animate-fade-in">
        {activeTab === 'details' && (
          <div className="space-y-6">
            {/* Content Ratings */}
            {book.content_rating && book.content_rating.count > 0 && (
              <ContentRatingDisplay rating={book.content_rating} />
            )}

            {/* Submit Content Rating */}
            {user && canRateContent && (
              <div>
                <button
                  onClick={() => setShowCRForm(!showCRForm)}
                  className="inline-flex items-center gap-2 text-shelf-600 dark:text-shelf-400 hover:text-shelf-800 dark:hover:text-shelf-300 text-sm font-medium transition"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  {showCRForm
                    ? 'Cancel'
                    : myContentRating
                    ? 'Update Your Content Rating'
                    : 'Submit Content Rating'}
                </button>
                {showCRForm && (
                  <div className="mt-3 bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 animate-fade-in">
                    <ContentRatingForm
                      initial={myContentRating || undefined}
                      onSubmit={handleSubmitContentRating}
                      loading={actionLoading}
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {activeTab === 'reviews' && (
          <div className="space-y-4">
            {/* Write review */}
            {user && !myReview && (
              <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                <h3 className="text-sm font-medium text-gray-900 dark:text-gray-100 mb-3">Write a Review</h3>
                <textarea
                  value={reviewText}
                  onChange={(e) => setReviewText(e.target.value)}
                  placeholder="Share your thoughts about this book..."
                  rows={4}
                  className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 dark:placeholder-gray-500 focus:ring-2 focus:ring-shelf-400 outline-none resize-none"
                />
                <button
                  onClick={handleSubmitReview}
                  disabled={actionLoading || !reviewText.trim()}
                  className="mt-3 bg-shelf-600 hover:bg-shelf-700 text-white px-4 py-2 rounded-lg text-sm font-medium transition disabled:opacity-50"
                >
                  Submit Review
                </button>
              </div>
            )}

            {book.reviews.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400">No reviews yet. Be the first to share your thoughts!</p>
              </div>
            ) : (
              book.reviews.map((review) => (
                <div key={review.id} className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4">
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-full bg-shelf-100 dark:bg-shelf-900/30 flex items-center justify-center text-sm font-bold text-shelf-700 dark:text-shelf-400">
                        {review.username[0].toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-gray-900 dark:text-gray-100 text-sm">{review.username}</span>
                        <span className="text-xs text-gray-400 dark:text-gray-500 ml-2">
                          {new Date(review.created_at).toLocaleDateString()}
                        </span>
                      </div>
                    </div>
                    {user?.id === review.user_id && (
                      <div className="flex gap-2 text-sm">
                        <button
                          onClick={() => {
                            setEditingReviewId(review.id);
                            setEditText(review.review_text);
                          }}
                          className="text-shelf-600 dark:text-shelf-400 hover:text-shelf-800 dark:hover:text-shelf-300"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteReview(review.id)}
                          className="text-red-500 hover:text-red-700 dark:text-red-400 dark:hover:text-red-300"
                        >
                          Delete
                        </button>
                      </div>
                    )}
                  </div>
                  {editingReviewId === review.id ? (
                    <div className="mt-3">
                      <textarea
                        value={editText}
                        onChange={(e) => setEditText(e.target.value)}
                        rows={3}
                        className="w-full bg-gray-50 dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-shelf-400 outline-none resize-none"
                      />
                      <div className="flex gap-2 mt-2">
                        <button
                          onClick={() => handleEditReview(review.id)}
                          className="bg-shelf-600 hover:bg-shelf-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition"
                        >
                          Save
                        </button>
                        <button
                          onClick={() => setEditingReviewId(null)}
                          className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 text-sm px-3 py-1.5 transition"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <p className="mt-3 text-gray-700 dark:text-gray-300 text-sm leading-relaxed">{review.review_text}</p>
                  )}
                </div>
              ))
            )}
          </div>
        )}

        {activeTab === 'related' && (
          <div>
            {book.related_books.length === 0 ? (
              <div className="text-center py-12">
                <svg className="w-12 h-12 mx-auto text-gray-300 dark:text-gray-600 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <p className="text-gray-500 dark:text-gray-400">No related books found.</p>
              </div>
            ) : (
              <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-4">
                {book.related_books.map((rb) => (
                  <Link
                    key={rb.id}
                    to={`/books/${rb.id}`}
                    className="group text-center"
                  >
                    {rb.cover_url ? (
                      <img
                        src={rb.cover_url}
                        alt={`Cover of ${rb.title}`}
                        className="w-full aspect-[2/3] object-cover rounded-lg shadow-sm group-hover:shadow-md transition-all duration-200 group-hover:-translate-y-1"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full aspect-[2/3] bg-gray-200 dark:bg-gray-800 rounded-lg flex items-center justify-center text-xs text-gray-400 dark:text-gray-600">
                        No Cover
                      </div>
                    )}
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 mt-2 line-clamp-2">{rb.title}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{rb.author}</p>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
