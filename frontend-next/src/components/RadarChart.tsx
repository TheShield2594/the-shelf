'use client';

import { useState, useEffect } from 'react';
import { Radar, RadarChart as RechartsRadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, ResponsiveContainer } from 'recharts';
import { api } from '@/lib/api';
import type { RadarChartData as RadarChartDataType } from '@/types';

type RadarChartProps =
  | { bookId: number; data?: never; className?: string }
  | { bookId?: never; data: { dimension: string; value: number; fullMark?: number }[]; className?: string };

export function RadarChart(props: RadarChartProps) {
  const { className } = props;
  const [fetchedData, setFetchedData] = useState<{ dimension: string; value: number }[]>([]);
  const [loading, setLoading] = useState(props.bookId !== undefined);

  useEffect(() => {
    if (props.bookId === undefined) return;
    let cancelled = false;
    // Reset loading state when bookId changes to prevent stale data display
    setLoading(true);

    api.getRadarChartData(props.bookId).then((data: RadarChartDataType) => {
      if (cancelled) return;
      // RadarChartData has a `dimensions` array of { dimension, value } objects
      setFetchedData(data.dimensions.map(d => ({
        dimension: d.dimension,
        value: d.value ?? 0,
      })));
      setLoading(false);
    }).catch(() => {
      if (!cancelled) setLoading(false);
    });
    return () => { cancelled = true; };
  }, [props.bookId]);

  const chartData = props.data ?? fetchedData;

  if (loading) return <div className="h-64" />;
  if (!chartData.length) return null;

  return (
    <div className={`h-64 w-full max-w-md ${className ?? ''}`}>
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
