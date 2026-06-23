'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { BookCard } from '@/components/BookCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { BookDetailModal } from '@/components/BookDetailModal';
import type { BookSummary, TrendingBook, TrendingResponse } from '@/types';

function toBookSummary(b: TrendingBook): BookSummary {
  return {
    id: b.book_id ?? undefined,
    title: b.title,
    author: b.author,
    isbn: b.isbn ?? undefined,
    description: b.description ?? undefined,
    cover_url: b.cover_url ?? undefined,
    genres: [],
    rating_count: 0,
  };
}

const bookKey = (b: TrendingBook) => b.isbn || `${b.title.toLowerCase()}-${b.author.toLowerCase()}`;

export default function TrendingPage() {
  const { showToast } = useToast();
  const [data, setData] = useState<TrendingResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [importing, setImporting] = useState<string | null>(null);
  const [importedKeys, setImportedKeys] = useState<Set<string>>(new Set());
  const [previewBook, setPreviewBook] = useState<BookSummary | null>(null);

  useEffect(() => {
    api
      .getTrending()
      .then(setData)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  const handleImport = async (b: TrendingBook) => {
    setImporting(bookKey(b));
    try {
      await api.createBook({
        title: b.title,
        author: b.author,
        isbn: b.isbn ?? undefined,
        cover_url: b.cover_url ?? undefined,
      });
      setImportedKeys((prev) => new Set(prev).add(bookKey(b)));
      showToast(`Added "${b.title}" to your shelf`, 'success');
    } catch (err: any) {
      showToast(err.message || 'Failed to add book');
    } finally {
      setImporting(null);
    }
  };

  if (loading) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <LoadingSpinner label="Loading trending books..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-gray-100 mb-6">
          Trending Books
        </h1>
        <EmptyState
          title="Couldn't load trending books"
          description="Something went wrong fetching the bestseller lists. Please try again later."
        />
      </div>
    );
  }

  if (!data?.enabled) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-gray-100 mb-6">
          Trending Books
        </h1>
        <EmptyState
          title="Trending Books isn't set up"
          description="This self-hosted instance hasn't configured an NYT Books API key. Set NYT_BOOKS_API_KEY in the backend environment to enable current bestseller lists."
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-gray-100 mb-2">
        Trending Books
      </h1>
      <p className="text-sm text-stone-500 dark:text-gray-400 mb-8">
        Current New York Times Best Sellers.
      </p>

      {data.lists.length === 0 ? (
        <EmptyState title="No trending lists available" description="Try again later." />
      ) : (
        data.lists.map((list) => (
          <section key={list.list_name} className="mb-10">
            <h2 className="text-lg font-serif font-semibold text-stone-800 dark:text-gray-200 mb-4">
              {list.display_name}
            </h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-stretch">
              {list.books.map((b) => {
                const summary = toBookSummary(b);
                const imported = importedKeys.has(bookKey(b));
                return (
                  <div key={`${list.list_name}-${b.rank}`} className="relative group/tile h-full">
                    <span className="absolute top-2 left-2 z-10 bg-shelf-700 text-white text-xs font-bold rounded-full w-6 h-6 flex items-center justify-center shadow-md">
                      {b.rank}
                    </span>
                    {summary.id ? (
                      <div className="h-full">
                        <BookCard book={summary} />
                      </div>
                    ) : (
                      <button onClick={() => setPreviewBook(summary)} className="group block w-full h-full text-left">
                        <BookCard book={summary} />
                      </button>
                    )}
                    {!summary.id && (
                      <button
                        onClick={() => handleImport(b)}
                        disabled={importing === bookKey(b) || imported}
                        className="absolute top-2 right-2 bg-shelf-700 hover:bg-shelf-800 text-white rounded-lg px-2 py-1 text-xs shadow-md transition-colors disabled:opacity-50"
                      >
                        {importing === bookKey(b) ? '...' : imported ? 'Added' : '+ Add'}
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          </section>
        ))
      )}

      {previewBook && <BookDetailModal book={previewBook} onClose={() => setPreviewBook(null)} />}
    </div>
  );
}
