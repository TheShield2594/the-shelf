import { useState, useEffect } from 'react';
import { api } from '../services/api';
import { UserProfile } from '../types';

export default function ProfilePage() {
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.getProfile().then(setProfile).catch(() => {}).finally(() => setLoading(false));
  }, []);

  if (loading) return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-gray-500">Loading...</div>;
  if (!profile) return <div className="max-w-2xl mx-auto px-4 py-12 text-center text-red-500">Failed to load profile</div>;

  const stats = [
    { label: 'Finished', value: profile.books_read, color: 'bg-green-100 text-green-800' },
    { label: 'Reading', value: profile.currently_reading, color: 'bg-blue-100 text-blue-800' },
    { label: 'Want to Read', value: profile.want_to_read, color: 'bg-yellow-100 text-yellow-800' },
    { label: 'DNF', value: profile.dnf, color: 'bg-gray-100 text-gray-800' },
    { label: 'Reviews', value: profile.reviews_count, color: 'bg-purple-100 text-purple-800' },
  ];

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <div className="bg-white rounded-lg shadow p-6 mb-6">
        <div className="flex items-center space-x-4">
          <div className="w-16 h-16 rounded-full bg-shelf-200 flex items-center justify-center text-2xl font-bold text-shelf-700">
            {profile.username[0].toUpperCase()}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{profile.username}</h1>
            <p className="text-sm text-gray-500">
              Member since {new Date(profile.created_at).toLocaleDateString()}
            </p>
          </div>
        </div>
      </div>

      <h2 className="text-lg font-semibold text-gray-900 mb-3">Reading Stats</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {stats.map((s) => (
          <div key={s.label} className={`${s.color} rounded-lg p-4 text-center`}>
            <div className="text-2xl font-bold">{s.value}</div>
            <div className="text-sm mt-1">{s.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
