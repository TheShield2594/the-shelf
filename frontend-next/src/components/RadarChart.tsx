'use client';

import { useState, useEffect } from 'react';
import { Radar, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';

interface RadarChartProps {
  bookId: number;
}

const DIMENSION_LABELS: Record<string, string> = {
  pace: 'Pace',
  emotional_impact: 'Emotional Impact',
  complexity: 'Complexity',
  character_development: 'Character Dev',
  plot_quality: 'Plot Quality',
  prose_style: 'Prose Style',
  originality: 'Originality',
};

export function RadarChart({ bookId }: RadarChartProps) {
  const [chartData, setChartData] = useState<{ dimension: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    api.getRadarChartData(bookId).then((data: any) => {
      if (cancelled) return;
      const entries = Object.entries(DIMENSION_LABELS).map(([key, label]) => ({
        dimension: label,
        value: data[key] ?? 3,
      }));
      setChartData(entries);
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [bookId]);

  if (loading) return <div className="h-64" />;
  if (!chartData.length) return null;

  return (
    <div className="h-64 w-full max-w-md">
      <ResponsiveContainer width="100%" height="100%">
        <RechartsRadarChart data={chartData}>
          <PolarGrid />
          <PolarAngleAxis dataKey="dimension" tick={{ fontSize: 11 }} />
          <PolarRadiusAxis domain={[0, 5]} tickCount={6} />
          <Radar dataKey="value" stroke="#846358" fill="#846358" fillOpacity={0.4} />
        </RechartsRadarChart>
      </ResponsiveContainer>
    </div>
  );
}
