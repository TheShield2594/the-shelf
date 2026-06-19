'use client';

interface LoadingSpinnerProps {
  size?: 'sm' | 'md' | 'lg';
  label?: string;
}

export function LoadingSpinner({ size = 'md', label }: LoadingSpinnerProps) {
  const dims = size === 'sm' ? 'w-6 h-8' : size === 'lg' ? 'w-12 h-16' : 'w-8 h-11';

  return (
    <div
      className="flex flex-col items-center justify-center gap-3 py-12"
      role="status"
      aria-busy="true"
      aria-label={label || 'Loading'}
      style={{ perspective: '200px' }}
    >
      <div className={`relative ${dims}`} aria-hidden="true">
        <div className="absolute inset-0 rounded-sm bg-shelf-200 dark:bg-shelf-900" />
        <div
          className="absolute inset-0 rounded-sm bg-shelf-600 dark:bg-shelf-500 origin-left"
          style={{ animation: 'pageTurn 1.1s ease-in-out infinite' }}
        />
      </div>
      {label && <p className="text-sm text-stone-500 dark:text-gray-400">{label}</p>}
    </div>
  );
}
