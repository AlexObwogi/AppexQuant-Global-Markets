/**
 * AppexQuant Markets Global - Interactive Canvas Candlestick Chart Component
 * High-performance, fully interactive financial chart engine.
 * Features: Candlesticks, Line, Area, MA, EMA, Bollinger Bands, RSI, Zoom/Pan, Crosshairs.
 */

import React, { useRef, useEffect, useState, useMemo, useCallback } from 'react';
import { NormalizedCandle, NormalizedTick } from '../../services/deriv/derivTypes';
import { DataFreshness } from '../../state/MarketDataContext';
import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Maximize2,
  Minimize2,
  TrendingUp,
  Sliders,
  Activity,
  Layers,
  Sparkles,
} from 'lucide-react';

export type ChartType = 'CANDLESTICK' | 'LINE' | 'AREA';

export interface InteractiveCandleChartProps {
  symbol: string;
  symbolName: string;
  timeframe: string;
  candles: NormalizedCandle[];
  liveTick?: NormalizedTick;
  dataFreshness: DataFreshness;
  onTimeframeChange: (tf: string) => void;
}

export const InteractiveCandleChart: React.FC<InteractiveCandleChartProps> = ({
  symbol,
  symbolName,
  timeframe,
  candles,
  liveTick,
  dataFreshness,
  onTimeframeChange,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // View state
  const [chartType, setChartType] = useState<ChartType>('CANDLESTICK');
  const [showMA20, setShowMA20] = useState(true);
  const [showEMA50, setShowEMA50] = useState(true);
  const [showBollinger, setShowBollinger] = useState(false);
  const [showRSI, setShowRSI] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Zoom & Pan state
  const [visibleCount, setVisibleCount] = useState<number>(60);
  const [panOffset, setPanOffset] = useState<number>(0); // 0 = rightmost (latest)
  const [isDragging, setIsDragging] = useState(false);
  const [dragStartX, setDragStartX] = useState(0);

  // Crosshair state
  const [crosshairPos, setCrosshairPos] = useState<{ x: number; y: number } | null>(null);

  const timeframes = ['1m', '5m', '15m', '30m', '1h', '4h', '1D', '1W'];

  // Combine historical candles with live tick candle if available
  const activeCandles = useMemo(() => {
    if (!candles || candles.length === 0) return [];
    const list = [...candles];

    if (liveTick) {
      const last = list[list.length - 1];
      const tickTime = liveTick.lastUpdated.getTime();
      
      // If tick belongs to current candle or new candle
      if (last && tickTime - last.timestamp < 3600 * 1000) {
        list[list.length - 1] = {
          ...last,
          high: Math.max(last.high, liveTick.quote),
          low: Math.min(last.low, liveTick.quote),
          close: liveTick.quote,
        };
      } else {
        list.push({
          timestamp: tickTime,
          open: liveTick.prevQuote,
          high: Math.max(liveTick.quote, liveTick.prevQuote),
          low: Math.min(liveTick.quote, liveTick.prevQuote),
          close: liveTick.quote,
        });
      }
    }
    return list;
  }, [candles, liveTick]);

  // Technical Indicators calculations
  const indicators = useMemo(() => {
    if (activeCandles.length === 0) return { ma20: [], ema50: [], rsi: [], bbUpper: [], bbLower: [] };

    const closes = activeCandles.map((c) => c.close);
    const ma20: (number | null)[] = [];
    const ema50: (number | null)[] = [];
    const bbUpper: (number | null)[] = [];
    const bbLower: (number | null)[] = [];
    const rsi: (number | null)[] = [];

    // Calculate MA20 & Bollinger Bands
    for (let i = 0; i < closes.length; i++) {
      if (i < 19) {
        ma20.push(null);
        bbUpper.push(null);
        bbLower.push(null);
      } else {
        const slice = closes.slice(i - 19, i + 1);
        const mean = slice.reduce((a, b) => a + b, 0) / 20;
        ma20.push(mean);

        const variance = slice.reduce((a, b) => a + Math.pow(b - mean, 2), 0) / 20;
        const stdDev = Math.sqrt(variance);
        bbUpper.push(mean + stdDev * 2);
        bbLower.push(mean - stdDev * 2);
      }
    }

    // Calculate EMA50
    let prevEma: number | null = null;
    const multiplier = 2 / (50 + 1);
    for (let i = 0; i < closes.length; i++) {
      if (i < 49) {
        ema50.push(null);
      } else if (i === 49) {
        const sum = closes.slice(0, 50).reduce((a, b) => a + b, 0);
        prevEma = sum / 50;
        ema50.push(prevEma);
      } else {
        prevEma = (closes[i] - prevEma!) * multiplier + prevEma!;
        ema50.push(prevEma);
      }
    }

    // Calculate RSI (14)
    let gainSum = 0;
    let lossSum = 0;
    for (let i = 0; i < closes.length; i++) {
      if (i === 0) {
        rsi.push(null);
        continue;
      }
      const change = closes[i] - closes[i - 1];
      if (i <= 14) {
        if (change >= 0) gainSum += change;
        else lossSum += Math.abs(change);

        if (i < 14) {
          rsi.push(null);
        } else {
          const avgGain = gainSum / 14;
          const avgLoss = lossSum / 14;
          const rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
          rsi.push(100 - 100 / (1 + rs));
        }
      } else {
        const gain = change >= 0 ? change : 0;
        const loss = change < 0 ? Math.abs(change) : 0;
        gainSum = (gainSum * 13 + gain) / 14;
        lossSum = (lossSum * 13 + loss) / 14;
        const rs = lossSum === 0 ? 100 : gainSum / lossSum;
        rsi.push(100 - 100 / (1 + rs));
      }
    }

    return { ma20, ema50, bbUpper, bbLower, rsi };
  }, [activeCandles]);

  // Main Canvas Render Loop
  const renderCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || activeCandles.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.width / dpr;
    const height = canvas.height / dpr;

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    // Layout geometry
    const paddingRight = 65; // Price scale width
    const paddingBottom = showRSI ? 110 : 30; // Date axis / RSI panel
    const chartWidth = width - paddingRight;
    const mainHeight = height - paddingBottom - (showRSI ? 80 : 0);
    const rsiHeight = showRSI ? 70 : 0;
    const rsiTop = mainHeight + 25;

    // Determine slice of visible candles
    const totalCandles = activeCandles.length;
    const count = Math.min(visibleCount, totalCandles);
    const startIndex = Math.max(0, totalCandles - count - panOffset);
    const endIndex = Math.min(totalCandles, startIndex + count);
    const visibleCandles = activeCandles.slice(startIndex, endIndex);

    if (visibleCandles.length === 0) {
      ctx.restore();
      return;
    }

    // Determine Y-axis Price Min / Max
    let minPrice = Infinity;
    let maxPrice = -Infinity;
    for (const c of visibleCandles) {
      if (c.low < minPrice) minPrice = c.low;
      if (c.high > maxPrice) maxPrice = c.high;
    }

    // Include indicators in scale if toggled
    for (let i = startIndex; i < endIndex; i++) {
      if (showMA20 && indicators.ma20[i]) {
        minPrice = Math.min(minPrice, indicators.ma20[i]!);
        maxPrice = Math.max(maxPrice, indicators.ma20[i]!);
      }
      if (showEMA50 && indicators.ema50[i]) {
        minPrice = Math.min(minPrice, indicators.ema50[i]!);
        maxPrice = Math.max(maxPrice, indicators.ema50[i]!);
      }
    }

    const priceRange = maxPrice - minPrice || 1;
    const pricePadding = priceRange * 0.08;
    const scaledMinPrice = minPrice - pricePadding;
    const scaledMaxPrice = maxPrice + pricePadding;
    const scaledPriceRange = scaledMaxPrice - scaledMinPrice;

    // Coordinate mapping functions
    const candleWidth = chartWidth / visibleCandles.length;
    const barPadding = Math.max(1, candleWidth * 0.2);
    const barWidth = Math.max(1, candleWidth - barPadding);

    const getX = (idx: number) => idx * candleWidth + candleWidth / 2;
    const getY = (price: number) =>
      mainHeight - ((price - scaledMinPrice) / scaledPriceRange) * mainHeight;

    // 1. Draw Background Grid
    ctx.strokeStyle = '#1E293B';
    ctx.lineWidth = 1;

    // Horizontal Price Lines
    const gridLines = 5;
    for (let i = 0; i <= gridLines; i++) {
      const p = scaledMinPrice + (scaledPriceRange / gridLines) * i;
      const y = getY(p);
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(chartWidth, y);
      ctx.stroke();

      // Price Label
      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'left';
      ctx.fillText(p.toFixed(p > 100 ? 2 : 5), chartWidth + 6, y + 3);
    }

    // Vertical Time Grid Lines
    const timeStep = Math.max(1, Math.floor(visibleCandles.length / 6));
    for (let i = 0; i < visibleCandles.length; i += timeStep) {
      const x = getX(i);
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, mainHeight);
      ctx.stroke();

      // Time Label
      const dt = new Date(visibleCandles[i].timestamp);
      const timeStr = `${dt.getUTCHours().toString().padStart(2, '0')}:${dt.getUTCMinutes().toString().padStart(2, '0')}`;
      ctx.fillStyle = '#94A3B8';
      ctx.font = '10px monospace';
      ctx.textAlign = 'center';
      ctx.fillText(timeStr, x, mainHeight + 14);
    }

    // 2. Draw Bollinger Bands Overlay
    if (showBollinger) {
      ctx.fillStyle = 'rgba(56, 189, 248, 0.05)';
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < visibleCandles.length; i++) {
        const globalIdx = startIndex + i;
        const upper = indicators.bbUpper[globalIdx];
        if (upper !== null) {
          const x = getX(i);
          const y = getY(upper);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else {
            ctx.lineTo(x, y);
          }
        }
      }
      for (let i = visibleCandles.length - 1; i >= 0; i--) {
        const globalIdx = startIndex + i;
        const lower = indicators.bbLower[globalIdx];
        if (lower !== null) {
          const x = getX(i);
          const y = getY(lower);
          ctx.lineTo(x, y);
        }
      }
      ctx.closePath();
      ctx.fill();
    }

    // 3. Draw Main Price Chart (Candlesticks / Line / Area)
    if (chartType === 'CANDLESTICK') {
      for (let i = 0; i < visibleCandles.length; i++) {
        const c = visibleCandles[i];
        const x = getX(i);
        const openY = getY(c.open);
        const closeY = getY(c.close);
        const highY = getY(c.high);
        const lowY = getY(c.low);

        const isBullish = c.close >= c.open;
        const color = isBullish ? '#22C55E' : '#EF4444';

        // Draw Wick
        ctx.strokeStyle = color;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.moveTo(x, highY);
        ctx.lineTo(x, lowY);
        ctx.stroke();

        // Draw Body
        ctx.fillStyle = color;
        const bodyTop = Math.min(openY, closeY);
        const bodyHeight = Math.max(2, Math.abs(openY - closeY));
        ctx.fillRect(x - barWidth / 2, bodyTop, barWidth, bodyHeight);
      }
    } else if (chartType === 'LINE' || chartType === 'AREA') {
      ctx.beginPath();
      for (let i = 0; i < visibleCandles.length; i++) {
        const x = getX(i);
        const y = getY(visibleCandles[i].close);
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }

      if (chartType === 'AREA') {
        ctx.lineTo(getX(visibleCandles.length - 1), mainHeight);
        ctx.lineTo(getX(0), mainHeight);
        ctx.closePath();

        const grad = ctx.createLinearGradient(0, 0, 0, mainHeight);
        grad.addColorStop(0, 'rgba(56, 189, 248, 0.35)');
        grad.addColorStop(1, 'rgba(56, 189, 248, 0.0)');
        ctx.fillStyle = grad;
        ctx.fill();
      }

      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 2;
      ctx.stroke();
    }

    // 4. Draw MA20 & EMA50 Lines
    if (showMA20) {
      ctx.strokeStyle = '#38BDF8';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < visibleCandles.length; i++) {
        const val = indicators.ma20[startIndex + i];
        if (val !== null) {
          const x = getX(i);
          const y = getY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    if (showEMA50) {
      ctx.strokeStyle = '#F59E0B';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let started = false;
      for (let i = 0; i < visibleCandles.length; i++) {
        const val = indicators.ema50[startIndex + i];
        if (val !== null) {
          const x = getX(i);
          const y = getY(val);
          if (!started) {
            ctx.moveTo(x, y);
            started = true;
          } else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // 5. Live Price Horizontal Line & Badge
    const latestPrice = visibleCandles[visibleCandles.length - 1].close;
    const latestY = getY(latestPrice);

    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = '#38BDF8';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, latestY);
    ctx.lineTo(chartWidth, latestY);
    ctx.stroke();
    ctx.setLineDash([]);

    // Live Price Pill on Y-Axis
    ctx.fillStyle = '#38BDF8';
    ctx.fillRect(chartWidth, latestY - 10, paddingRight, 20);
    ctx.fillStyle = '#0B0E14';
    ctx.font = 'bold 10px monospace';
    ctx.textAlign = 'center';
    ctx.fillText(latestPrice.toFixed(latestPrice > 100 ? 2 : 5), chartWidth + paddingRight / 2, latestY + 3);

    // 6. Draw RSI Oscillator Panel
    if (showRSI) {
      ctx.fillStyle = '#0F172A';
      ctx.fillRect(0, rsiTop, chartWidth, rsiHeight);

      // RSI Boundaries (70 Overbought, 30 Oversold)
      ctx.strokeStyle = '#1E293B';
      ctx.lineWidth = 1;
      const y70 = rsiTop + rsiHeight * 0.3;
      const y30 = rsiTop + rsiHeight * 0.7;

      ctx.beginPath();
      ctx.moveTo(0, y70);
      ctx.lineTo(chartWidth, y70);
      ctx.moveTo(0, y30);
      ctx.lineTo(chartWidth, y30);
      ctx.stroke();

      ctx.fillStyle = '#94A3B8';
      ctx.font = '9px monospace';
      ctx.fillText('70', chartWidth + 6, y70 + 3);
      ctx.fillText('30', chartWidth + 6, y30 + 3);

      // RSI Title
      ctx.fillStyle = '#94A3B8';
      ctx.font = 'bold 9px sans-serif';
      ctx.fillText('RSI (14)', 8, rsiTop + 12);

      // RSI Line
      ctx.strokeStyle = '#10B981';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      let rsiStarted = false;
      for (let i = 0; i < visibleCandles.length; i++) {
        const val = indicators.rsi[startIndex + i];
        if (val !== null) {
          const x = getX(i);
          const y = rsiTop + rsiHeight * (1 - val / 100);
          if (!rsiStarted) {
            ctx.moveTo(x, y);
            rsiStarted = true;
          } else ctx.lineTo(x, y);
        }
      }
      ctx.stroke();
    }

    // 7. Interactive Crosshair Overlay
    if (crosshairPos && crosshairPos.x >= 0 && crosshairPos.x <= chartWidth && crosshairPos.y <= height) {
      ctx.strokeStyle = 'rgba(248, 250, 252, 0.3)';
      ctx.lineWidth = 1;
      ctx.setLineDash([2, 2]);

      // Vertical line
      ctx.beginPath();
      ctx.moveTo(crosshairPos.x, 0);
      ctx.lineTo(crosshairPos.x, height);
      ctx.stroke();

      // Horizontal line
      ctx.beginPath();
      ctx.moveTo(0, crosshairPos.y);
      ctx.lineTo(width, crosshairPos.y);
      ctx.stroke();
      ctx.setLineDash([]);

      // Index & Candle details on hover
      const hoverIndex = Math.min(
        visibleCandles.length - 1,
        Math.max(0, Math.floor(crosshairPos.x / candleWidth))
      );
      const hoveredCandle = visibleCandles[hoverIndex];

      if (hoveredCandle) {
        // Price callout badge
        const hoverPrice = scaledMaxPrice - (crosshairPos.y / mainHeight) * scaledPriceRange;
        ctx.fillStyle = '#1E293B';
        ctx.fillRect(chartWidth, crosshairPos.y - 10, paddingRight, 20);
        ctx.fillStyle = '#F8FAFC';
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(hoverPrice.toFixed(hoverPrice > 100 ? 2 : 5), chartWidth + paddingRight / 2, crosshairPos.y + 3);

        // Top Info Bar Callout
        ctx.fillStyle = '#0B0E14';
        ctx.fillRect(10, 10, 360, 24);
        ctx.fillStyle = '#F8FAFC';
        ctx.font = '11px monospace';
        ctx.textAlign = 'left';
        ctx.fillText(
          `O: ${hoveredCandle.open.toFixed(hoveredCandle.open > 100 ? 2 : 5)}  H: ${hoveredCandle.high.toFixed(hoveredCandle.high > 100 ? 2 : 5)}  L: ${hoveredCandle.low.toFixed(hoveredCandle.low > 100 ? 2 : 5)}  C: ${hoveredCandle.close.toFixed(hoveredCandle.close > 100 ? 2 : 5)}`,
          16,
          26
        );
      }
    }

    ctx.restore();
  }, [
    activeCandles,
    visibleCount,
    panOffset,
    chartType,
    showMA20,
    showEMA50,
    showBollinger,
    showRSI,
    crosshairPos,
    indicators,
  ]);

  // Handle Resize & Canvas Buffer Setup
  useEffect(() => {
    const handleResize = () => {
      const container = containerRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      const rect = container.getBoundingClientRect();
      const dpr = window.devicePixelRatio || 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      renderCanvas();
    };

    const observer = new ResizeObserver(handleResize);
    if (containerRef.current) observer.observe(containerRef.current);

    handleResize();

    return () => observer.disconnect();
  }, [renderCanvas]);

  useEffect(() => {
    renderCanvas();
  }, [renderCanvas]);

  // Wheel Zoom & Drag Handlers
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (e.deltaY < 0) {
      setVisibleCount((prev) => Math.max(15, prev - 5));
    } else {
      setVisibleCount((prev) => Math.min(200, prev + 5));
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStartX(e.clientX);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    setCrosshairPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });

    if (isDragging) {
      const deltaX = e.clientX - dragStartX;
      if (Math.abs(deltaX) > 8) {
        setPanOffset((prev) => Math.max(0, Math.min(activeCandles.length - visibleCount, prev + (deltaX > 0 ? 1 : -1))));
        setDragStartX(e.clientX);
      }
    }
  };

  const handleMouseLeave = () => {
    setIsDragging(false);
    setCrosshairPos(null);
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const resetView = () => {
    setVisibleCount(60);
    setPanOffset(0);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen().then(() => setIsFullscreen(true)).catch(() => {});
    } else {
      document.exitFullscreen().then(() => setIsFullscreen(false)).catch(() => {});
    }
  };

  return (
    <div
      ref={containerRef}
      className={`flex flex-col bg-[#0B0E14] border border-[#1E293B] rounded-2xl overflow-hidden shadow-xl ${
        isFullscreen ? 'fixed inset-0 z-50 rounded-none' : 'h-[520px] w-full'
      }`}
    >
      {/* Chart Control Toolbar */}
      <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-[#131822] border-b border-[#1E293B] text-xs shrink-0">
        {/* Left: Timeframe selectors */}
        <div className="flex items-center space-x-1 overflow-x-auto">
          {timeframes.map((tf) => (
            <button
              key={tf}
              onClick={() => onTimeframeChange(tf)}
              className={`px-2.5 py-1 rounded font-mono font-semibold text-[11px] cursor-pointer transition-colors ${
                timeframe === tf
                  ? 'bg-[#38BDF8] text-[#0B0E14]'
                  : 'text-[#94A3B8] hover:bg-[#1E293B] hover:text-[#F8FAFC]'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>

        {/* Center: Chart Type Toggles */}
        <div className="flex items-center space-x-1 border-x border-[#1E293B] px-3">
          <button
            onClick={() => setChartType('CANDLESTICK')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
              chartType === 'CANDLESTICK' ? 'bg-[#1E293B] text-[#38BDF8]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Candles
          </button>
          <button
            onClick={() => setChartType('LINE')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
              chartType === 'LINE' ? 'bg-[#1E293B] text-[#38BDF8]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Line
          </button>
          <button
            onClick={() => setChartType('AREA')}
            className={`px-2.5 py-1 rounded text-[11px] font-medium cursor-pointer transition-colors ${
              chartType === 'AREA' ? 'bg-[#1E293B] text-[#38BDF8]' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
          >
            Area
          </button>
        </div>

        {/* Right: Technical Indicators & View Controls */}
        <div className="flex items-center space-x-2">
          <button
            onClick={() => setShowMA20(!showMA20)}
            className={`px-2 py-1 rounded text-[10px] font-mono cursor-pointer transition-colors ${
              showMA20 ? 'bg-[#38BDF8]/20 text-[#38BDF8] border border-[#38BDF8]/30' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
            title="Moving Average 20"
          >
            MA(20)
          </button>
          <button
            onClick={() => setShowEMA50(!showEMA50)}
            className={`px-2 py-1 rounded text-[10px] font-mono cursor-pointer transition-colors ${
              showEMA50 ? 'bg-amber-500/20 text-amber-400 border border-amber-500/30' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
            title="Exponential Moving Average 50"
          >
            EMA(50)
          </button>
          <button
            onClick={() => setShowBollinger(!showBollinger)}
            className={`px-2 py-1 rounded text-[10px] font-mono cursor-pointer transition-colors ${
              showBollinger ? 'bg-sky-400/20 text-sky-300 border border-sky-400/30' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
            title="Bollinger Bands (20,2)"
          >
            BB(20,2)
          </button>
          <button
            onClick={() => setShowRSI(!showRSI)}
            className={`px-2 py-1 rounded text-[10px] font-mono cursor-pointer transition-colors ${
              showRSI ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-[#94A3B8] hover:text-[#F8FAFC]'
            }`}
            title="Relative Strength Index (14)"
          >
            RSI(14)
          </button>

          <div className="h-4 w-px bg-[#1E293B] mx-1" />

          <button
            onClick={() => setVisibleCount((p) => Math.max(15, p - 10))}
            className="p-1 text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={() => setVisibleCount((p) => Math.min(200, p + 10))}
            className="p-1 text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={resetView}
            className="p-1 text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
            title="Reset Zoom & Pan"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={toggleFullscreen}
            className="p-1 text-[#94A3B8] hover:text-[#F8FAFC] cursor-pointer"
            title="Toggle Fullscreen"
          >
            {isFullscreen ? <Minimize2 className="w-3.5 h-3.5" /> : <Maximize2 className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {/* Main Canvas Area */}
      <div className="relative flex-1 bg-[#0B0E14] cursor-crosshair overflow-hidden">
        <canvas
          ref={canvasRef}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseLeave}
          className="w-full h-full block"
        />

        {/* Loading Overlay */}
        {candles.length === 0 && (
          <div className="absolute inset-0 bg-[#0B0E14]/80 backdrop-blur-sm flex flex-col items-center justify-center space-y-3 z-10">
            <div className="w-8 h-8 rounded-full border-2 border-[#38BDF8] border-t-transparent animate-spin" />
            <p className="text-xs font-mono text-[#94A3B8]">Loading market history from Deriv...</p>
          </div>
        )}

        {/* Data Freshness Indicator Watermark */}
        <div className="absolute bottom-3 left-3 bg-[#131822]/90 border border-[#1E293B] px-2.5 py-1 rounded-md text-[10px] font-mono flex items-center space-x-2 pointer-events-none">
          <span
            className={`w-2 h-2 rounded-full ${
              dataFreshness === 'LIVE'
                ? 'bg-[#22C55E] animate-pulse'
                : dataFreshness === 'RECENT'
                ? 'bg-amber-400'
                : 'bg-[#EF4444]'
            }`}
          />
          <span className="text-[#94A3B8] font-semibold uppercase">{symbolName}</span>
          <span className="text-[#F8FAFC]">{dataFreshness} DATA</span>
        </div>
      </div>
    </div>
  );
};
