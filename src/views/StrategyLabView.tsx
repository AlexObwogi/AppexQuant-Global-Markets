import React, { useState } from 'react';
import { Brain, Sparkles, Target, BarChart2, Save, Play } from 'lucide-react';
import { useMarketData } from '../state/MarketDataContext.tsx';
import { Card } from '../components/ui/Card.tsx';

export const StrategyLabView: React.FC = () => {
  const [idea, setIdea] = useState('');
  const { selectedSymbol } = useMarketData();

  return (
    <div className="flex flex-col h-full p-4 space-y-4 container mx-auto max-w-screen-2xl">
      <h2 className="text-2xl font-bold text-text-primary">AI Strategy Lab</h2>
      <p className="text-text-secondary">Describe your trading idea, and our AI will help you build it.</p>
      
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1">
        <div className="lg:col-span-1 space-y-4">
          <Card className="p-4">
            <h3 className="font-bold mb-2 flex items-center gap-2"><Brain className="w-5 h-5 text-accent-primary" /> Describe Your Idea</h3>
            <textarea
              value={idea}
              onChange={(e) => setIdea(e.target.value)}
              className="w-full h-48 bg-bg-main p-3 rounded-lg border border-border-color text-text-primary"
              placeholder="e.g. I want to trade liquidity sweeps during London session. I want price to take previous highs or lows, then show displacement and an FVG before I consider an entry."
            />
            <button className="w-full mt-3 bg-accent-primary text-bg-main font-bold py-2 rounded-lg hover:bg-accent-primary/90">
              Compile Strategy
            </button>
          </Card>
        </div>

        <div className="lg:col-span-2 space-y-4">
          <Card className="p-4 flex-1">
            <h3 className="font-bold mb-4 flex items-center gap-2"><Sparkles className="w-5 h-5 text-accent-primary" /> Strategy Blueprint</h3>
            <div className="text-text-secondary italic">Blueprint will appear here after compilation...</div>
          </Card>
          
          <Card className="p-4">
            <h3 className="font-bold mb-4 flex items-center gap-2"><BarChart2 className="w-5 h-5 text-accent-primary" /> Performance Simulation</h3>
            <div className="text-text-secondary italic">Backtest results will appear here...</div>
          </Card>
        </div>
      </div>
    </div>
  );
};
