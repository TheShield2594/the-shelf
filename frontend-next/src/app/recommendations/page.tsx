'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { BookCard } from '@/components/BookCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { EmptyState } from '@/components/EmptyState';
import type { Recommendation } from '@/types';

export default function RecommendationsPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [recommendations, setRecommendations] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    setError(false);
    api
      .getRecommendations()
      .then(setRecommendations)
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || (!user && !authLoading)) return <LoadingSpinner />;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-gray-100 mb-2">
        For You
      </h1>
      <p className="text-sm text-stone-500 dark:text-gray-400 mb-8">
        Recommended based on books you&apos;ve finished and rated highly.
      </p>

      {loading ? (
        <LoadingSpinner label="Finding books you might like..." />
      ) : error ? (
        <EmptyState
          title="Couldn't load recommendations"
          description="Something went wrong fetching your recommendations. Please try again later."
        />
      ) : recommendations.length === 0 ? (
        <EmptyState
          title="No recommendations yet"
          description="Finish a book and rate it 4 stars or higher to start getting personalized suggestions."
          action={<Link href="/library" className="btn-primary">Go to Library</Link>}
        />
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4 items-stretch">
          {recommendations.map(({ book, reason }) => (
            <div key={book.id} className="h-full">
              <BookCard book={book} />
              <p className="mt-2 text-xs text-stone-500 dark:text-gray-400 line-clamp-2">{reason}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
