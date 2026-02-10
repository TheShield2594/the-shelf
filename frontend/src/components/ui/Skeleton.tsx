interface Props {
  className?: string;
}

export function Skeleton({ className = '' }: Props) {
  return <div className={`skeleton ${className}`} aria-hidden="true" />;
}

export function BookCardSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 rounded-xl shadow-sm overflow-hidden flex flex-col">
      <Skeleton className="h-64 w-full rounded-none" />
      <div className="p-4 flex-1 flex flex-col gap-2">
        <Skeleton className="h-5 w-3/4" />
        <Skeleton className="h-4 w-1/2" />
        <Skeleton className="h-4 w-1/3 mt-1" />
        <div className="flex gap-1 mt-1">
          <Skeleton className="h-5 w-16 rounded-full" />
          <Skeleton className="h-5 w-14 rounded-full" />
        </div>
      </div>
    </div>
  );
}

export function BookDetailSkeleton() {
  return (
    <div className="animate-fade-in">
      <div className="flex flex-col md:flex-row gap-8">
        <Skeleton className="w-64 h-96 rounded-xl flex-shrink-0" />
        <div className="flex-1 space-y-4">
          <Skeleton className="h-9 w-3/4" />
          <Skeleton className="h-6 w-1/3" />
          <Skeleton className="h-4 w-1/4" />
          <div className="flex gap-2 mt-2">
            <Skeleton className="h-8 w-24 rounded-full" />
            <Skeleton className="h-8 w-20 rounded-full" />
          </div>
          <Skeleton className="h-5 w-40 mt-4" />
          <div className="space-y-2 mt-4">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>
        </div>
      </div>
    </div>
  );
}

export function LibraryItemSkeleton() {
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl p-4 flex gap-4">
      <Skeleton className="w-16 h-24 rounded flex-shrink-0" />
      <div className="flex-1 space-y-2">
        <Skeleton className="h-5 w-2/3" />
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-8 w-32 mt-1" />
      </div>
    </div>
  );
}
