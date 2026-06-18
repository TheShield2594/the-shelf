'use client';

import Link from 'next/link';
import BookCover from './BookCover';
import StarRating from './StarRating';
import type { BookSummary } from '@/types';

interface BookCardProps {
  book: BookSummary;
}

export default function BookCard({ book }: BookCardProps) {
  return (
    <Link href={`/books/${book.id}`} className="card overflow-hidden group block">
      <div className="aspect-[2/3] overflow-hidden bg-stone-100 dark:bg-stone-800">
        <BookCover
          coverUrl={book.cover_url}
          title={book.title}
          className="w-full h-full group-hover:scale-105 transition-transform duration-300"
        />
      </div>
      <div className="p-3">
        <h3 className="font-medium text-sm text-stone-900 dark:text-stone-100 line-clamp-2 leading-tight">
          {book.title}
        </h3>
        <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5 line-clamp-1">
          {book.author}
        </p>
        {book.avg_rating !== null && book.rating_count > 0 && (
          <div className="flex items-center gap-1 mt-2">
            <StarRating value={book.avg_rating} size="sm" readonly />
            <span className="text-xs text-stone-500 dark:text-stone-400">{book.avg_rating.toFixed(1)}</span>
            <span className="text-xs text-stone-400 dark:text-stone-500">({book.rating_count})</span>
          </div>
        )}
      </div>
    </Link>
  );
}
