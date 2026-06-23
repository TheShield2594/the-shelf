'use client';

import { useState } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { BookCover } from './BookCover';
import type { BookSummary, GoodreadsPendingMatch } from '@/types';

interface GoodreadsReviewRowProps {
  pending: GoodreadsPendingMatch;
  onResolved: (status: 'imported' | 'already_in_library') => void;
}

export function GoodreadsReviewRow({ pending, onResolved }: GoodreadsReviewRowProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(`${pending.title} ${pending.author}`.trim());
  const [searching, setSearching] = useState(false);
  const [results, setResults] = useState<BookSummary[]>([]);
  const [matching, setMatching] = useState<string | null>(null);
  const [resolved, setResolved] = useState<'imported' | 'already_in_library' | null>(null);

  const handleSearch = async () => {
    if (!query.trim()) return;
    setSearching(true);
    try {
      setResults(await api.searchExternal(query, 8));
    } catch {
      setResults([]);
    } finally {
      setSearching(false);
    }
  };

  const handleSelect = async (book: BookSummary) => {
    if (!book.isbn) {
      showToast("That result has no ISBN, so it can't be matched.");
      return;
    }
    setMatching(book.isbn);
    try {
      const res = await api.resolveGoodreadsMatch(pending, book.isbn);
      setResolved(res.status);
      onResolved(res.status);
    } catch (err: any) {
      showToast(err.message || 'Failed to match book');
    } finally {
      setMatching(null);
    }
  };

  if (resolved) {
    return (
      <div className="flex items-center justify-between text-sm py-2 border-b border-stone-100 dark:border-gray-800 last:border-0">
        <span className="text-stone-600 dark:text-gray-400 truncate flex-1">{pending.title}</span>
        <span className="text-xs ml-2 text-emerald-500">
          {resolved === 'imported' ? 'matched' : 'already in library'}
        </span>
      </div>
    );
  }

  return (
    <div className="py-2 border-b border-stone-100 dark:border-gray-800 last:border-0">
      <div className="flex items-center justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="text-sm text-stone-700 dark:text-gray-300 truncate">{pending.title}</p>
          <p className="text-xs text-stone-400 dark:text-gray-600 truncate">{pending.author}</p>
        </div>
        <button
          onClick={() => setOpen((o) => !o)}
          className="btn-secondary text-xs whitespace-nowrap"
        >
          {open ? 'Close' : 'Find match'}
        </button>
      </div>

      {open && (
        <div className="mt-3 pl-1">
          <div className="flex gap-2 mb-3">
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search by title or author..."
              className="input-search flex-1 text-sm"
            />
            <button onClick={handleSearch} disabled={searching} className="btn-primary text-xs whitespace-nowrap">
              {searching ? 'Searching...' : 'Search'}
            </button>
          </div>

          {results.length > 0 && (
            <div className="space-y-2 max-h-72 overflow-y-auto">
              {results.map((book, i) => (
                <div key={`${book.isbn || book.title}-${i}`} className="flex items-center gap-3">
                  <BookCover coverUrl={book.cover_url} title={book.title} author={book.author} size="sm" />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-stone-700 dark:text-gray-300 truncate">{book.title}</p>
                    <p className="text-xs text-stone-400 dark:text-gray-600 truncate">{book.author}</p>
                  </div>
                  <button
                    onClick={() => handleSelect(book)}
                    disabled={matching !== null}
                    className="btn-primary text-xs whitespace-nowrap"
                  >
                    {matching === book.isbn ? '...' : 'Select'}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
