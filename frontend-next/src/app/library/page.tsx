'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { useToast } from '@/components/ToastProvider';
import { BookCover } from '@/components/BookCover';
import { StarRating } from '@/components/StarRating';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { Tooltip } from '@/components/Tooltip';
import type { UserBook } from '@/types';

const STATUS_TABS = [
  { key: '', label: 'All' },
  { key: 'currently_reading', label: 'Reading' },
  { key: 'want_to_read', label: 'Want to Read' },
  { key: 'finished', label: 'Finished' },
  { key: 'dnf', label: 'DNF' },
];

export default function LibraryPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const { showToast } = useToast();
  const [books, setBooks] = useState<UserBook[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('');
  const abortControllerRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    loadBooks();
    return () => abortControllerRef.current?.abort();
  }, [user, authLoading, activeTab]);

  const loadBooks = async () => {
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      const results = await api.getLibrary(activeTab || undefined, controller.signal);
      if (!controller.signal.aborted) setBooks(results);
    } catch {
      if (!controller.signal.aborted) setBooks([]);
    } finally {
      if (!controller.signal.aborted) setLoading(false);
    }
  };

  const handleStatusChange = async (bookId: number, status: string) => {
    try {
      await api.updateLibraryEntry(bookId, { status });
      loadBooks();
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleRate = async (bookId: number, rating: number) => {
    try {
      await api.updateLibraryEntry(bookId, { rating });
      setBooks((prev) =>
        prev.map((ub) =>
          ub.book_id === bookId ? { ...ub, rating } : ub
        )
      );
    } catch (err: any) {
      showToast(err.message);
    }
  };

  const handleRemove = async (bookId: number) => {
    if (!confirm('Remove this book from your library?')) return;
    try {
      await api.removeFromLibrary(bookId);
      loadBooks();
    } catch (err: any) {
      showToast(err.message);
    }
  };

  if (authLoading || (!user && !authLoading)) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-gray-100 mb-6 flex items-center gap-2">
        My Library
        <Tooltip text="This is your shelf — every book you've added lives here. Use the Remove button on a book if it was added by accident." />
      </h1>

      {/* Status tabs */}
      <div className="flex gap-2 mb-6 overflow-x-auto pb-2">
        {STATUS_TABS.map((tab) => (
          <button
            key={tab.key}
            onClick={() => setActiveTab(tab.key)}
            className={`px-4 py-2 rounded-lg text-sm font-medium whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'bg-shelf-700 text-white dark:bg-shelf-600'
                : 'bg-stone-100 dark:bg-gray-800 text-stone-600 dark:text-gray-400'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {loading ? (
        <LoadingSpinner label="Loading library..." />
      ) : books.length === 0 ? (
        <EmptyState
          title="Your library is empty"
          description="Add books by browsing, scanning barcodes, or importing from Goodreads."
          icon={<svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5"><path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"/><path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"/></svg>}
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 items-start">
          {books.map((ub) => (
            <div key={ub.id} className="card p-4 flex gap-4">
              <a href={`/books/${ub.book_id}`} className="flex-shrink-0">
                <BookCover coverUrl={ub.book.cover_url} title={ub.book.title} author={ub.book.author} size="sm" />
              </a>
              <div className="flex-1 min-w-0">
                <a href={`/books/${ub.book_id}`}>
                  <h3 className="font-serif font-semibold text-sm text-stone-900 dark:text-gray-100 line-clamp-2 hover:text-shelf-700 dark:hover:text-shelf-500 transition-colors">
                    {ub.book.title}
                  </h3>
                </a>
                <p className="text-xs text-stone-500 dark:text-gray-400 line-clamp-1 mb-2">{ub.book.author}</p>

                <select
                  value={ub.status}
                  onChange={(e) => handleStatusChange(ub.book_id, e.target.value)}
                  className="w-full text-xs rounded-lg border border-stone-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-stone-700 dark:text-gray-300 mb-2"
                >
                  <option value="want_to_read">Want to Read</option>
                  <option value="currently_reading">Currently Reading</option>
                  <option value="finished">Finished</option>
                  <option value="dnf">DNF</option>
                </select>

                <div className="flex items-center gap-2">
                  <StarRating value={ub.rating} onChange={(r) => handleRate(ub.book_id, r)} size="sm" />
                  <button onClick={() => handleRemove(ub.book_id)} className="ml-auto text-xs text-red-500 hover:text-red-600 dark:text-red-400">Remove</button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
