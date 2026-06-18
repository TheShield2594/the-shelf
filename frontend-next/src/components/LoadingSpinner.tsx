'use client';

export default function LoadingSpinner({ label = 'Loading...' }: { label?: string }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-3">
      <div className="w-8 h-8 border-3 border-stone-200 dark:border-stone-700 border-t-shelf-600 rounded-full animate-spin" />
      <p className="text-sm text-stone-500 dark:text-stone-400">{label}</p>
    </div>
  );
}
