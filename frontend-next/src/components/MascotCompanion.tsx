'use client';

import type { GamificationStats } from '@/types';

const MOOD_EMOJI: Record<GamificationStats['mascot_mood'], string> = {
  neutral: '📖',
  content: '🙂',
  happy: '😊',
  ecstatic: '🤩',
};

const MOOD_MESSAGE: Record<GamificationStats['mascot_mood'], string> = {
  neutral: "Ready when you are. Log a session to get started.",
  content: "Nice, you're reading again today!",
  happy: "You're on a roll — keep it up!",
  ecstatic: "This streak is incredible. You've built a real habit!",
};

interface MascotCompanionProps {
  mood: GamificationStats['mascot_mood'];
  streak: number;
}

export function MascotCompanion({ mood, streak }: MascotCompanionProps) {
  return (
    <div className="flex items-center gap-4">
      <div className="text-5xl drop-shadow-sm" aria-hidden="true">{MOOD_EMOJI[mood]}</div>
      <div>
        <p className="font-serif font-semibold text-lg text-white">
          {streak > 0 ? `${streak}-day streak` : 'No active streak'}
        </p>
        <p className="text-sm text-white/80">{MOOD_MESSAGE[mood]}</p>
      </div>
    </div>
  );
}
