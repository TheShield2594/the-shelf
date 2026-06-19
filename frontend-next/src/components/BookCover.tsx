'use client';

import { useState, memo } from 'react';

interface BookCoverProps {
  coverUrl?: string;
  title: string;
  author: string;
  size?: 'sm' | 'md' | 'lg' | 'xl';
}

const sizeClasses = {
  sm: 'w-20 h-28',
  md: 'w-32 h-48',
  lg: 'w-40 h-60',
  xl: 'w-56 h-80',
};

const sizePx = {
  sm: { w: 80, h: 112 },
  md: { w: 128, h: 192 },
  lg: { w: 160, h: 240 },
  xl: { w: 224, h: 320 },
};

function BookCoverImpl({ coverUrl, title, author, size = 'md' }: BookCoverProps) {
  const [error, setError] = useState(false);

  if (coverUrl && !error) {
    const { w, h } = sizePx[size];
    return (
      <img
        src={coverUrl}
        alt={`Cover of ${title}`}
        width={w}
        height={h}
        loading="lazy"
        decoding="async"
        onError={() => setError(true)}
        className={`${sizeClasses[size]} object-cover rounded-lg shadow-md bg-stone-100 dark:bg-gray-800`}
      />
    );
  }

  // Fallback with title/author initials
  const initials = title
    .split(' ')
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className={`${sizeClasses[size]} rounded-lg shadow-md flex flex-col items-center justify-center bg-gradient-to-br from-shelf-200 to-shelf-400 dark:from-gray-800 dark:to-gray-700 p-3 text-center`}
    >
      <span className="text-2xl font-bold font-serif text-shelf-700 dark:text-shelf-400 mb-1">{initials}</span>
      <span className="text-[10px] text-stone-600 dark:text-gray-400 line-clamp-3 leading-tight">{title}</span>
      <span className="text-[9px] text-stone-500 dark:text-gray-500 mt-1 line-clamp-1">{author}</span>
    </div>
  );
}

export const BookCover = memo(BookCoverImpl);
