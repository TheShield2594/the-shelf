'use client';

import { useState, useEffect } from 'react';
import { api } from '@/lib/api';
import type { ChallengeOut } from '@/types';

export function ChallengesCard() {
  const [challenges, setChallenges] = useState<ChallengeOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    api
      .getChallenges()
      .then(setChallenges)
      .catch((err: any) => setError(err.message || 'Failed to load challenges'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return null;
  if (error) return <p className="text-sm text-red-500 dark:text-red-400">{error}</p>;
  if (challenges.length === 0) return null;

  return (
    <div className="card p-5">
      <p className="font-serif font-semibold text-stone-900 dark:text-gray-100 mb-1">
        This week's quests
      </p>
      <p className="text-xs text-stone-500 dark:text-gray-400 mb-4">
        Personal goals based on your own reading — never compared to anyone else.
      </p>
      <div className="space-y-4">
        {challenges.map((c) => (
          <div key={c.code}>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-medium text-stone-800 dark:text-gray-200">
                {c.completed ? '✅ ' : ''}{c.name}
              </p>
              <p className="text-xs text-stone-500 dark:text-gray-400">
                {c.progress} / {c.target}
              </p>
            </div>
            <p className="text-xs text-stone-500 dark:text-gray-400 mb-1">{c.description}</p>
            <div className="w-full h-2 rounded-full bg-stone-200 dark:bg-gray-700 overflow-hidden">
              <div
                className={`h-full transition-all ${c.completed ? 'bg-emerald-500' : 'bg-shelf-500'}`}
                style={{ width: `${(c.progress / c.target) * 100}%` }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
