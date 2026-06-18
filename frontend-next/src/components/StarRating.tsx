'use client';

import { useState } from 'react';

interface StarRatingProps {
  value: number | null;
  onChange?: (rating: number) => void;
  size?: 'sm' | 'md' | 'lg';
  readOnly?: boolean;
}

export function StarRating({ value, onChange, size = 'md', readOnly = false }: StarRatingProps) {
  const [hover, setHover] = useState<number | null>(null);

  const sizeClass = size === 'sm' ? 'w-4 h-4' : size === 'lg' ? 'w-7 h-7' : 'w-5 h-5';
  const displayValue = hover ?? value ?? 0;

  return (
    <div className="flex items-center gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readOnly}
          onClick={() => onChange?.(star)}
          onMouseEnter={() => !readOnly && setHover(star)}
          onMouseLeave={() => !readOnly && setHover(null)}
          className={`${readOnly ? 'cursor-default' : 'cursor-pointer'} transition-transform ${!readOnly ? 'hover:scale-110' : ''}`}
        >
          <svg
            className={sizeClass}
            viewBox="0 0 24 24"
            fill={star <= displayValue ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth="2"
          >
            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
          </svg>
        </button>
      ))}
      {value !== null && value > 0 && (
        <span className="ml-1 text-xs text-stone-500 dark:text-gray-400">{value.toFixed(1)}</span>
      )}
    </div>
  );
}
