'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import dynamic from 'next/dynamic';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { BookCover } from '@/components/BookCover';
import { StarRating } from '@/components/StarRating';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { Book } from '@/types';

// Lazy-load recharts only when radar chart is actually displayed
const RadarChart = dynamic(() => import('@/components/RadarChart').then(m => m.RadarChart), {
  ssr: false,
  loading: () => <div className="h-64" />,
});

export default function BookDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const bookId = Number(params.id);
  const [book, setBook] = useState<Book | null>(null);
  const [loading, setLoading] = useState(true);
  const [inLibrary, setInLibrary] = useState(false);
  const [libStatus, setLibStatus] = useState<string>('');
  const [myRating, setMyRating] = useState<number | null>(null);
  const [reviewText, setReviewText] = useState('');
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [reviewError, setReviewError] = useState('');
  const [showRadarChart, setShowRadarChart] = useState(false);

  useEffect(() => {
    if (isNaN(bookId)) {
      setLoading(false);
      return;
    }
    api.getBook(bookId)
      .then((b) => {
        setBook(b);
        setLoading(false);
      })
      .catch(() => setLoading(false));

    if (user) {
      // Use cached library data — avoids full refetch when available
      api.getLibrary().then((libs) => {
        const entry = libs.find((l) => l.book_id === bookId);
        if (entry) {
          setInLibrary(true);
          setLibStatus(entry.status);
          setMyRating(entry.rating);
        }
      }).catch(() => {});
    }
  }, [bookId, user]);

  const handleAddToLibrary = async (status: string) => {
    try {
      await api.addToLibrary(bookId, status);
      setInLibrary(true);
      setLibStatus(status);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleUpdateStatus = async (status: string) => {
    try {
      await api.updateLibraryEntry(bookId, { status });
      setLibStatus(status);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRate = async (rating: number) => {
    try {
      await api.updateLibraryEntry(bookId, { rating });
      setMyRating(rating);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleRemoveFromLibrary = async () => {
    try {
      await api.removeFromLibrary(bookId);
      setInLibrary(false);
      setLibStatus('');
      setMyRating(null);
    } catch (err: any) {
      alert(err.message);
    }
  };

  const handleSubmitReview = async () => {
    if (!reviewText.trim()) return;
    setReviewError('');
    try {
      await api.createReview(bookId, reviewText);
      setReviewText('');
      setShowReviewForm(false);
      // Re-fetch book with fresh review data (cache was invalidated by createReview)
      const updated = await api.getBook(bookId);
      setBook(updated);
    } catch (err: any) {
      setReviewError(err.message || 'Failed to post review');
    }
  };

  if (loading) return <LoadingSpinner label="Loading book..." />;
  if (isNaN(bookId)) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-stone-500 dark:text-gray-400">Invalid book ID.</div>;
  if (!book) return <div className="max-w-4xl mx-auto px-4 py-16 text-center text-stone-500 dark:text-gray-400">Book not found.</div>;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => router.back()} className="text-sm text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-gray-100 mb-6 flex items-center gap-1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        Back
      </button>

      <div className="flex flex-col sm:flex-row gap-8 mb-8">
        <div className="flex-shrink-0 mx-auto sm:mx-0">
          <BookCover coverUrl={book.cover_url} title={book.title} author={book.author} size="xl" />
        </div>
        <div className="flex-1">
          <h1 className="text-3xl font-serif font-bold text-stone-900 dark:text-gray-100 mb-2">{book.title}</h1>
          <p className="text-lg text-stone-600 dark:text-gray-400 mb-4">by {book.author}</p>

          {book.genres.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-4">
              {book.genres.map((g) => (
                <span key={g.id} className="px-3 py-1 rounded-full text-xs bg-stone-100 dark:bg-gray-800 text-stone-600 dark:text-gray-400">{g.name}</span>
              ))}
            </div>
          )}

          {book.avg_rating && book.rating_count > 0 && (
            <div className="flex items-center gap-2 mb-4">
              <StarRating value={book.avg_rating} size="lg" readOnly />
              <span className="text-sm text-stone-500 dark:text-gray-400">{book.avg_rating} ({book.rating_count} rating{book.rating_count !== 1 ? 's' : ''})</span>
            </div>
          )}

          {book.isbn && <p className="text-xs text-stone-400 dark:text-gray-600 mb-4">ISBN: {book.isbn}</p>}

          {book.description && (
            <p className="text-stone-600 dark:text-gray-400 leading-relaxed mb-6">{book.description}</p>
          )}

          {/* Radar chart toggle — lazy loaded only when requested */}
          <div className="mb-6">
            <button
              onClick={() => setShowRadarChart(!showRadarChart)}
              className="text-sm text-shelf-700 dark:text-shelf-500 hover:underline"
            >
              {showRadarChart ? 'Hide' : 'Show'} Rating Dimensions
            </button>
            {showRadarChart && <RadarChart bookId={bookId} />}
          </div>

          {/* Library actions */}
          {user ? (
            <div className="space-y-3">
              {inLibrary ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2">
                    <select
                      value={libStatus}
                      onChange={(e) => handleUpdateStatus(e.target.value)}
                      className="input max-w-xs"
                    >
                      <option value="want_to_read">Want to Read</option>
                      <option value="currently_reading">Currently Reading</option>
                      <option value="finished">Finished</option>
                      <option value="dnf">Did Not Finish</option>
                    </select>
                    <button onClick={handleRemoveFromLibrary} className="btn-ghost text-sm">Remove</button>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-sm text-stone-600 dark:text-gray-400">Your rating:</span>
                    <StarRating value={myRating} onChange={handleRate} />
                  </div>
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  <button onClick={() => handleAddToLibrary('want_to_read')} className="btn-secondary text-sm">Want to Read</button>
                  <button onClick={() => handleAddToLibrary('currently_reading')} className="btn-secondary text-sm">Currently Reading</button>
                  <button onClick={() => handleAddToLibrary('finished')} className="btn-primary text-sm">Finished</button>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-stone-500 dark:text-gray-400">Login to add this book to your library.</p>
          )}
        </div>
      </div>

      {/* Reviews */}
      <div className="border-t border-stone-200 dark:border-gray-800 pt-8">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-serif font-semibold text-stone-800 dark:text-gray-200">
            Reviews {book.reviews && book.reviews.length > 0 && `(${book.reviews.length})`}
          </h2>
          {user && !showReviewForm && (
            <button onClick={() => setShowReviewForm(true)} className="btn-secondary text-sm">Write a Review</button>
          )}
        </div>

        {showReviewForm && (
          <div className="card p-4 mb-6">
            {reviewError && (
              <div className="mb-3 p-3 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm">
                {reviewError}
              </div>
            )}
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your thoughts..."
              className="input min-h-[120px] mb-3"
            />
            <div className="flex justify-end gap-2">
              <button onClick={() => setShowReviewForm(false)} className="btn-ghost text-sm">Cancel</button>
              <button onClick={handleSubmitReview} className="btn-primary text-sm">Post Review</button>
            </div>
          </div>
        )

        {book.reviews && book.reviews.length > 0 ? (
          <div className="space-y-4">
            {book.reviews.map((review) => (
              <div key={review.id} className="card p-4">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-shelf-700 dark:text-shelf-500">{review.username}</span>
                  <span className="text-xs text-stone-400 dark:text-gray-600">
                    {new Date(review.created_at).toLocaleDateString()}
                  </span>
                </div>
                <p className="text-sm text-stone-600 dark:text-gray-400 whitespace-pre-wrap">{review.review_text}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-stone-500 dark:text-gray-400 text-sm">No reviews yet. Be the first to review this book!</p>
        )}
      </div>
    </div>
  );
