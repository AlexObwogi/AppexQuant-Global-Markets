/**
 * AppexQuant Markets Global - MarketSparkline Component
 * SVG Sparkline visualization for Market List expanded detail rows.
 */

import React, { useMemo } from 'react';

interface MarketSparklineProps {
  dataPoints: number[];
  width?: number;
  height?: number;
  color?: string;
  isPositive?: boolean;
  className?: string;
}

export const MarketSparkline: React.FC<MarketSparklineProps> = ({
  dataPoints,
  width = 140,
  height = 36,
  color,
  isPositive,
  className = '',
}) => {
  const points = useMemo(() => {
    if (!dataPoints || dataPoints.length < 2) return [];

    const min = Math.min(...dataPoints);
    const max = Math.max(...dataPoints);
    const range = max - min || 1;

    const stepX = width / (dataPoints.length - 1);
    const padding = 4;
    const usableHeight = height - padding * 2;

    return dataPoints.map((val, idx) => {
      const x = idx * stepX;
      // Invert y because SVG y=0 is top
      const normalizedY = (val - min) / range;
      const y = height - padding - normalizedY * usableHeight;
      return { x, y };
    });
  }, [dataPoints, width, height]);

  if (points.length < 2) {
    return (
      <div className={`h-[${height}px] flex items-center justify-center text-[10px] text-text-secondary font-mono ${className}`}>
        Collecting price history...
      </div>
    );
  }

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x.toFixed(1)},${p.y.toFixed(1)}` : `${acc} L ${p.x.toFixed(1)},${p.y.toFixed(1)}`;
  }, '');

  const firstPoint = points[0];
  const lastPoint = points[points.length - 1];
  const fillD = `${pathD} L ${lastPoint.x.toFixed(1)},${height} L ${firstPoint.x.toFixed(1)},${height} Z`;

  const isUp = isPositive !== undefined ? isPositive : dataPoints[dataPoints.length - 1] >= dataPoints[0];
  const strokeColor = color || (isUp ? '#22C55E' : '#EF4444');
  const gradientId = `sparkline-grad-${Math.random().toString(36).substring(2, 9)}`;

  return (
    <div className={`relative inline-block overflow-hidden ${className}`}>
      <svg width={width} height={height} className="overflow-visible">
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={strokeColor} stopOpacity={0.35} />
            <stop offset="100%" stopColor={strokeColor} stopOpacity={0.0} />
          </linearGradient>
        </defs>

        {/* Fill under the curve */}
        <path d={fillD} fill={`url(#${gradientId})`} />

        {/* Main sparkline curve */}
        <path
          d={pathD}
          fill="none"
          stroke={strokeColor}
          strokeWidth="1.8"
          strokeLinecap="round"
          strokeLinejoin="round"
        />

        {/* Current price pulse dot */}
        <circle
          cx={lastPoint.x}
          cy={lastPoint.y}
          r="3"
          fill={strokeColor}
          className="animate-pulse"
        />
      </svg>
    </div>
  );
};
