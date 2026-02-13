import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { api } from '../services/api';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
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
import { Button, Badge, Select, Modal, ModalFooter, Tabs, TabsList, TabsTrigger, TabsContent, BookDetailSkeleton } from '../components/ui';

export default function BookDetailPage() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const toast = useToast();
  const [book, setBook] = useState<BookDetail | null>(null);
  const [userBook, setUserBook] = useState<UserBook | null>(null);
  const [myContentRating, setMyContentRating] = useState<ContentRating | null>(null);
  const [showCRForm, setShowCRForm] = useState(false);
  const [showRemoveModal, setShowRemoveModal] = useState(false);
  const [reviewText, setReviewText] = useState('');
  const [editingReviewId, setEditingReviewId] = useState<number | null>(null);
  const [editText, setEditText] = useState('');
  const [loading, setLoading] = useState(true);
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
    } catch (error: any) {
      toast.error(error.message || 'Failed to load book details');
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
      toast.success(`Added to ${STATUS_LABELS[status]}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to add book to library');
    }
    setActionLoading(false);
  };

  const handleStatusChange = async (status: string) => {
    setActionLoading(true);
    try {
      await api.updateLibraryEntry(bookId, { status });
      await fetchData();
      toast.success(`Moved to ${STATUS_LABELS[status as ReadingStatus]}`);
    } catch (error: any) {
      toast.error(error.message || 'Failed to update status');
    }
    setActionLoading(false);
  };

  const handleRate = async (rating: number) => {
    try {
      await api.updateLibraryEntry(bookId, { rating });
      await fetchData();
      toast.success('Rating saved!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to save rating');
    }
  };

  const handleRemove = async () => {
    setActionLoading(true);
    setShowRemoveModal(false);
    try {
      await api.removeFromLibrary(bookId);
      setUserBook(null);
      await fetchData();
      toast.success('Removed from library');
    } catch (error: any) {
      toast.error(error.message || 'Failed to remove book');
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
      toast.success('Review posted!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to post review');
    }
    setActionLoading(false);
  };

  const handleEditReview = async (reviewId: number) => {
    setActionLoading(true);
    try {
      await api.updateReview(reviewId, { review_text: editText });
      setEditingReviewId(null);
      await fetchData();
      toast.success('Review updated!');
    } catch (error: any) {
      toast.error(error.message || 'Failed to update review');
    }
    setActionLoading(false);
  };

  const handleDeleteReview = async (reviewId: number) => {
    try {
      await api.deleteReview(reviewId);
      await fetchData();
      toast.success('Review deleted');
    } catch (error: any) {
      toast.error(error.message || 'Failed to delete review');
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
        toast.success('Content rating updated!');
      } else {
        await api.createContentRating({ book_id: bookId, ...data });
        toast.success('Content rating submitted!');
      }
      setShowCRForm(false);
      await fetchData();
    } catch (error: any) {
      toast.error(error.message || 'Failed to submit content rating');
    }
    setActionLoading(false);
  };

  if (loading) return <BookDetailSkeleton />;
  if (!book) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Book not found</p>
        </div>
      </div>
    );
  }

  const canRateContent = userBook?.status === 'finished';
  const myReview = book.reviews.find((r) => r.user_id === user?.id);

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Hero Section */}
      <div className="bg-gradient-to-br from-shelf-50 via-white to-gray-50 dark:from-gray-800 dark:via-gray-900 dark:to-gray-900 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-6xl mx-auto px-4 py-12">
          <div className="grid md:grid-cols-[280px_1fr] gap-8">
            {/* Cover Image */}
            <div className="flex justify-center md:justify-start">
              {book.cover_url ? (
                <img
                  src={book.cover_url}
                  alt={`Cover of ${book.title}`}
                  className="w-full max-w-[280px] rounded-xl shadow-2xl"
                />
              ) : (
                <div className="w-full max-w-[280px] h-[420px] bg-gray-200 dark:bg-gray-700 rounded-xl flex items-center justify-center text-gray-400 dark:text-gray-500">
                  <div className="text-center p-4">
                    <svg className="w-16 h-16 mx-auto mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                    </svg>
                    <span>No Cover</span>
                  </div>
                </div>
              )}
            </div>

            {/* Book Info & Actions */}
            <div className="flex flex-col">
              <div className="flex-1">
                <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">{book.title}</h1>
                <p className="text-xl text-gray-600 dark:text-gray-400 mb-4">by {book.author}</p>

                {/* Metadata */}
                <div className="flex flex-wrap gap-2 mb-4">
                  {book.genres.map((g) => (
                    <Badge key={g.id} variant="default">
                      {g.name}
                    </Badge>
                  ))}
                </div>

                {/* Rating */}
                {book.avg_rating !== null && (
                  <div className="flex items-center gap-3 mb-6">
                    <StarRating rating={book.avg_rating} size="lg" />
                    <span className="text-lg text-gray-600 dark:text-gray-400">
                      {book.avg_rating.toFixed(1)} ({book.rating_count} {book.rating_count === 1 ? 'rating' : 'ratings'})
                    </span>
                  </div>
                )}

                {/* Publication Info */}
                {(book.isbn || book.publication_date) && (
                  <div className="space-y-1 mb-6 text-sm text-gray-600 dark:text-gray-400">
                    {book.isbn && <p>ISBN: {book.isbn}</p>}
                    {book.publication_date && (
                      <p>Published: {new Date(book.publication_date).toLocaleDateString()}</p>
                    )}
                  </div>
                )}

                {/* Action Buttons */}
                {user && (
                  <div className="space-y-4">
                    {userBook ? (
                      <>
                        <div className="flex flex-wrap items-center gap-3">
                          <Select
                            value={userBook.status}
                            onChange={(e) => handleStatusChange(e.target.value)}
                            aria-label="Change reading status"
                            className="w-auto"
                          >
                            {Object.entries(STATUS_LABELS).map(([val, label]) => (
                              <option key={val} value={val}>
                                {label}
                              </option>
                            ))}
                          </Select>
                          <Button
                            variant="danger"
                            size="sm"
                            onClick={() => setShowRemoveModal(true)}
                            disabled={actionLoading}
                          >
                            Remove from Library
                          </Button>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Your rating:</span>
                          <StarRating
                            rating={userBook.rating || 0}
                            interactive
                            onRate={handleRate}
                          />
                        </div>
                      </>
                    ) : (
                      <div className="flex flex-wrap gap-2">
                        {(Object.entries(STATUS_LABELS) as [ReadingStatus, string][]).map(
                          ([val, label]) => (
                            <Button
                              key={val}
                              variant="primary"
                              onClick={() => handleAddToLibrary(val)}
                              disabled={actionLoading}
                              loading={actionLoading}
                            >
                              {label}
                            </Button>
                          )
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Tabbed Content */}
      <div className="max-w-6xl mx-auto px-4 py-8">
        <Tabs defaultValue="details">
          <TabsList>
            <TabsTrigger value="details">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Details
            </TabsTrigger>
            <TabsTrigger value="reviews">
              <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
              </svg>
              Reviews ({book.reviews.length})
            </TabsTrigger>
            {book.content_rating && book.content_rating.count > 0 && (
              <TabsTrigger value="content">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
                Content Ratings
              </TabsTrigger>
            )}
            {book.related_books.length > 0 && (
              <TabsTrigger value="related">
                <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                Related Books ({book.related_books.length})
              </TabsTrigger>
            )}
          </TabsList>

          {/* Details Tab */}
          <TabsContent value="details">
            <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
              <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">Description</h2>
              {book.description ? (
                <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                  {book.description}
                </p>
              ) : (
                <p className="text-gray-500 dark:text-gray-400 italic">No description available</p>
              )}
            </div>
          </TabsContent>

          {/* Reviews Tab */}
          <TabsContent value="reviews">
            <div className="space-y-4">
              {/* Write Review */}
              {user && !myReview && (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">Write a Review</h3>
                  <textarea
                    value={reviewText}
                    onChange={(e) => setReviewText(e.target.value)}
                    placeholder="Share your thoughts about this book..."
                    rows={4}
                    className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-3 text-sm focus:ring-2 focus:ring-shelf-400 focus:border-shelf-400 outline-none bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                  />
                  <div className="mt-3 flex justify-end">
                    <Button
                      onClick={handleSubmitReview}
                      disabled={actionLoading || !reviewText.trim()}
                      loading={actionLoading}
                    >
                      Post Review
                    </Button>
                  </div>
                </div>
              )}

              {/* Reviews List */}
              {book.reviews.length === 0 ? (
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
                  <svg className="w-12 h-12 mx-auto mb-3 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                  </svg>
                  <p className="text-gray-500 dark:text-gray-400">No reviews yet. Be the first to review!</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {book.reviews.map((review) => (
                    <div key={review.id} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                      <div className="flex justify-between items-start mb-3">
                        <div>
                          <span className="font-semibold text-gray-900 dark:text-gray-100">{review.username}</span>
                          <span className="text-sm text-gray-500 dark:text-gray-400 ml-3">
                            {new Date(review.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {user?.id === review.user_id && (
                          <div className="flex gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => {
                                setEditingReviewId(review.id);
                                setEditText(review.review_text);
                              }}
                            >
                              Edit
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteReview(review.id)}
                            >
                              Delete
                            </Button>
                          </div>
                        )}
                      </div>
                      {editingReviewId === review.id ? (
                        <div>
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            rows={3}
                            className="w-full border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                          />
                          <div className="flex gap-2 mt-2">
                            <Button
                              size="sm"
                              onClick={() => handleEditReview(review.id)}
                              loading={actionLoading}
                            >
                              Save
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => setEditingReviewId(null)}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <p className="text-gray-700 dark:text-gray-300 leading-relaxed whitespace-pre-wrap">
                          {review.review_text}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </TabsContent>

          {/* Content Ratings Tab */}
          {book.content_rating && book.content_rating.count > 0 && (
            <TabsContent value="content">
              <div className="space-y-6">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                  <ContentRatingDisplay rating={book.content_rating} />
                </div>

                {user && canRateContent && (
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-6">
                    <div className="flex justify-between items-center mb-4">
                      <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                        {myContentRating ? 'Update Your Content Rating' : 'Submit Content Rating'}
                      </h3>
                      {!showCRForm && (
                        <Button onClick={() => setShowCRForm(true)}>
                          {myContentRating ? 'Update Rating' : 'Add Rating'}
                        </Button>
                      )}
                    </div>
                    {showCRForm && (
                      <ContentRatingForm
                        initial={myContentRating || undefined}
                        onSubmit={handleSubmitContentRating}
                        loading={actionLoading}
                      />
                    )}
                  </div>
                )}

                {user && !canRateContent && !userBook && (
                  <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 text-sm text-blue-800 dark:text-blue-200">
                    Add this book to your library and mark it as "Finished" to submit a content rating.
                  </div>
                )}
              </div>
            </TabsContent>
          )}

          {/* Related Books Tab */}
          {book.related_books.length > 0 && (
            <TabsContent value="related">
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {book.related_books.map((rb) => (
                  <Link
                    key={rb.id}
                    to={`/books/${rb.id}`}
                    className="group text-center"
                  >
                    <div className="relative overflow-hidden rounded-lg shadow-sm hover:shadow-xl transition-all duration-300 mb-2 bg-gray-200 dark:bg-gray-700">
                      {rb.cover_url ? (
                        <img
                          src={rb.cover_url}
                          alt={`Cover of ${rb.title}`}
                          className="w-full aspect-[2/3] object-cover group-hover:scale-105 transition-transform duration-300"
                        />
                      ) : (
                        <div className="w-full aspect-[2/3] flex items-center justify-center text-gray-400 dark:text-gray-500">
                          <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                          </svg>
                        </div>
                      )}
                    </div>
                    <p className="text-sm font-medium text-gray-800 dark:text-gray-200 line-clamp-2 group-hover:text-shelf-600 dark:group-hover:text-shelf-400 transition-colors">
                      {rb.title}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{rb.author}</p>
                  </Link>
                ))}
              </div>
            </TabsContent>
          )}
        </Tabs>
      </div>

      {/* Remove Confirmation Modal */}
      <Modal
        isOpen={showRemoveModal}
        onClose={() => setShowRemoveModal(false)}
        title="Remove from Library"
      >
        <p className="text-gray-700 dark:text-gray-300 mb-4">
          Are you sure you want to remove <strong>{book.title}</strong> from your library?
        </p>
        <ModalFooter>
          <Button variant="ghost" onClick={() => setShowRemoveModal(false)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={handleRemove} loading={actionLoading}>
            Remove
          </Button>
        </ModalFooter>
      </Modal>
    </div>
  );
}
