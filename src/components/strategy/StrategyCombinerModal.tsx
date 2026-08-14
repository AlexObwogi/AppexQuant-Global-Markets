import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { UserStrategy } from '../../types/ai.js';
import { X, Plus, GitMerge, ArrowRight, Save, Trash2, Layers } from 'lucide-react';

interface StrategyCombinerModalProps {
  isOpen: boolean;
  onClose: () => void;
  strategies: UserStrategy[];
  onCombine: (newStrategy: UserStrategy) => void;
}

export const StrategyCombinerModal: React.FC<StrategyCombinerModalProps> = ({ isOpen, onClose, strategies, onCombine }) => {
  const [selectedStrats, setSelectedStrats] = useState<{ id: string; logic: 'AND' | 'OR' | 'THEN' }[]>([]);
  const [name, setName] = useState('');
  
  if (!isOpen) return null;

  const handleAdd = (stratId: string) => {
    setSelectedStrats([...selectedStrats, { id: stratId, logic: selectedStrats.length > 0 ? 'AND' : 'AND' }]);
  };

  const handleUpdateLogic = (index: number, logic: 'AND' | 'OR' | 'THEN') => {
    const updated = [...selectedStrats];
    updated[index].logic = logic;
    setSelectedStrats(updated);
  };

  const handleRemove = (index: number) => {
    setSelectedStrats(selectedStrats.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    if (selectedStrats.length < 2) return;
    
    const baseStrats = selectedStrats.map(s => strategies.find(st => st.id === s.id)).filter(Boolean) as UserStrategy[];
    
    let combinedDesc = baseStrats.map((s, i) => {
      if (i === 0) return s.name;
      return `${selectedStrats[i].logic} ${s.name}`;
    }).join(' ');

    const newStrat: UserStrategy = {
      id: `strat-combined-${Date.now()}`,
      name: name || `Combined: ${baseStrats.map(s => s.name.substring(0, 5)).join('+')}`,
      description: `Combined Strategy Flow: ${combinedDesc}`,
      version: '1.0',
      owner: 'User',
      symbols: baseStrats[0].symbols, // Simplify by taking first
      timeframes: baseStrats[0].timeframes,
      entryConditions: baseStrats.flatMap(s => s.entryConditions),
      exitConditions: baseStrats.flatMap(s => s.exitConditions),
      filters: baseStrats.flatMap(s => s.filters),
      riskProfile: baseStrats[0].riskProfile,
      sessionRestrictions: baseStrats[0].sessionRestrictions,
      maxPositions: 1,
      cooldown: 5,
      status: 'DRAFT',
      environment: 'PAPER',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      versionHistory: []
    };

    onCombine(newStrat);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-bg-main/80 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.96 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.96 }}
        className="w-full max-w-2xl bg-bg-surface border border-border-color rounded-xl shadow-2xl flex flex-col max-h-[85vh]"
      >
        <div className="p-4 border-b border-border-color flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <GitMerge className="w-5 h-5 text-accent-primary" />
            <h2 className="text-sm font-bold text-text-primary">Combine Strategies</h2>
          </div>
          <button onClick={onClose} className="p-1.5 rounded hover:bg-bg-hover text-text-secondary transition-colors">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          <div>
            <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Combined Strategy Name</label>
            <input 
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Master Trend Reversal"
              className="w-full bg-bg-main border border-border-color rounded-lg px-3 py-2 text-sm text-text-primary focus:border-accent-primary focus:outline-none"
            />
          </div>

          <div>
            <label className="text-xs font-bold text-text-secondary uppercase mb-2 block">Strategy Sequence</label>
            <div className="space-y-2">
              {selectedStrats.map((item, idx) => {
                const strat = strategies.find(s => s.id === item.id);
                return (
                  <div key={idx} className="flex flex-col gap-2">
                    {idx > 0 && (
                      <div className="flex items-center gap-2 pl-4">
                        <select
                          value={item.logic}
                          onChange={(e) => handleUpdateLogic(idx, e.target.value as any)}
                          className="bg-bg-hover border border-border-color text-xs rounded px-2 py-1 outline-none text-text-primary font-mono font-bold"
                        >
                          <option value="AND">AND (Require Both)</option>
                          <option value="OR">OR (Either Condition)</option>
                          <option value="THEN">THEN (Sequence / Wait)</option>
                        </select>
                      </div>
                    )}
                    <div className="p-3 bg-bg-main border border-border-color rounded flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <Layers className="w-4 h-4 text-text-secondary" />
                        <span className="text-sm font-bold">{strat?.name || 'Unknown Strategy'}</span>
                      </div>
                      <button onClick={() => handleRemove(idx)} className="text-color-danger hover:opacity-80 p-1">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}

              <div className="mt-4 relative">
                <select 
                  className="w-full bg-bg-hover border border-border-color border-dashed rounded p-3 text-sm text-text-secondary appearance-none text-center cursor-pointer font-bold outline-none"
                  onChange={(e) => {
                    if (e.target.value) {
                      handleAdd(e.target.value);
                      e.target.value = '';
                    }
                  }}
                  value=""
                >
                  <option value="" disabled>+ Add Strategy to Sequence</option>
                  {strategies.map(s => (
                    <option key={s.id} value={s.id}>{s.name}</option>
                  ))}
                </select>
                <Plus className="absolute left-1/2 -ml-[85px] top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary pointer-events-none" />
              </div>
            </div>
          </div>
        </div>

        <div className="p-4 border-t border-border-color flex justify-end gap-2 shrink-0 bg-bg-surface rounded-b-xl">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-lg bg-bg-hover text-text-primary font-bold text-xs"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={selectedStrats.length < 2}
            className="px-4 py-2 rounded-lg bg-accent-primary hover:bg-accent-primary/90 text-bg-secondary font-bold text-xs flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-4 h-4" />
            <span>Save Combined Strategy</span>
          </button>
        </div>
      </motion.div>
    </div>
  );
};
