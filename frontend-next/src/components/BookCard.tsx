'use client';

import Link from 'next/link';
import { memo } from 'react';
import { BookCover } from './BookCover';
import { StarRating } from './StarRating';
import type { BookSummary } from '@/types';

interface BookCardProps {
  book: BookSummary;
  featured?: boolean;
}

function CardContent({ book, featured }: BookCardProps) {
  const coverSize = featured ? 'lg' : 'md';
  return (
    <div className="card h-full flex flex-col overflow-hidden hover:shadow-lg transition-shadow duration-200">
      <div className="flex justify-center pt-4 px-4">
        <div className="relative group-hover:scale-105 transition-transform duration-200">
          <BookCover coverUrl={book.cover_url} title={book.title} author={book.author} size={coverSize} />
          <div className="absolute inset-0 rounded-lg flex items-end justify-center opacity-0 group-hover:opacity-100 backdrop-blur-[2px] bg-gradient-to-t from-black/60 via-black/10 to-transparent transition-opacity duration-200">
            <span className="pb-3 text-xs font-medium text-white tracking-wide">View details</span>
          </div>
        </div>
      </div>
      <div className="p-4 flex flex-col flex-1">
        <h3 className={`font-serif font-semibold text-stone-900 dark:text-gray-100 line-clamp-2 leading-snug mb-1 ${featured ? 'text-lg' : 'text-sm'}`}>
          {book.title}
        </h3>
        <p className="font-serif italic text-xs text-stone-500 dark:text-gray-400 line-clamp-1 mb-2">
          {book.author}
        </p>
        <div className="mt-auto">
          {book.avg_rating && book.rating_count > 0 ? (
            <div className="flex items-center gap-1 text-shelf-600 dark:text-shelf-500">
              <StarRating value={book.avg_rating} size="sm" readOnly />
              <span className="text-xs text-stone-400 dark:text-gray-500 ml-1">({book.rating_count})</span>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}

export const BookCard = memo(function BookCard({ book, featured }: BookCardProps) {
  if (!book.id) {
    return (
      <div className="group block h-full">
        <CardContent book={book} featured={featured} />
      </div>
    );
  }

  return (
    <Link href={`/books/${book.id}`} className="group block h-full">
      <CardContent book={book} featured={featured} />
    </Link>
  );
});
