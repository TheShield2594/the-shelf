'use client';

import { useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      await api.forgotPassword(email);
    } catch {
      // Intentionally ignored: we show the same message either way so
      // this form can't be used to probe which emails are registered.
    } finally {
      setSubmitting(false);
      setSubmitted(true);
    }
  };

  return (
    <div className="max-w-md mx-auto px-4 py-16">
      <div className="card p-8">
        <h1 className="text-2xl font-serif font-bold text-center text-stone-900 dark:text-gray-100 mb-6">
          Reset your password
        </h1>
        {submitted ? (
          <p className="text-center text-sm text-stone-600 dark:text-gray-400">
            If an account with that email exists, we&apos;ve sent a link to reset your
            password. The link expires in 30 minutes.
          </p>
        ) : (
          <>
            <p className="text-sm text-stone-500 dark:text-gray-400 mb-4">
              Enter the email on your account and we&apos;ll send you a link to reset
              your password.
            </p>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 dark:text-gray-300 mb-1">
                  Email
                </label>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input"
                  required
                  autoFocus
                />
              </div>
              <button type="submit" disabled={submitting} className="btn-primary w-full">
                {submitting ? 'Sending...' : 'Send reset link'}
              </button>
            </form>
          </>
        )}
        <p className="text-center text-sm text-stone-500 dark:text-gray-400 mt-6">
          <Link href="/login" className="text-shelf-600 dark:text-shelf-500 hover:underline">
            Back to login
          </Link>
        </p>
      </div>
    </div>
  );
}
