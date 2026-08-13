/**
 * Market Structure Lab Component
 * Interactive learning tool for identifying Higher Highs, Lower Lows, BOS, and CHoCH.
 */

import React, { useState } from 'react';
import { Compass, CheckCircle2, AlertCircle } from 'lucide-react';

export const MarketStructureLab: React.FC = () => {
  const [selectedTag, setSelectedTag] = useState<string>('BOS');
  const [userLabels, setUserLabels] = useState<Record<number, string>>({
    1: 'HH',
    2: 'HL',
    3: 'BOS',
    4: 'CHoCH'
  });
  const [feedback, setFeedback] = useState<string | null>(null);

  const handleLabelClick = (pointId: number, expected: string) => {
    setUserLabels((prev) => ({ ...prev, [pointId]: selectedTag }));
    if (selectedTag === expected) {
      setFeedback(`Correct! Point ${pointId} is indeed a ${expected}.`);
    } else {
      setFeedback(`Incorrect for Point ${pointId}. Review the definition of ${expected}.`);
    }
  };

  return (
    <div className="bg-[#131822] border border-border-color rounded-2xl p-6 text-slate-100 shadow-xl">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 mb-6">
        <div>
          <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
            <Compass className="w-4 h-4 text-sky-400" /> Market Structure Labeling Lab
          </h3>
          <p className="text-xs text-text-secondary mt-0.5">Select a structural tag and click swing points on the chart model to test your understanding.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          {['HH', 'HL', 'LH', 'LL', 'BOS', 'CHoCH'].map((tag) => (
            <button
              key={tag}
              onClick={() => setSelectedTag(tag)}
              className={`px-3 py-1.5 rounded-lg text-xs font-mono font-bold transition cursor-pointer ${
                selectedTag === tag ? 'bg-sky-500 text-bg-main shadow-md shadow-sky-500/20' : 'bg-bg-surface border border-border-color text-text-primary hover:bg-bg-hover'
              }`}
            >
              {tag}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-[#0B0E14] border border-border-color rounded-xl p-6 relative h-64 flex items-center justify-center">
        {/* Simplified SVG structural wave model */}
        <svg className="absolute inset-0 w-full h-full p-4" viewBox="0 0 600 200" fill="none">
          {/* Wave line */}
          <path d="M 50,150 L 150,80 L 220,120 L 320,50 L 400,100 L 500,40 L 550,80" stroke="#38BDF8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
          
          {/* Interactive Nodes */}
          <circle cx="150" cy="80" r="12" fill="#1E293B" stroke="#38BDF8" strokeWidth="2" className="cursor-pointer hover:scale-125 transition" onClick={() => handleLabelClick(1, 'HH')} />
          <circle cx="220" cy="120" r="12" fill="#1E293B" stroke="#38BDF8" strokeWidth="2" className="cursor-pointer hover:scale-125 transition" onClick={() => handleLabelClick(2, 'HL')} />
          <circle cx="320" cy="50" r="12" fill="#1E293B" stroke="#38BDF8" strokeWidth="2" className="cursor-pointer hover:scale-125 transition" onClick={() => handleLabelClick(3, 'BOS')} />
          <circle cx="500" cy="40" r="12" fill="#1E293B" stroke="#38BDF8" strokeWidth="2" className="cursor-pointer hover:scale-125 transition" onClick={() => handleLabelClick(4, 'CHoCH')} />
        </svg>

        <div className="absolute bottom-3 left-4 text-[10px] text-text-secondary font-mono">
          Click nodes above to tag with active tool: <span className="text-sky-400 font-bold">{selectedTag}</span>
        </div>
      </div>

      {feedback && (
        <div className={`mt-4 p-3.5 rounded-xl text-xs flex items-center gap-2 ${feedback.includes('Correct') ? 'bg-emerald-500/10 border border-emerald-500/20 text-emerald-300' : 'bg-amber-500/10 border border-amber-500/20 text-amber-300'}`}>
          {feedback.includes('Correct') ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          <span>{feedback}</span>
        </div>
      )}
    </div>
  );
};
