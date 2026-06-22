'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/AuthProvider';
import { api } from '@/lib/api';
import { BookCard } from '@/components/BookCard';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { UserProfile } from '@/types';

export default function HomePage() {
  const { user, loading } = useAuth();
  const [recentBooks, setRecentBooks] = useState<any[]>([]);
  const [profile, setProfile] = useState<UserProfile | null>(null);

  useEffect(() => {
    api.getBooks({ limit: '8' }).then(setRecentBooks).catch(() => {});
    if (user) {
      api.getProfile().then(setProfile).catch(() => {});
    }
  }, [user]);

  if (loading) return <LoadingSpinner label="Loading..." />;

  // Authenticated: dashboard
  if (user) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="mb-8">
          <h1 className="text-3xl font-serif font-bold text-stone-900 dark:text-gray-100">
            Welcome back, {user.username}
          </h1>
          <p className="text-stone-500 dark:text-gray-400 mt-1">Here&apos;s your reading shelf</p>
        </div>

        {profile && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-8">
            {[
              { label: 'Read', value: profile.books_read, color: 'text-emerald-600 dark:text-emerald-400' },
              { label: 'Reading', value: profile.currently_reading, color: 'text-blue-600 dark:text-blue-400' },
              { label: 'Want to Read', value: profile.want_to_read, color: 'text-amber-600 dark:text-amber-400' },
              { label: 'Reviews', value: profile.reviews_count, color: 'text-purple-600 dark:text-purple-400' },
            ].map((stat) => (
              <div key={stat.label} className="card p-4 text-center">
                <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
                <p className="text-xs text-stone-500 dark:text-gray-400 mt-1">{stat.label}</p>
              </div>
            ))}
          </div>
        )}

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-serif font-semibold text-stone-800 dark:text-gray-200">Recently Added</h2>
          <Link href="/browse" className="text-sm text-shelf-600 dark:text-shelf-500 hover:underline">
            Browse all →
          </Link>
        </div>
        {recentBooks.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
            {recentBooks.map((book) => (
              <BookCard key={book.id} book={book} />
            ))}
          </div>
        ) : (
          <div className="card p-8 text-center">
            <p className="text-stone-600 dark:text-gray-400 mb-4">No books in the library yet.</p>
            <div className="flex items-center justify-center gap-3">
              <Link href="/browse" className="btn-primary">Browse Books</Link>
              <Link href="/import" className="btn-secondary">Import from Goodreads</Link>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Unauthenticated: landing
  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
      <div className="text-center mb-16">
        <h1 className="text-5xl sm:text-6xl font-serif font-bold text-stone-900 dark:text-gray-100 mb-6">
          Your books.<br/>
          <span className="text-shelf-700 dark:text-shelf-500">Your shelf.</span>
        </h1>
        <p className="text-lg text-stone-600 dark:text-gray-400 max-w-2xl mx-auto mb-8">
          A self-hostable book tracker with barcode scanning, multi-dimensional ratings,
          and Goodreads import. Own your reading data.
        </p>
        <div className="flex items-center justify-center gap-4">
          <Link href="/register" className="btn-primary px-6 py-3 text-base">Get Started</Link>
          <Link href="/login" className="btn-secondary px-6 py-3 text-base">Login</Link>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        {[
          { title: 'Barcode Scanning', desc: "Scan a book's barcode to instantly look it up, see reviews, and add it to your shelf.", icon: 'M3 5h2v2H3V5zm4 0h14v2H7V5zM3 11h2v2H3v-2zm4 0h14v2H7v-2zM3 17h2v2H3v-2zm4 0h14v2H7v-2z' },
          { title: 'Multi-Dimensional Ratings', desc: 'Rate books across 7 dimensions — not just stars. Find your next read by mood, pace, or style.', icon: 'M12 2L2 7l10 5 10-5-10-5zM2 17l10 5 10-5M2 12l10 5 10-5' },
          { title: 'Goodreads Import', desc: 'Migrate your Goodreads library in seconds with a simple CSV import. No API keys needed.', icon: 'M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3' },
        ].map((feature) => (
          <div key={feature.title} className="card p-6">
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-shelf-600 dark:text-shelf-500 mb-4">
              <path d={feature.icon} />
            </svg>
            <h3 className="font-serif font-semibold text-lg text-stone-800 dark:text-gray-200 mb-2">{feature.title}</h3>
            <p className="text-sm text-stone-500 dark:text-gray-400">{feature.desc}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
