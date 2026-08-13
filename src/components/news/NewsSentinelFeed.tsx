/**
 * AppexQuant Markets Global - Phase 3 News Sentinel Feed
 * Institutional financial news feed with NLP sentiment classification & impact tags.
 */

import React, { useState } from 'react';
import { INITIAL_NEWS_ITEMS } from '../../services/ai/newsSentinelEngine';
import { NewsItem } from '../../types/ai';
import { Newspaper, TrendingUp, TrendingDown, Minus, ExternalLink, Filter, ShieldAlert } from 'lucide-react';

export const NewsSentinelFeed: React.FC = () => {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [newsList] = useState<NewsItem[]>(INITIAL_NEWS_ITEMS);

  const filteredNews = newsList.filter((item) =>
    selectedCategory === 'ALL' ? true : item.category === selectedCategory
  );

  const bullishCount = newsList.filter((n) => n.sentiment === 'BULLISH').length;
  const bearishCount = newsList.filter((n) => n.sentiment === 'BEARISH').length;
  const neutralCount = newsList.filter((n) => n.sentiment === 'NEUTRAL').length;

  return (
    <div className="space-y-6">
      {/* Macro Sentiment Overview Gauge */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-[#131822] border border-[#1E293B] rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-text-secondary block mb-1">Bullish News Catalysts</span>
            <span className="text-2xl font-bold font-mono text-emerald-400">{bullishCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <TrendingUp className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#131822] border border-[#1E293B] rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-text-secondary block mb-1">Bearish Market Factors</span>
            <span className="text-2xl font-bold font-mono text-rose-400">{bearishCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20">
            <TrendingDown className="w-6 h-6" />
          </div>
        </div>

        <div className="bg-[#131822] border border-[#1E293B] rounded-2xl p-5 flex items-center justify-between">
          <div>
            <span className="text-xs text-text-secondary block mb-1">Neutral / Policy Data</span>
            <span className="text-2xl font-bold font-mono text-text-primary">{neutralCount}</span>
          </div>
          <div className="p-3 rounded-xl bg-bg-hover text-text-secondary">
            <Minus className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Category Filter Tabs */}
      <div className="flex items-center space-x-2 border-b border-[#1E293B] pb-3 overflow-x-auto">
        {['ALL', 'Macroeconomics', 'Commodities', 'Central Banks', 'Synthetics'].map((cat) => (
          <button
            key={cat}
            onClick={() => setSelectedCategory(cat)}
            className={`px-4 py-2 rounded-xl text-xs font-bold transition-colors whitespace-nowrap ${
              selectedCategory === cat
                ? 'bg-[#38BDF8] text-bg-main'
                : 'bg-[#131822] text-text-secondary hover:text-white border border-[#1E293B]'
            }`}
          >
            {cat}
          </button>
        ))}
      </div>

      {/* News Feed List */}
      <div className="space-y-4">
        {filteredNews.map((item) => (
          <div
            key={item.id}
            className="bg-[#131822] border border-[#1E293B] hover:border-[#38BDF8]/30 rounded-2xl p-5 transition-all"
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center space-x-2">
                <span
                  className={`text-[10px] px-2.5 py-0.5 rounded-full font-bold font-mono ${
                    item.importance === 'HIGH'
                      ? 'bg-rose-500/15 text-rose-400 border border-rose-500/30'
                      : 'bg-amber-500/15 text-amber-400 border border-amber-500/30'
                  }`}
                >
                  {item.importance} IMPACT
                </span>
                <span className="text-xs text-text-secondary font-mono">{item.source}</span>
              </div>

              <span className="text-xs text-text-secondary font-mono">
                {new Date(item.publishedAt).toLocaleTimeString()}
              </span>
            </div>

            <h4 className="text-base font-bold text-slate-100 mb-2 leading-snug">{item.headline}</h4>
            <p className="text-xs text-text-secondary mb-4 leading-relaxed">{item.summary}</p>

            <div className="flex flex-wrap items-center justify-between gap-2 border-t border-[#1E293B] pt-3 text-xs">
              <div className="flex items-center space-x-2 font-mono">
                <span className="text-text-secondary text-[11px]">Related:</span>
                {item.relatedSymbols.map((s) => (
                  <span key={s} className="px-2 py-0.5 rounded bg-[#0B0E14] text-text-primary text-[10px]">
                    {s}
                  </span>
                ))}
              </div>

              <span
                className={`font-mono text-xs font-bold ${
                  item.sentiment === 'BULLISH'
                    ? 'text-emerald-400'
                    : item.sentiment === 'BEARISH'
                    ? 'text-rose-400'
                    : 'text-text-secondary'
                }`}
              >
                Sentiment: {item.sentiment} ({item.sentimentConfidence}%)
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
