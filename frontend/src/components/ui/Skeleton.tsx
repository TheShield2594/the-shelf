import { cn } from '../../utils/cn';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'animate-pulse bg-gray-200 dark:bg-gray-700 rounded',
        className
      )}
      aria-hidden="true"
    />
  );
}

export function BookCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden flex flex-col">
      <Skeleton className="h-64 w-full rounded-none" />
      <div className="p-3 flex-1 flex flex-col space-y-2">
        <Skeleton className="h-5 w-full" />
        <Skeleton className="h-4 w-2/3" />
        <div className="flex items-center mt-2 space-x-1">
          <Skeleton className="h-4 w-20" />
          <Skeleton className="h-3 w-8" />
        </div>
        <div className="flex flex-wrap gap-1 mt-2">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-20 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function BookGridSkeleton({ count = 20 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
      {Array.from({ length: count }).map((_, i) => (
        <BookCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function BookDetailSkeleton() {
  return (
    <div className="max-w-4xl mx-auto px-4 py-8">
      <div className="flex flex-col md:flex-row gap-6 mb-8">
        <Skeleton className="w-48 h-64 flex-shrink-0" />
        <div className="flex-1 space-y-3">
          <Skeleton className="h-8 w-3/4" />
          <Skeleton className="h-6 w-1/2" />
          <Skeleton className="h-4 w-32" />
          <div className="flex gap-2 mt-3">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-24 rounded-full" />
          </div>
          <div className="flex items-center mt-3 space-x-2">
            <Skeleton className="h-6 w-32" />
            <Skeleton className="h-5 w-20" />
          </div>
          <Skeleton className="h-24 w-full mt-4" />
        </div>
      </div>
    </div>
  );
}

export function ListItemSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg p-4 flex gap-4 items-start">
      <Skeleton className="w-16 h-24 flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <div className="flex gap-3 mt-2">
          <Skeleton className="h-8 w-32" />
          <Skeleton className="h-8 w-24" />
        </div>
      </div>
    </div>
  );
}
