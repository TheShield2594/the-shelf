'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { UserProfile } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    api.getProfile()
      .then(setProfile)
      .catch((err: any) => setError(err.message || 'Failed to load profile'))
      .finally(() => setLoading(false));
  }, [user, authLoading]);

  if (authLoading || loading) return <LoadingSpinner />;

  if (error) {
    return (
      <div className="max-w-3xl mx-auto px-4 py-8">
        <div className="card p-8 text-center">
          <p className="text-red-500 dark:text-red-400 mb-4">{error}</p>
          <button onClick={() => window.location.reload()} className="btn-primary">Retry</button>
        </div>
      </div>
    );
  }

  if (!user || !profile) return null;

  const stats = [
    { label: 'Books Read', value: profile.books_read, color: 'text-emerald-600 dark:text-emerald-400', bg: 'bg-emerald-50 dark:bg-emerald-950/30' },
    { label: 'Currently Reading', value: profile.currently_reading, color: 'text-blue-600 dark:text-blue-400', bg: 'bg-blue-50 dark:bg-blue-950/30' },
    { label: 'Want to Read', value: profile.want_to_read, color: 'text-amber-600 dark:text-amber-400', bg: 'bg-amber-50 dark:bg-amber-950/30' },
    { label: 'Did Not Finish', value: profile.dnf, color: 'text-red-600 dark:text-red-400', bg: 'bg-red-50 dark:bg-red-950/30' },
    { label: 'Reviews Written', value: profile.reviews_count, color: 'text-purple-600 dark:text-purple-400', bg: 'bg-purple-50 dark:bg-purple-950/30' },
  ];

  return (
    <div className="max-w-3xl mx-auto px-4 py-8">
      <div className="card p-8 mb-6">
        <div className="flex items-center gap-4 mb-6">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-shelf-400 to-shelf-700 flex items-center justify-center text-white text-2xl font-bold">
            {user.username[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-serif font-bold text-stone-900 dark:text-gray-100">{user.username}</h1>
            <p className="text-sm text-stone-500 dark:text-gray-400">{user.email}</p>
            <p className="text-xs text-stone-400 dark:text-gray-600 mt-1">
              Member since {new Date(user.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>

        <button
          onClick={() => { logout(); router.push('/'); }}
          className="btn-ghost text-sm"
        >
          Logout
        </button>
      </div>

      <h2 className="text-lg font-serif font-semibold text-stone-800 dark:text-gray-200 mb-4">Reading Stats</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {stats.map((stat) => (
          <div key={stat.label} className={`card p-4 ${stat.bg}`}>
            <p className={`text-3xl font-bold ${stat.color}`}>{stat.value}</p>
            <p className="text-xs text-stone-600 dark:text-gray-400 mt-1">{stat.label}</p>
          </div>
        ))}
      </div>
    </div>
  );
}
