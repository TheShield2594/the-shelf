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
    // xl covers appear on the book detail page above the fold (LCP element)
    // and should load eagerly; smaller sizes in lists use lazy loading
    const loadingAttr = size === 'xl' ? 'eager' : 'lazy';
    return (
      <img
        src={coverUrl}
        alt={`Cover of ${title}`}
        width={w}
        height={h}
        loading={loadingAttr}
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

  // Deterministic hue offset per title so fallback covers aren't all identical
  const hueSeed = title.split('').reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % 5;
  const palettes = [
    'from-shelf-300 to-shelf-600 dark:from-shelf-800 dark:to-shelf-950',
    'from-emerald-300 to-emerald-700 dark:from-emerald-900 dark:to-emerald-950',
    'from-sky-300 to-sky-700 dark:from-sky-900 dark:to-sky-950',
    'from-rose-300 to-rose-700 dark:from-rose-900 dark:to-rose-950',
    'from-amber-300 to-amber-700 dark:from-amber-900 dark:to-amber-950',
  ];

  return (
    <div
      className={`${sizeClasses[size]} relative rounded-r-lg rounded-l-sm shadow-md flex flex-col items-center justify-center bg-gradient-to-br ${palettes[hueSeed]} p-3 text-center overflow-hidden`}
    >
      {/* spine */}
      <div className="absolute left-0 top-0 bottom-0 w-[6px] bg-black/20" />
      <div className="absolute left-[6px] top-0 bottom-0 w-px bg-white/30" />
      {/* page-edge highlight */}
      <div className="absolute right-0 top-1 bottom-1 w-1 bg-white/25 rounded-r" />

      <span className="text-2xl font-bold font-serif text-white drop-shadow-sm mb-1">{initials}</span>
      <span className="text-[10px] text-white/90 line-clamp-3 leading-tight">{title}</span>
      <span className="text-[9px] text-white/70 mt-1 line-clamp-1 italic font-serif">{author}</span>
    </div>
  );
}

export const BookCover = memo(BookCoverImpl);
