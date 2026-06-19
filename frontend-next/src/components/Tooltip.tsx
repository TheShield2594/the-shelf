'use client';

import { useState } from 'react';

interface TooltipProps {
  text: string;
}

export function Tooltip({ text }: TooltipProps) {
  const [open, setOpen] = useState(false);

  return (
    <span className="relative inline-flex">
      <button
        type="button"
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        onClick={() => setOpen((o) => !o)}
        aria-label="More info"
        className="w-4 h-4 flex items-center justify-center rounded-full bg-stone-200 dark:bg-gray-700 text-stone-600 dark:text-gray-300 text-[10px] font-bold hover:bg-stone-300 dark:hover:bg-gray-600 transition-colors"
      >
        ?
      </button>
      {open && (
        <span className="absolute z-10 top-full left-1/2 -translate-x-1/2 mt-2 w-56 p-2 rounded-lg bg-stone-900 dark:bg-gray-800 text-white text-xs leading-snug shadow-lg">
          {text}
        </span>
      )}
    </span>
  );
}
