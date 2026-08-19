/**
 * AppexQuant Markets Global - Real-Time D3.js Market Heatmap Visualizer
 * Dynamic heatmap driven exclusively by live WebSocket tick streams.
 */

import React, { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import { useMarketData } from '../../state/MarketDataContext.tsx';
import { InstrumentCategory } from '../../types/market.ts';
import { Flame, TrendingUp, TrendingDown, Layers, Zap } from 'lucide-react';

interface MarketHeatmapProps {
  onSelectSymbol?: (symbol: string) => void;
}

interface HeatmapNode {
  id: string;
  symbol: string;
  name: string;
  category: InstrumentCategory;
  price: number;
  changePct: number;
  pipSize: number;
  lastUpdated?: Date;
  value: number; // Volume / weight factor for treemap sizing
}

export const MarketHeatmap: React.FC<MarketHeatmapProps> = ({ onSelectSymbol }) => {
  const { instruments, ticks, dataFreshness, setSelectedSymbol } = useMarketData();
  const svgRef = useRef<SVGSVGElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const [selectedCatFilter, setSelectedCatFilter] = useState<InstrumentCategory | 'ALL'>('ALL');
  const [hoveredSymbol, setHoveredSymbol] = useState<HeatmapNode | null>(null);
  const [dimensions, setDimensions] = useState<{ width: number; height: number }>({ width: 800, height: 380 });

  // Handle Container Responsive Resize
  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        if (entry.contentRect.width > 0) {
          setDimensions({
            width: Math.max(320, entry.contentRect.width),
            height: Math.max(280, Math.min(420, entry.contentRect.width * 0.45)),
          });
        }
      }
    });

    observer.observe(containerRef.current);
    return () => observer.disconnect();
  }, []);

  // Prepare Live Heatmap Data Nodes
  const heatmapData = useMemo<HeatmapNode[]>(() => {
    return instruments
      .filter((inst) => selectedCatFilter === 'ALL' || inst.category === selectedCatFilter)
      .map((inst) => {
        const tick = ticks[inst.symbol];
        const currentPrice = tick ? tick.quote : inst.bid || 1.0;
        const changePct = tick ? tick.changePct : inst.change24hPercentage || 0;

        // Base weight on category or price volatility for D3 treemap tile sizing
        const baseWeight = inst.category === 'FOREX' ? 1.2 : inst.category === 'CRYPTO' ? 1.5 : 1.0;
        const weightFactor = Math.max(0.5, Math.abs(changePct) + baseWeight);

        return {
          id: inst.symbol,
          symbol: inst.symbol,
          name: inst.displayName || inst.name || inst.symbol,
          category: inst.category,
          price: currentPrice,
          changePct,
          pipSize: inst.pipSize || 0.0001,
          lastUpdated: tick?.lastUpdated,
          value: weightFactor,
        };
      });
  }, [instruments, ticks, selectedCatFilter]);

  // Color Scale for Heatmap (-3% rose red, 0% dark neutral, +3% vibrant emerald)
  const colorScale = useMemo(() => {
    return d3.scaleLinear<string>()
      .domain([-3.0, -1.0, -0.2, 0, 0.2, 1.0, 3.0])
      .range([
        '#be123c', // Strong Red (-3%)
        '#f43f5e', // Moderate Red (-1%)
        '#881337', // Muted Red (-0.2%)
        '#1e293b', // Neutral Dark Slate (0%)
        '#064e3b', // Muted Green (+0.2%)
        '#10b981', // Moderate Green (+1%)
        '#059669', // Strong Emerald (+3%)
      ])
      .clamp(true);
  }, []);

  // Render D3 Treemap Visualization
  useEffect(() => {
    if (!svgRef.current || heatmapData.length === 0) return;

    const { width, height } = dimensions;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove(); // Clear previous drawing

    // Hierarchy Root
    const rootData = { name: 'Markets', children: heatmapData };
    const hierarchyRoot = d3.hierarchy(rootData)
      .sum((d: any) => d.value || 0)
      .sort((a, b) => (b.value || 0) - (a.value || 0));

    // D3 Treemap Layout Calculation
    const treemapLayout = d3.treemap<any>()
      .size([width, height])
      .paddingInner(3)
      .paddingOuter(3)
      .round(true);

    treemapLayout(hierarchyRoot);

    const leaves = hierarchyRoot.leaves();

    // Group Container
    const g = svg.append('g');

    // Create Tile Nodes
    const tileGroups = g
      .selectAll('g')
      .data(leaves)
      .enter()
      .append('g')
      .attr('transform', (d) => `translate(${d.x0},${d.y0})`)
      .style('cursor', 'pointer')
      .on('click', (_event, d) => {
        const node = d.data as HeatmapNode;
        setSelectedSymbol(node.symbol);
        if (onSelectSymbol) onSelectSymbol(node.symbol);
      })
      .on('mouseenter', (_event, d) => {
        setHoveredSymbol(d.data as HeatmapNode);
      })
      .on('mouseleave', () => {
        setHoveredSymbol(null);
      });

    // Rectangles with D3 Transition and Dynamic Fill Color
    tileGroups
      .append('rect')
      .attr('width', (d) => Math.max(0, d.x1 - d.x0))
      .attr('height', (d) => Math.max(0, d.y1 - d.y0))
      .attr('rx', 6)
      .attr('ry', 6)
      .attr('fill', (d) => colorScale(d.data.changePct))
      .attr('stroke', '#334155')
      .attr('stroke-width', 1)
      .style('transition', 'fill 0.4s ease, stroke 0.2s ease')
      .on('mouseover', function () {
        d3.select(this).attr('stroke', '#38bdf8').attr('stroke-width', 2);
      })
      .on('mouseout', function () {
        d3.select(this).attr('stroke', '#334155').attr('stroke-width', 1);
      });

    // Text Content Labels for larger tiles
    tileGroups.each(function (d) {
      const tileWidth = d.x1 - d.x0;
      const tileHeight = d.y1 - d.y0;
      const node = d.data as HeatmapNode;
      const group = d3.select(this);

      if (tileWidth > 45 && tileHeight > 30) {
        // Symbol Label
        group
          .append('text')
          .attr('x', 6)
          .attr('y', Math.min(16, tileHeight / 2 - 4))
          .attr('fill', '#ffffff')
          .attr('font-size', tileWidth < 70 ? '10px' : '12px')
          .attr('font-weight', '700')
          .attr('font-family', 'monospace')
          .text(node.symbol.replace(/^frx|^cry/, ''));

        // Percentage Change Label
        if (tileHeight > 45) {
          const isPos = node.changePct >= 0;
          group
            .append('text')
            .attr('x', 6)
            .attr('y', Math.min(32, tileHeight / 2 + 12))
            .attr('fill', isPos ? '#a7f3d0' : '#fecdd3')
            .attr('font-size', tileWidth < 70 ? '9px' : '11px')
            .attr('font-weight', '600')
            .attr('font-family', 'monospace')
            .text(`${isPos ? '+' : ''}${node.changePct.toFixed(2)}%`);
        }

        // Live Quote
        if (tileWidth > 90 && tileHeight > 65) {
          group
            .append('text')
            .attr('x', 6)
            .attr('y', 48)
            .attr('fill', '#94a3b8')
            .attr('font-size', '9px')
            .attr('font-family', 'monospace')
            .text(node.price.toFixed(node.pipSize < 0.001 ? 5 : 2));
        }
      }
    });
  }, [heatmapData, dimensions, colorScale, setSelectedSymbol, onSelectSymbol]);

  return (
    <div className="bg-bg-surface border border-border-color rounded-2xl p-4 shadow-sm flex flex-col space-y-3">
      {/* Heatmap Header Toolbar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-border-color pb-3">
        <div className="flex items-center space-x-2">
          <div className="p-1.5 bg-rose-500/10 text-rose-400 rounded-lg border border-rose-500/20">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-text-primary flex items-center gap-1.5 font-display">
              Real-Time Market Heatmap
              <span className={`w-2 h-2 rounded-full ${dataFreshness === 'LIVE' ? 'bg-emerald-500 animate-pulse' : 'bg-amber-500'}`} />
            </h3>
            <p className="text-[11px] text-text-secondary">
              D3.js volumetric performance tiles updated directly via Deriv WebSocket
            </p>
          </div>
        </div>

        {/* Category Selector Tabs */}
        <div className="flex items-center space-x-1 overflow-x-auto pb-1 sm:pb-0">
          {(['ALL', 'FOREX', 'VOLATILITY', 'CRYPTO', 'COMMODITIES'] as const).map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCatFilter(cat)}
              className={`px-2.5 py-1 text-[10px] font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                selectedCatFilter === cat
                  ? 'bg-accent-primary text-text-primary font-mono'
                  : 'bg-bg-main text-text-secondary hover:text-text-primary border border-border-color'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>

      {/* D3 Treemap SVG Container */}
      <div ref={containerRef} className="relative w-full min-h-[280px] bg-bg-main rounded-xl border border-border-color p-1 overflow-hidden">
        <svg
          ref={svgRef}
          width={dimensions.width}
          height={dimensions.height}
          className="w-full h-auto block select-none"
        />

        {/* Hovered Tile Tooltip Overlay */}
        {hoveredSymbol && (
          <div className="absolute bottom-3 right-3 bg-bg-surface/95 backdrop-blur border border-accent-primary/40 rounded-xl p-2.5 shadow-xl text-xs space-y-1 pointer-events-none font-mono z-10">
            <div className="flex items-center justify-between gap-4 font-bold text-text-primary">
              <span>{hoveredSymbol.name} ({hoveredSymbol.symbol})</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-bg-main border border-border-color text-text-secondary uppercase">
                {hoveredSymbol.category}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-text-secondary">Live Quote:</span>
              <span className="text-text-primary font-bold">
                {hoveredSymbol.price.toFixed(hoveredSymbol.pipSize < 0.001 ? 5 : 2)}
              </span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="text-text-secondary">24h Change:</span>
              <span className={`font-bold ${hoveredSymbol.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                {hoveredSymbol.changePct >= 0 ? '+' : ''}{hoveredSymbol.changePct.toFixed(2)}%
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Color Scale Legend */}
      <div className="flex items-center justify-between text-[10px] font-mono text-text-secondary pt-1 px-1">
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-rose-600 inline-block" />
          <span>Bearish (-3%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-slate-800 border border-slate-700 inline-block" />
          <span>Neutral (0%)</span>
        </div>
        <div className="flex items-center space-x-1">
          <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
          <span>Bullish (+3%)</span>
        </div>
      </div>
    </div>
  );
};
