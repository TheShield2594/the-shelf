'use client';

import { Suspense, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { api } from '@/lib/api';

function ResetPasswordForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token') || '';
  const [newPassword, setNewPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await api.resetPassword(token, newPassword);
      setDone(true);
    } catch (err: any) {
      setError(err.message || 'This reset link is invalid or has expired.');
    } finally {
      setSubmitting(false);
    }
  };

  if (!token) {
    return (
      <p className="text-center text-sm text-red-600 dark:text-red-400">
        This reset link is missing its token. Request a new one from the{' '}
        <Link href="/forgot-password" className="underline">
          forgot password
        </Link>{' '}
        page.
      </p>
    );
  }

  if (done) {
    return (
      <div className="text-center">
        <p className="text-sm text-stone-600 dark:text-gray-400 mb-4">
          Your password has been reset.
        </p>
        <button onClick={() => router.push('/login')} className="btn-primary w-full">
          Go to login
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {error && (
        <div className="p-3 rounded-lg bg-red-50 dark:bg-red-950/50 text-red-600 dark:text-red-400 text-sm">
          {error}
        </div>
      )}
      <div>
        <label
          htmlFor="new-password"
          className="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-1"
        >
          New password
        </label>
        <input
          id="new-password"
          name="newPassword"
          type="password"
          value={newPassword}
          onChange={(e) => setNewPassword(e.target.value)}
          className="input"
          required
          minLength={6}
          autoComplete="new-password"
          autoFocus
        />
      </div>
      <button type="submit" disabled={submitting} className="btn-primary w-full">
        {submitting ? 'Resetting...' : 'Reset password'}
      </button>
    </form>
  );
}

export default function ResetPasswordPage() {
  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card p-8">
        <h1 className="text-2xl font-serif font-bold text-center text-stone-900 dark:text-gray-100 mb-6">
          Set a new password
        </h1>
        <Suspense fallback={null}>
          <ResetPasswordForm />
        </Suspense>
      </div>
    </div>
  );
}
