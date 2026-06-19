'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/components/AuthProvider';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { GamificationPanel } from '@/components/GamificationPanel';
import { ChallengesCard } from '@/components/ChallengesCard';
import type { UserProfile } from '@/types';

export default function ProfilePage() {
  const router = useRouter();
  const { user, loading: authLoading, logout, refreshUser } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [emailMsg, setEmailMsg] = useState('');
  const [emailErr, setEmailErr] = useState('');
  const [emailSaving, setEmailSaving] = useState(false);

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordMsg, setPasswordMsg] = useState('');
  const [passwordErr, setPasswordErr] = useState('');
  const [passwordSaving, setPasswordSaving] = useState(false);

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

  const handleEmailSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailMsg('');
    setEmailErr('');
    setEmailSaving(true);
    try {
      await api.changeEmail(newEmail, emailPassword);
      await refreshUser();
      setEmailMsg('Email updated successfully.');
      setNewEmail('');
      setEmailPassword('');
    } catch (err: any) {
      setEmailErr(err.message || 'Failed to update email');
    } finally {
      setEmailSaving(false);
    }
  };

  const handlePasswordSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordMsg('');
    setPasswordErr('');
    if (newPassword !== confirmPassword) {
      setPasswordErr('New passwords do not match');
      return;
    }
    setPasswordSaving(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      setPasswordMsg('Password updated successfully.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err: any) {
      setPasswordErr(err.message || 'Failed to update password');
    } finally {
      setPasswordSaving(false);
    }
  };

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

      <h2 className="text-lg font-serif font-semibold text-stone-800 dark:text-gray-200 mt-8 mb-4">Reading Companion</h2>
      <div className="space-y-6">
        <GamificationPanel />
        <ChallengesCard />
      </div>

      <h2 className="text-lg font-serif font-semibold text-stone-800 dark:text-gray-200 mt-8 mb-4">Account Settings</h2>

      <form onSubmit={handleEmailSubmit} className="card p-6 mb-6">
        <h3 className="font-serif font-semibold text-stone-900 dark:text-gray-100 mb-3">Change Email</h3>
        {emailErr && <p className="text-sm text-red-500 dark:text-red-400 mb-3">{emailErr}</p>}
        {emailMsg && <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-3">{emailMsg}</p>}
        <div className="space-y-3">
          <input
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="New email address"
            required
            className="input"
          />
          <input
            type="password"
            value={emailPassword}
            onChange={(e) => setEmailPassword(e.target.value)}
            placeholder="Current password"
            required
            className="input"
          />
          <button type="submit" disabled={emailSaving} className="btn-primary">
            {emailSaving ? 'Saving...' : 'Update Email'}
          </button>
        </div>
      </form>

      <form onSubmit={handlePasswordSubmit} className="card p-6">
        <h3 className="font-serif font-semibold text-stone-900 dark:text-gray-100 mb-3">Change Password</h3>
        {passwordErr && <p className="text-sm text-red-500 dark:text-red-400 mb-3">{passwordErr}</p>}
        {passwordMsg && <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-3">{passwordMsg}</p>}
        <div className="space-y-3">
          <input
            type="password"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            placeholder="Current password"
            required
            className="input"
          />
          <input
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="New password"
            required
            minLength={8}
            className="input"
          />
          <input
            type="password"
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            required
            className="input"
          />
          <button type="submit" disabled={passwordSaving} className="btn-primary">
            {passwordSaving ? 'Saving...' : 'Update Password'}
          </button>
        </div>
      </form>
    </div>
  );
}
