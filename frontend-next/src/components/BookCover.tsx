'use client';

interface BookCoverProps {
  coverUrl: string | null;
  title: string;
  className?: string;
}

export default function BookCover({ coverUrl, title, className = '' }: BookCoverProps) {
  if (coverUrl) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={coverUrl}
        alt={`Cover of ${title}`}
        className={`object-cover ${className}`}
        loading="lazy"
        onError={(e) => {
          const target = e.target as HTMLImageElement;
          target.style.display = 'none';
          const parent = target.parentElement;
          if (parent) parent.classList.add('book-cover-placeholder');
        }}
      />
    );
  }

  return (
    <div className={`book-cover-placeholder flex items-center justify-center bg-gradient-to-br from-shelf-200 to-shelf-300 dark:from-shelf-800 dark:to-shelf-900 ${className}`}>
      <span className="text-shelf-700 dark:text-shelf-300 font-serif text-center px-2 text-sm line-clamp-3">
        {title}
      </span>
    </div>
  );
}
