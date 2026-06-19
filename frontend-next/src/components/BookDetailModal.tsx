'use client';

import { useEffect } from 'react';
import { BookCover } from './BookCover';
import type { BookSummary } from '@/types';

interface BookDetailModalProps {
  book: BookSummary;
  onClose: () => void;
}

export function BookDetailModal({ book, onClose }: BookDetailModalProps) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 px-4"
      onClick={onClose}
    >
      <div
        className="card max-w-lg w-full p-6 max-h-[85vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex justify-between items-start mb-4">
          <h2 className="text-xl font-serif font-bold text-stone-900 dark:text-gray-100 pr-4">
            {book.title}
          </h2>
          <button
            onClick={onClose}
            aria-label="Close"
            className="text-stone-400 hover:text-stone-700 dark:text-gray-500 dark:hover:text-gray-200 text-2xl leading-none"
          >
            &times;
          </button>
        </div>

        <div className="flex gap-4 mb-4">
          <BookCover coverUrl={book.cover_url} title={book.title} author={book.author} size="md" />
          <div>
            <p className="text-stone-600 dark:text-gray-400 mb-2">by {book.author}</p>
            {book.isbn && (
              <p className="text-xs text-stone-400 dark:text-gray-600">ISBN: {book.isbn}</p>
            )}
            {book.publication_date && (
              <p className="text-xs text-stone-400 dark:text-gray-600">
                Published: {book.publication_date}
              </p>
            )}
          </div>
        </div>

        {book.description ? (
          <p className="text-stone-600 dark:text-gray-400 leading-relaxed">{book.description}</p>
        ) : (
          <p className="text-stone-400 dark:text-gray-600 text-sm italic">
            No description available for this book yet.
          </p>
        )}
      </div>
    </div>
  );
}
