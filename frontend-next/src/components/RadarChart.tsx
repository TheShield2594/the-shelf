'use client';

import { useState, useEffect } from 'react';
import { Radar, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import type { RadarChartData as RadarChartDataType } from '@/types';

interface RadarChartProps {
  bookId: number;
}

export function RadarChart({ bookId }: RadarChartProps) {
  const [chartData, setChartData] = useState<{ dimension: string; value: number }[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    // Reset loading state when bookId changes to prevent stale data display
    setLoading(true);

    api.getRadarChartData(bookId).then((data: RadarChartDataType) => {
      if (cancelled) return;
      // RadarChartData has a `dimensions` array of { dimension, value } objects
      setChartData(data.dimensions.map(d => ({
        dimension: d.dimension,
        value: d.value ?? 0,
      })));
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
