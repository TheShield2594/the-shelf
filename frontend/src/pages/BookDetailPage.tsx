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

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
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
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(false);
  };

  const handleStatusChange = async (status: string) => {
    setActionLoading(true);
    try {
      await api.updateLibraryEntry(bookId, { status });
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(false);
  };

  const handleRate = async (rating: number) => {
    try {
      await api.updateLibraryEntry(bookId, { rating });
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    }
  };

  const handleRemove = async () => {
    setActionLoading(true);
    try {
      await api.removeFromLibrary(bookId);
      setUserBook(null);
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(false);
  };

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) return;
    setActionLoading(true);
    try {
      await api.createReview({ book_id: bookId, review_text: reviewText });
      setReviewText('');
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(false);
  };

  const handleEditReview = async (reviewId: number) => {
    setActionLoading(true);
    try {
      await api.updateReview(reviewId, { review_text: editText });
      setEditingReviewId(null);
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(false);
  };

  const handleDeleteReview = async (reviewId: number) => {
    if (!confirm('Delete this review?')) return;
    try {
      await api.deleteReview(reviewId);
      await fetchData();
    } catch (e: any) {
      setError(e.message);
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
      await fetchData();
    } catch (e: any) {
      setError(e.message);
    }
    setActionLoading(false);
  };

  if (loading) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-gray-500">Loading...</div>;
  if (!book) return <div className="max-w-4xl mx-auto px-4 py-12 text-center text-red-500">{error || 'Book not found'}</div>;

  const canRateContent = userBook?.status === 'finished';
  const myReview = book.reviews.find((r) => r.user_id === user?.id);

  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      {error && (
        <div className="bg-red-50 text-red-700 px-4 py-2 rounded mb-4">{error}</div>
      )}

      {/* Book Header */}
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <div className="w-48 flex-shrink-0">
          {book.cover_url ? (
            <img src={book.cover_url} alt={book.title} className="w-full rounded-lg shadow" />
          ) : (
            <div className="w-full h-64 bg-gray-200 rounded-lg flex items-center justify-center text-gray-400">
              No Cover
            </div>
          )}
        </div>

        <div className="flex-1">
          <h1 className="text-3xl font-bold text-gray-900">{book.title}</h1>
          <p className="text-xl text-gray-600 mt-1">by {book.author}</p>

          {book.isbn && (
            <p className="text-sm text-gray-500 mt-1">ISBN: {book.isbn}</p>
          )}
          {book.publication_date && (
            <p className="text-sm text-gray-500">
              Published: {new Date(book.publication_date).toLocaleDateString()}
            </p>
          )}

          {book.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-3">
              {book.genres.map((g) => (
                <span key={g.id} className="bg-shelf-100 text-shelf-700 px-3 py-1 rounded-full text-sm">
                  {g.name}
                </span>
              ))}
            </div>
          )}

          {book.avg_rating !== null && (
            <div className="flex items-center mt-3 space-x-2">
              <StarRating rating={book.avg_rating} size="lg" />
              <span className="text-gray-500">({book.rating_count} ratings)</span>
            </div>
          )}

          {/* Library actions */}
          {user && (
            <div className="mt-4 space-y-2">
              {userBook ? (
                <div className="flex flex-wrap items-center gap-3">
                  <select
                    value={userBook.status}
                    onChange={(e) => handleStatusChange(e.target.value)}
                    disabled={actionLoading}
                    className="border border-gray-300 rounded px-3 py-2 text-sm"
                  >
                    {Object.entries(STATUS_LABELS).map(([val, label]) => (
                      <option key={val} value={val}>{label}</option>
                    ))}
                  </select>
                  <div>
                    <span className="text-sm text-gray-600 mr-2">Your rating:</span>
                    <StarRating
                      rating={userBook.rating || 0}
                      interactive
                      onRate={handleRate}
                    />
                  </div>
                  <button
                    onClick={handleRemove}
                    className="text-red-600 hover:text-red-800 text-sm transition"
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
                        className="bg-shelf-600 hover:bg-shelf-700 text-white px-3 py-1.5 rounded text-sm transition disabled:opacity-50"
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
            <p className="mt-4 text-gray-700 leading-relaxed">{book.description}</p>
          )}
        </div>
      </div>

      {/* Content Ratings */}
      {book.content_rating && book.content_rating.count > 0 && (
        <div className="mb-8">
          <ContentRatingDisplay rating={book.content_rating} />
        </div>
      )}

      {/* Submit Content Rating */}
      {user && canRateContent && (
        <div className="mb-8">
          <button
            onClick={() => setShowCRForm(!showCRForm)}
            className="text-shelf-600 hover:text-shelf-800 text-sm font-medium transition"
          >
            {showCRForm
              ? 'Cancel'
              : myContentRating
              ? 'Update Your Content Rating'
              : 'Submit Content Rating'}
          </button>
          {showCRForm && (
            <div className="mt-3 bg-gray-50 border border-gray-200 rounded-lg p-4">
              <ContentRatingForm
                initial={myContentRating || undefined}
                onSubmit={handleSubmitContentRating}
                loading={actionLoading}
              />
            </div>
          )}
        </div>
      )}

      {/* Related Books */}
      {book.related_books.length > 0 && (
        <div className="mb-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-3">Related Books</h2>
          <div className="flex gap-4 overflow-x-auto pb-2">
            {book.related_books.map((rb) => (
              <Link
                key={rb.id}
                to={`/books/${rb.id}`}
                className="flex-shrink-0 w-32 text-center hover:opacity-80 transition"
              >
                {rb.cover_url ? (
                  <img src={rb.cover_url} alt={rb.title} className="w-32 h-48 object-cover rounded shadow" />
                ) : (
                  <div className="w-32 h-48 bg-gray-200 rounded flex items-center justify-center text-xs text-gray-400">
                    No Cover
                  </div>
                )}
                <p className="text-sm font-medium text-gray-800 mt-1 line-clamp-2">{rb.title}</p>
                <p className="text-xs text-gray-500">{rb.author}</p>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* Reviews */}
      <div>
        <h2 className="text-xl font-semibold text-gray-900 mb-4">
          Reviews ({book.reviews.length})
        </h2>

        {/* Write review */}
        {user && !myReview && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 mb-4">
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Write your review..."
              rows={4}
              className="w-full border border-gray-300 rounded px-3 py-2 text-sm focus:ring-2 focus:ring-shelf-400 outline-none"
            />
            <button
              onClick={handleSubmitReview}
              disabled={actionLoading || !reviewText.trim()}
              className="mt-2 bg-shelf-600 hover:bg-shelf-700 text-white px-4 py-2 rounded text-sm transition disabled:opacity-50"
            >
              Submit Review
            </button>
          </div>
        )}

        {book.reviews.length === 0 ? (
          <p className="text-gray-500 text-center py-6">No reviews yet</p>
        ) : (
          <div className="space-y-4">
            {book.reviews.map((review) => (
              <div key={review.id} className="bg-white border border-gray-200 rounded-lg p-4">
                <div className="flex justify-between items-start">
                  <div>
                    <span className="font-medium text-gray-900">{review.username}</span>
                    <span className="text-sm text-gray-500 ml-2">
                      {new Date(review.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  {user?.id === review.user_id && (
                    <div className="flex space-x-2 text-sm">
                      <button
                        onClick={() => {
                          setEditingReviewId(review.id);
                          setEditText(review.review_text);
                        }}
                        className="text-shelf-600 hover:text-shelf-800"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDeleteReview(review.id)}
                        className="text-red-600 hover:text-red-800"
                      >
                        Delete
                      </button>
                    </div>
                  )}
                </div>
                {editingReviewId === review.id ? (
                  <div className="mt-2">
                    <textarea
                      value={editText}
                      onChange={(e) => setEditText(e.target.value)}
                      rows={3}
                      className="w-full border border-gray-300 rounded px-3 py-2 text-sm"
                    />
                    <div className="flex space-x-2 mt-2">
                      <button
                        onClick={() => handleEditReview(review.id)}
                        className="bg-shelf-600 text-white px-3 py-1 rounded text-sm"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setEditingReviewId(null)}
                        className="text-gray-600 text-sm"
                      >
                        Cancel
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-2 text-gray-700">{review.review_text}</p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
