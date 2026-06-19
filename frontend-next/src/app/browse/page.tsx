'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { api } from '@/lib/api';
import { useToast } from '@/components/ToastProvider';
import { BookCard } from '@/components/BookCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import { BookDetailModal } from '@/components/BookDetailModal';
import { Tooltip } from '@/components/Tooltip';
import type { BookSummary } from '@/types';

export default function BrowsePage() {
  const { showToast } = useToast();
  const [books, setBooks] = useState<BookSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [searchMode, setSearchMode] = useState<'shelf' | 'external'>('shelf');
  const [externalResults, setExternalResults] = useState<BookSummary[]>([]);
  const [importing, setImporting] = useState<number | null>(null);
  const [importedKeys, setImportedKeys] = useState<Set<string>>(new Set());
  const [previewBook, setPreviewBook] = useState<BookSummary | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const loadBooks = useCallback(async () => {
    // Cancel any in-flight request
    abortControllerRef.current?.abort();
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    try {
      // Pass the AbortController signal so the fetch can actually be cancelled
      const results = await api.getBooks(
        query ? { q: query, limit: '40' } : { limit: '40' },
        controller.signal
      );
      // Only update state if this is the latest request
      if (!controller.signal.aborted) {
        setBooks(results);
      }
    } catch {
      if (!controller.signal.aborted) {
        setBooks([]);
      }
    } finally {
      if (!controller.signal.aborted) {
        setLoading(false);
      }
    }
  }, [query]);

  useEffect(() => {
    // Skip debounced shelf search when in external mode
    if (searchMode !== 'shelf') return;
    const timer = setTimeout(loadBooks, 300);
    return () => {
      clearTimeout(timer);
      // Abort any in-flight request when effect cleans up
      // (e.g., component unmount or searchMode changes)
      abortControllerRef.current?.abort();
    };
  }, [loadBooks, searchMode]);

  const handleExternalSearch = async () => {
    if (!query) return;
    setLoading(true);
    try {
      const results = await api.searchExternal(query, 20);
      setExternalResults(results);
    } catch {
      setExternalResults([]);
    } finally {
      setLoading(false);
    }
  };

  const bookKey = (book: BookSummary) => book.isbn || `${book.title.toLowerCase()}-${book.author.toLowerCase()}`;

  const handleImport = async (book: BookSummary, idx: number) => {
    setImporting(idx);
    try {
      const created = await api.createBook({
        title: book.title,
        author: book.author,
        isbn: book.isbn,
        cover_url: book.cover_url,
        publication_date: book.publication_date,
      });
      setBooks((prev) => [created, ...prev]);
      setImportedKeys((prev) => new Set(prev).add(bookKey(book)));
    } catch (err: any) {
      showToast(err.message || 'Failed to import book');
    } finally {
      setImporting(null);
    }
  };

  const handleRemoveBook = async (book: BookSummary) => {
    if (!book.id) return;
    if (!confirm(`Remove "${book.title}" from your shelf catalog? This is permanent and also removes it from your library.`)) return;
    try {
      await api.deleteBook(book.id);
      setBooks((prev) => prev.filter((b) => b.id !== book.id));
    } catch (err: any) {
      showToast(err.message || 'Failed to remove book');
    }
  };

  const displayBooks = searchMode === 'external' ? externalResults : books;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-gray-100 mb-6">
        Browse Books
      </h1>

      {/* Search bar */}
      <div className="flex gap-2 mb-4">
        <div className="flex-1 relative">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-stone-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8" /><path d="M21 21l-4.35-4.35" />
          </svg>
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && searchMode === 'external' && handleExternalSearch()}
            placeholder="Search by title or author..."
            className="input-search pl-10"
          />
        </div>
        {searchMode === 'external' && (
          <button onClick={handleExternalSearch} className="btn-primary whitespace-nowrap">Search</button>
        )}
      </div>

      {/* Mode toggle */}
      <div className="flex items-center gap-2 mb-6">
        <button
          onClick={() => { setSearchMode('shelf'); setExternalResults([]); }}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            searchMode === 'shelf'
              ? 'bg-shelf-700 text-white dark:bg-shelf-600'
              : 'bg-stone-100 dark:bg-gray-800 text-stone-600 dark:text-gray-400'
          }`}
        >
          On Your Shelf
        </button>
        <Tooltip text="These are all the books already in your shelf's catalog. Hover a cover and click Remove to permanently delete a book from the catalog and your library (this can't be undone)." />
        <button
          onClick={() => setSearchMode('external')}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            searchMode === 'external'
              ? 'bg-shelf-700 text-white dark:bg-shelf-600'
              : 'bg-stone-100 dark:bg-gray-800 text-stone-600 dark:text-gray-400'
          }`}
        >
          Search OpenLibrary
        </button>
      </div>

      {loading ? (
        <LoadingSpinner label="Searching..." />
      ) : displayBooks.length === 0 ? (
        <EmptyState
          title={searchMode === 'external' ? 'No results found' : 'No books yet'}
          description={searchMode === 'external' ? 'Try a different search term.' : 'Add books by scanning a barcode or importing from Goodreads.'}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-stretch [grid-auto-flow:dense]">
          {displayBooks.map((book, idx) => {
            const alreadyImported = searchMode === 'external' && importedKeys.has(bookKey(book));
            // Stagger the grid: every 6th tile gets a featured (larger) treatment
            // if it's a standout rating, so the shelf doesn't read as one flat grid.
            const featured = idx % 6 === 2 && (book.avg_rating ?? 0) >= 4;
            return (
              <div key={`${book.id || book.isbn}-${idx}`} className={`relative group/tile h-full ${featured ? 'col-span-2 row-span-2' : ''}`}>
                {searchMode === 'external' && !book.id ? (
                  <button onClick={() => setPreviewBook(book)} className="group block w-full h-full text-left">
                    <BookCard book={book} featured={featured} />
                  </button>
                ) : (
                  <div className="h-full">
                    <BookCard book={book} featured={featured} />
                  </div>
                )}
                {searchMode === 'external' && !book.id && (
                  <button
                    onClick={() => handleImport(book, idx)}
                    disabled={importing === idx || alreadyImported}
                    className="absolute top-2 right-2 bg-shelf-700 hover:bg-shelf-800 text-white rounded-lg px-2 py-1 text-xs shadow-md transition-colors disabled:opacity-50"
                  >
                    {importing === idx ? '...' : alreadyImported ? 'Added' : '+ Add'}
                  </button>
                )}
                {searchMode === 'shelf' && book.id && (
                  <button
                    onClick={() => handleRemoveBook(book)}
                    className="absolute top-2 right-2 bg-white/90 dark:bg-gray-900/90 backdrop-blur-sm text-red-600 dark:text-red-400 border border-red-200 dark:border-red-900 rounded-lg px-2 py-1 text-xs shadow-md transition-all opacity-0 group-hover/tile:opacity-100"
                  >
                    Remove
                  </button>
                )}
              </div>
            );
          })}
        </div>
      )}

      {previewBook && (
        <BookDetailModal book={previewBook} onClose={() => setPreviewBook(null)} />
      )}
    </div>
  );
}
