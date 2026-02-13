import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useToast } from '../context/ToastContext';
import { UserProfile } from '../types';
import { Card, CardHeader, CardTitle, CardContent, Button, Skeleton } from '../components/ui';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  useEffect(() => {
    api
      .getProfile()
      .then(setProfile)
      .catch((error: any) => {
        toast.error(error.message || 'Failed to load profile');
      })
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="max-w-4xl mx-auto px-4 py-8">
          <div className="mb-8">
            <Skeleton className="h-10 w-48 mb-2" />
            <Skeleton className="h-6 w-64" />
          </div>
          <Card padding="lg" className="mb-6">
            <div className="flex items-center space-x-4">
              <Skeleton className="w-20 h-20 rounded-full" />
              <div className="flex-1">
                <Skeleton className="h-8 w-32 mb-2" />
                <Skeleton className="h-5 w-48" />
              </div>
            </div>
          </Card>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-center">
          <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-gray-600 dark:text-gray-400 text-lg">Failed to load profile</p>
        </div>
      </div>
    );
  }

  const totalBooks = profile.books_read + profile.currently_reading + profile.want_to_read + profile.dnf;

  const stats = [
    {
      label: 'Total Books',
      value: totalBooks,
      color: 'bg-shelf-100 text-shelf-800 dark:bg-shelf-900/50 dark:text-shelf-300',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z" />
        </svg>
      ),
    },
    {
      label: 'Books Finished',
      value: profile.books_read,
      color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Currently Reading',
      value: profile.currently_reading,
      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
        </svg>
      ),
    },
    {
      label: 'Want to Read',
      value: profile.want_to_read,
      color: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z" />
        </svg>
      ),
    },
    {
      label: 'DNF',
      value: profile.dnf,
      color: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Reviews Written',
      value: profile.reviews_count,
      color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
      icon: (
        <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
        </svg>
      ),
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold text-gray-900 dark:text-gray-100 mb-2">Profile</h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg">
            Your reading statistics and activity
          </p>
        </div>

        {/* Profile Card */}
        <Card padding="lg" className="mb-8 shadow-lg">
          <div className="flex flex-col sm:flex-row items-center sm:items-start gap-6">
            <div className="w-20 h-20 rounded-full bg-gradient-to-br from-shelf-400 to-shelf-600 flex items-center justify-center text-3xl font-bold text-white shadow-lg">
              {profile.username[0].toUpperCase()}
            </div>
            <div className="flex-1 text-center sm:text-left">
              <h2 className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-2">
                {profile.username}
              </h2>
              <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Member since {new Date(profile.created_at).toLocaleDateString()}</span>
                </div>
                <div className="flex items-center justify-center sm:justify-start gap-2">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <span>{totalBooks} books in library</span>
                </div>
              </div>
            </div>
            <Link to="/library">
              <Button variant="primary">
                View My Library
              </Button>
            </Link>
          </div>
        </Card>

        {/* Stats Grid */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6">Reading Statistics</h2>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {stats.map((stat) => (
              <Card key={stat.label} padding="lg" hover className="transition-all">
                <div className="flex flex-col items-center text-center space-y-3">
                  <div className={`p-3 rounded-full ${stat.color}`}>
                    {stat.icon}
                  </div>
                  <div>
                    <div className="text-3xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                      {stat.value}
                    </div>
                    <div className="text-sm font-medium text-gray-600 dark:text-gray-400">
                      {stat.label}
                    </div>
                  </div>
                </div>
              </Card>
            ))}
          </div>
        </div>

        {/* Reading Progress */}
        {totalBooks > 0 && (
          <Card padding="lg">
            <CardHeader>
              <CardTitle>Reading Progress</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {/* Finished percentage */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Books Finished</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {Math.round((profile.books_read / totalBooks) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-green-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(profile.books_read / totalBooks) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Currently reading percentage */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Currently Reading</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {Math.round((profile.currently_reading / totalBooks) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-blue-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(profile.currently_reading / totalBooks) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Want to read percentage */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Want to Read</span>
                    <span className="text-sm font-bold text-gray-900 dark:text-gray-100">
                      {Math.round((profile.want_to_read / totalBooks) * 100)}%
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
                    <div
                      className="bg-yellow-500 h-3 rounded-full transition-all duration-500"
                      style={{ width: `${(profile.want_to_read / totalBooks) * 100}%` }}
                    />
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {totalBooks === 0 && (
          <Card padding="lg" className="text-center">
            <svg className="w-16 h-16 mx-auto mb-4 text-gray-400 dark:text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
            <h3 className="text-xl font-semibold text-gray-900 dark:text-gray-100 mb-2">No books yet</h3>
            <p className="text-gray-600 dark:text-gray-400 mb-6">
              Start building your reading library
            </p>
            <Link to="/">
              <Button variant="primary">Browse Books</Button>
            </Link>
          </Card>
        )}
      </div>
    </div>
  );
}
