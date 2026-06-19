'use client';

import Link from 'next/link';
import { memo } from 'react';
import { BookCover } from './BookCover';
import { StarRating } from './StarRating';
import type { BookSummary } from '@/types';

interface BookCardProps {
  book: BookSummary;
}

function CardContent({ book }: BookCardProps) {
  return (
    <div className="card overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <div className="flex justify-center pt-4 px-4">
        <div className="group-hover:scale-105 transition-transform duration-200">
          <BookCover coverUrl={book.cover_url} title={book.title} author={book.author} size="md" />
        </div>
      </div>
      <div className="p-4">
        <h3 className="font-serif font-semibold text-sm text-stone-900 dark:text-gray-100 line-clamp-2 leading-snug mb-1">
          {book.title}
        </h3>
        <p className="text-xs text-stone-500 dark:text-gray-400 line-clamp-1 mb-2">
          {book.author}
        </p>
        {book.avg_rating && book.rating_count > 0 ? (
          <div className="flex items-center gap-1 text-shelf-600 dark:text-shelf-500">
            <StarRating value={book.avg_rating} size="sm" readOnly />
            <span className="text-xs text-stone-400 dark:text-gray-500 ml-1">({book.rating_count})</span>
          </div>
        ) : null}
      </div>
    </div>
  );
}

export const BookCard = memo(function BookCard({ book }: BookCardProps) {
  if (!book.id) {
    return (
      <div className="group block">
        <CardContent book={book} />
      </div>
    );
  }

  return (
    <Link href={`/books/${book.id}`} className="group block">
      <CardContent book={book} />
    </Link>
  );
});
