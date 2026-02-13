'use client';

import { useState } from 'react';
import { cn } from '@/lib/utils';

interface RatingSliderProps {
  label: string;
  description: string;
  lowLabel: string;
  highLabel: string;
  value: number;
  onChange: (value: number) => void;
  className?: string;
}

export function RatingSlider({
  label,
  description,
  lowLabel,
  highLabel,
  value,
  onChange,
  className = '',
}: RatingSliderProps) {
  const [isFocused, setIsFocused] = useState(false);

  return (
    <div className={cn('space-y-2', className)}>
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium text-gray-900">
          {label}
          <span className="ml-2 text-xs text-gray-500">{description}</span>
        </label>
        <span className="text-lg font-semibold text-shelf-700">{value}</span>
      </div>

      <div className="relative pt-2 pb-6">
        <input
          type="range"
          min="1"
          max="5"
          step="1"
          value={value}
          onChange={(e) => onChange(Number(e.target.value))}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          className={cn(
            'w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer',
            'focus:outline-none focus:ring-2 focus:ring-shelf-500 focus:ring-offset-2',
            '[&::-webkit-slider-thumb]:appearance-none',
            '[&::-webkit-slider-thumb]:w-5',
            '[&::-webkit-slider-thumb]:h-5',
            '[&::-webkit-slider-thumb]:rounded-full',
            '[&::-webkit-slider-thumb]:bg-shelf-600',
            '[&::-webkit-slider-thumb]:cursor-pointer',
            '[&::-webkit-slider-thumb]:transition-all',
            '[&::-webkit-slider-thumb]:hover:bg-shelf-700',
            '[&::-webkit-slider-thumb]:hover:scale-110',
            '[&::-moz-range-thumb]:w-5',
            '[&::-moz-range-thumb]:h-5',
            '[&::-moz-range-thumb]:rounded-full',
            '[&::-moz-range-thumb]:bg-shelf-600',
            '[&::-moz-range-thumb]:border-0',
            '[&::-moz-range-thumb]:cursor-pointer',
            '[&::-moz-range-thumb]:transition-all',
            '[&::-moz-range-thumb]:hover:bg-shelf-700',
            isFocused && 'ring-2 ring-shelf-500 ring-offset-2'
          )}
        />

        {/* Tick marks */}
        <div className="absolute top-0 left-0 right-0 flex justify-between px-2.5">
          {[1, 2, 3, 4, 5].map((tick) => (
            <div
              key={tick}
              className={cn(
                'w-0.5 h-3 rounded-full transition-colors',
                tick === value ? 'bg-shelf-600' : 'bg-gray-300'
              )}
            />
          ))}
        </div>

        {/* Labels */}
        <div className="absolute bottom-0 left-0 right-0 flex justify-between text-xs text-gray-500">
          <span>{lowLabel}</span>
          <span>{highLabel}</span>
        </div>
      </div>
    </div>
  );
}
