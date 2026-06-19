'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { BookCard } from '@/components/BookCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import type { BookSummary } from '@/types';

export default function AuthorPage() {
  const params = useParams();
  const router = useRouter();
  const authorName = decodeURIComponent(String(params.name || ''));
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!authorName) {
      setLoading(false);
      return;
    }
    const controller = new AbortController();
    api.getBooks({ q: authorName }, controller.signal)
      .then((results) => {
        if (controller.signal.aborted) return;
        setBooks(results.filter((b) => b.author.toLowerCase().includes(authorName.toLowerCase())));
        setLoading(false);
      })
      .catch(() => {
        if (!controller.signal.aborted) setLoading(false);
      });
    return () => controller.abort();
  }, [authorName]);

  if (loading) return <LoadingSpinner label="Loading author..." />;

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <button onClick={() => router.back()} className="text-sm text-stone-500 dark:text-gray-400 hover:text-stone-900 dark:hover:text-gray-100 mb-6 flex items-center gap-1">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M19 12H5M12 19l-7-7 7-7" /></svg>
        Back
      </button>

      <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-gray-100 mb-1">{authorName}</h1>
      <p className="text-sm text-stone-500 dark:text-gray-400 mb-6">
        {books.length} book{books.length !== 1 ? 's' : ''} in your shelf
      </p>

      {books.length === 0 ? (
        <EmptyState title="No books found" description="No books by this author are in your shelf yet." />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 items-stretch">
          {books.map((book) => (
            <BookCard key={book.id} book={book} />
          ))}
        </div>
      )}
    </div>
  );
}
