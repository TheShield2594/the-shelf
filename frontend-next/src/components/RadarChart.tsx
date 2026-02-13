'use client';

import {
  Radar,
  RadarChart as RechartsRadar,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  Tooltip,
} from 'recharts';
import type { RadarChartDimension } from '@/types';

interface RadarChartProps {
  data: RadarChartDimension[];
  className?: string;
}

export function RadarChart({ data, className = '' }: RadarChartProps) {
  // Ensure data has fullMark set
  const chartData = data.map((d) => ({
    ...d,
    fullMark: d.fullMark || 5,
  }));

  return (
    <div className={className}>
      <ResponsiveContainer width="100%" height={300}>
        <RechartsRadar data={chartData}>
          <PolarGrid stroke="#d1d5db" />
          <PolarAngleAxis
            dataKey="dimension"
            tick={{ fill: '#6b7280', fontSize: 12 }}
          />
          <PolarRadiusAxis
            angle={90}
            domain={[0, 5]}
            tick={{ fill: '#9ca3af', fontSize: 10 }}
          />
          <Radar
            name="Rating"
            dataKey="value"
            stroke="#8B4513"
            fill="#8B4513"
            fillOpacity={0.6}
          />
          <Tooltip
            contentStyle={{
              backgroundColor: 'rgba(255, 255, 255, 0.95)',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              padding: '0.5rem',
            }}
            formatter={(value: number) => [value.toFixed(1), 'Score']}
          />
        </RechartsRadar>
      </ResponsiveContainer>
    </div>
  );
}
