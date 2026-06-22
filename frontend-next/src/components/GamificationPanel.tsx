'use client';

import { useState, useEffect, useCallback } from 'react';
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { api } from '@/lib/api';
import { MascotCompanion } from '@/components/MascotCompanion';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import type { GamificationStats, ReadingSessionOut } from '@/types';

const XP_PER_LEVEL = 100;

function lastNDays(n: number): string[] {
  const days: string[] = [];
  const today = new Date();
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(today.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function buildChartData(sessions: ReadingSessionOut[]) {
  const minutesByDate = new Map<string, number>();
  for (const s of sessions) {
    minutesByDate.set(s.session_date, (minutesByDate.get(s.session_date) || 0) + s.minutes_read);
  }
  return lastNDays(7).map((date) => ({
    date: new Date(date + 'T00:00:00').toLocaleDateString(undefined, { weekday: 'short' }),
    minutes: minutesByDate.get(date) || 0,
  }));
}

export function GamificationPanel() {
  const [stats, setStats] = useState<GamificationStats | null>(null);
  const [sessions, setSessions] = useState<ReadingSessionOut[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [minutes, setMinutes] = useState('20');
  const [pages, setPages] = useState('');
  const [logging, setLogging] = useState(false);
  const [logMsg, setLogMsg] = useState('');

  const load = useCallback(async () => {
    try {
      const [statsRes, sessionsRes] = await Promise.all([
        api.getGamificationStats(),
        api.getReadingSessions(60),
      ]);
      setStats(statsRes);
      setSessions(sessionsRes);
    } catch (err: any) {
      setError(err.message || 'Failed to load reading stats');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleLogSession = async (e: React.FormEvent) => {
    e.preventDefault();
    setLogMsg('');
    setLogging(true);
    try {
      const result = await api.logReadingSession({
        session_date: new Date().toISOString().slice(0, 10),
        minutes_read: Number(minutes) || 0,
        pages_read: pages ? Number(pages) : undefined,
      });
      setStats(result.stats);
      setSessions((prev) => [result.session, ...prev]);
      if (result.new_badges.length > 0) {
        setLogMsg(`Session logged! New badge: ${result.new_badges.map((b) => b.name).join(', ')}`);
      } else {
        setLogMsg('Session logged!');
      }
      setPages('');
    } catch (err: any) {
      setLogMsg(err.message || 'Failed to log session');
    } finally {
      setLogging(false);
    }
  };

  if (loading) return <LoadingSpinner label="Loading reading stats" />;
  if (error) {
    return <p className="text-sm text-red-500 dark:text-red-400">{error}</p>;
  }
  if (!stats) return null;

  const xpIntoLevel = stats.xp_total % XP_PER_LEVEL;
  const chartData = buildChartData(sessions);

  return (
    <div className="space-y-6">
      <div className="rounded-xl p-5 bg-gradient-to-br from-shelf-600 via-shelf-700 to-stone-900 dark:from-shelf-800 dark:via-shelf-900 dark:to-gray-950 shadow-lg">
        <MascotCompanion mood={stats.mascot_mood} streak={stats.current_streak} />

        <div className="mt-5 pt-4 border-t border-white/15">
          <div className="flex items-center justify-between mb-2">
            <p className="font-serif font-semibold text-white">
              Level {stats.level}
            </p>
            <p className="text-xs text-white/70">
              {xpIntoLevel} / {XP_PER_LEVEL} XP
            </p>
          </div>
          <div className="w-full h-2 rounded-full bg-white/15 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-300 to-shelf-300 transition-all"
              style={{ width: `${(xpIntoLevel / XP_PER_LEVEL) * 100}%` }}
            />
          </div>
          <p className="text-xs text-white/70 mt-2">
            Longest streak: {stats.longest_streak} day{stats.longest_streak === 1 ? '' : 's'}
          </p>
        </div>
      </div>

      <div className="card p-5">
        <p className="font-serif font-semibold text-stone-900 dark:text-gray-100 mb-3">
          Minutes read, last 7 days
        </p>
        <div className="h-40">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={chartData}>
              <XAxis dataKey="date" fontSize={12} stroke="currentColor" />
              <YAxis fontSize={12} stroke="currentColor" allowDecimals={false} />
              <RechartsTooltip />
              <Bar dataKey="minutes" fill="#8B4513" radius={4} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <form onSubmit={handleLogSession} className="card p-5">
        <p className="font-serif font-semibold text-stone-900 dark:text-gray-100 mb-3">
          Log today&apos;s reading
        </p>
        {logMsg && <p className="text-sm text-emerald-600 dark:text-emerald-400 mb-3">{logMsg}</p>}
        <div className="flex gap-3 flex-wrap">
          <input
            type="number"
            min={1}
            value={minutes}
            onChange={(e) => setMinutes(e.target.value)}
            placeholder="Minutes"
            required
            className="input w-28"
          />
          <input
            type="number"
            min={0}
            value={pages}
            onChange={(e) => setPages(e.target.value)}
            placeholder="Pages (optional)"
            className="input w-40"
          />
          <button type="submit" disabled={logging} className="btn-primary">
            {logging ? 'Logging...' : 'Log session'}
          </button>
        </div>
      </form>

      {stats.badges.length > 0 && (
        <div className="card p-5">
          <p className="font-serif font-semibold text-stone-900 dark:text-gray-100 mb-3">Badges</p>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {stats.badges.map((badge) => (
              <div
                key={badge.code}
                className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900"
                title={badge.description}
              >
                <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">{badge.name}</p>
                <p className="text-xs text-amber-700/80 dark:text-amber-400/80 mt-1">{badge.description}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
