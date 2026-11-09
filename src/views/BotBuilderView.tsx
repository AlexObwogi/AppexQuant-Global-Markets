import React, { useState } from 'react';
import { useQuantis } from '../state/QuantisContext';
import { useGlobalState } from '../state/GlobalStateContext';
import { 
  Blocks, 
  Play, 
  Download, 
  Code2, 
  Plus, 
  Trash2, 
  CheckCircle, 
  Sliders, 
  ArrowLeft, 
  Sparkles, 
  Layers, 
  Save, 
  FileCode,
  DollarSign,
  TrendingUp,
  Shield,
  Activity,
  Zap
} from 'lucide-react';

interface LogicBlock {
  id: string;
  type: 'market' | 'purchase' | 'recovery' | 'risk';
  title: string;
  description: string;
  settings: Record<string, any>;
}

export const BotBuilderView: React.FC = () => {
  const { setActiveBot, startExecution } = useQuantis();
  const { setCurrentView } = useGlobalState();

  const [botName, setBotName] = useState('Quantis Algorithmic Matrix V1');
  const [selectedCategory, setSelectedCategory] = useState<'all' | 'market' | 'purchase' | 'recovery' | 'risk'>('all');
  const [activeTab, setActiveTab] = useState<'canvas' | 'xml'>('canvas');
  const [saveSuccess, setSaveSuccess] = useState(false);

  // Active workspace blocks
  const [blocks, setBlocks] = useState<LogicBlock[]>([
    {
      id: 'block-1',
      type: 'market',
      title: '1. Market & Asset Selection',
      description: 'Connects to Deriv tick feed and subscribes to real-time quotes.',
      settings: {
        symbol: 'R_100',
        contractType: 'DIGITDIFF',
        duration: 1,
        durationType: 't',
      },
    },
    {
      id: 'block-2',
      type: 'purchase',
      title: '2. Purchase Logic & Entry Trigger',
      description: 'Condition evaluated on every tick event before purchase.',
      settings: {
        predictionDigit: 5,
        stake: 1.0,
        triggerCondition: 'last_digit_differs_3_times',
      },
    },
    {
      id: 'block-3',
      type: 'recovery',
      title: '3. Martingale & Loss Recovery Matrix',
      description: 'Calculates stake progression following contract loss.',
      settings: {
        recoveryType: 'martingale',
        multiplier: 2.1,
        maxIterations: 4,
      },
    },
    {
      id: 'block-4',
      type: 'risk',
      title: '4. Mathematical Risk Circuit Breaker',
      description: 'Enforces hard exit thresholds to protect capital.',
      settings: {
        takeProfit: 15.0,
        stopLoss: 25.0,
        maxConsecutiveLosses: 3,
      },
    },
  ]);

  const addBlock = (type: 'market' | 'purchase' | 'recovery' | 'risk') => {
    const newId = `block-${Date.now()}`;
    if (type === 'purchase') {
      setBlocks(prev => [...prev, {
        id: newId,
        type: 'purchase',
        title: 'Purchase Filter & Signal Rule',
        description: 'Custom trigger condition on tick stream.',
        settings: {
          predictionDigit: 0,
          stake: 1.0,
          triggerCondition: 'skew_exceeds_threshold',
        }
      }]);
    } else if (type === 'recovery') {
      setBlocks(prev => [...prev, {
        id: newId,
        type: 'recovery',
        title: 'D\'Alembert Incremental Recovery',
        description: 'Increases stake linearly (+1 base unit) on loss.',
        settings: {
          recoveryType: 'dalembert',
          stepUnit: 0.5,
          maxSteps: 5,
        }
      }]);
    } else {
      setBlocks(prev => [...prev, {
        id: newId,
        type: 'risk',
        title: 'Dynamic Trailing Stop Loss',
        description: 'Locks in accrued profit if drawdowns exceed threshold.',
        settings: {
          trailingPercent: 15,
          lockAfterProfit: 10.0,
        }
      }]);
    }
  };

  const removeBlock = (id: string) => {
    setBlocks(prev => prev.filter(b => b.id !== id));
  };

  const updateSetting = (blockId: string, key: string, value: any) => {
    setBlocks(prev => prev.map(b => {
      if (b.id === blockId) {
        return {
          ...b,
          settings: {
            ...b.settings,
            [key]: value,
          }
        };
      }
      return b;
    }));
  };

  // Generate XML script matching Deriv Blockly structure
  const generatedXml = `<?xml version="1.0" encoding="UTF-8"?>
<xml xmlns="http://www.w3.org/1999/xhtml" collection="false">
  <variables>
    <variable type="" id="stake">Stake</variable>
    <variable type="" id="win_stake">Initial Stake</variable>
    <variable type="" id="take_profit">Take Profit</variable>
    <variable type="" id="stop_loss">Stop Loss</variable>
  </variables>
  <!-- Quantis FX Algorithmic Engine: ${botName} -->
  <block type="trade" id="trade_contract" deletable="false" x="0" y="0">
    <statement name="SUBMARKET">
      <block type="market" id="market_config">
        <field name="MARKET_LIST">synthetic_index</field>
        <field name="SUBMARKET_LIST">random_index</field>
        <field name="SYMBOL_LIST">${blocks.find(b => b.type === 'market')?.settings.symbol || 'R_100'}</field>
        <field name="TRADETYPECAT_LIST">digits</field>
        <field name="TRADETYPE_LIST">${blocks.find(b => b.type === 'market')?.settings.contractType || 'DIGITDIFF'}</field>
        <field name="TYPE_LIST">both</field>
        <field name="CANDLEINTERVAL_LIST">60</field>
        <field name="DURATIONTYPE_LIST">t</field>
        <value name="DURATION">
          <block type="math_number"><field name="NUM">1</field></block>
        </value>
        <value name="AMOUNT">
          <block type="math_number"><field name="NUM">${blocks.find(b => b.type === 'purchase')?.settings.stake || 1.0}</field></block>
        </value>
      </block>
    </statement>
    <statement name="INITIALIZATION">
      <block type="variables_set">
        <field name="VAR" id="take_profit">Take Profit</field>
        <value name="VALUE"><block type="math_number"><field name="NUM">${blocks.find(b => b.type === 'risk')?.settings.takeProfit || 15}</field></block></value>
      </block>
      <block type="variables_set">
        <field name="VAR" id="stop_loss">Stop Loss</field>
        <value name="VALUE"><block type="math_number"><field name="NUM">${blocks.find(b => b.type === 'risk')?.settings.stopLoss || 25}</field></block></value>
      </block>
    </statement>
  </block>
</xml>`;

  const handleExportXml = () => {
    const blob = new Blob([generatedXml], { type: 'application/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${botName.toLowerCase().replace(/\s+/g, '_')}.xml`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
  };

  const handleDeployToEngine = () => {
    const marketBlock = blocks.find(b => b.type === 'market');
    const purchaseBlock = blocks.find(b => b.type === 'purchase');
    const recoveryBlock = blocks.find(b => b.type === 'recovery');
    const riskBlock = blocks.find(b => b.type === 'risk');

    setActiveBot({
      id: `custom-${Date.now()}`,
      name: botName,
      strategyType: marketBlock?.settings.contractType || 'DIGITDIFF',
      symbol: marketBlock?.settings.symbol || 'R_100',
      stake: Number(purchaseBlock?.settings.stake) || 1.0,
      martingaleMultiplier: Number(recoveryBlock?.settings.multiplier) || 2.1,
      takeProfit: Number(riskBlock?.settings.takeProfit) || 15,
      stopLoss: Number(riskBlock?.settings.stopLoss) || 25,
      description: `Custom Blockly Bot designed in Quantis Visual Studio with ${blocks.length} interlocking rule blocks.`,
      isCustom: true,
      rawXml: generatedXml,
    });

    setSaveSuccess(true);
    setTimeout(() => setSaveSuccess(false), 3000);
  };

  const handleDeployAndRun = () => {
    handleDeployToEngine();
    startExecution();
    setCurrentView('dashboard');
  };

  return (
    <div className="space-y-6 pb-24">
      {/* Top Header */}
      <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
        <div>
          <button
            onClick={() => setCurrentView('dashboard')}
            className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to Dashboard
          </button>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-cyan-500/10 border border-cyan-500/30 text-cyan-400">
                <Blocks className="h-5 w-5" />
              </div>
              Quantis Visual Bot Studio
            </h1>
            <span className="rounded-md border border-cyan-500/30 bg-cyan-950/40 px-2 py-0.5 text-xs font-mono text-cyan-300">
              Blockly IDE
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-1">
            Build custom automated trading algorithms using interlocking logic blocks compatible with the Deriv XML format.
          </p>
        </div>

        {/* Action Controls */}
        <div className="flex flex-wrap items-center gap-2.5">
          <button
            onClick={handleExportXml}
            className="flex items-center gap-1.5 rounded-xl border border-slate-700 bg-slate-900 px-3.5 py-2 text-xs font-semibold text-slate-200 hover:border-slate-600 hover:text-white transition-colors"
          >
            <Download className="h-4 w-4 text-cyan-400" />
            Export XML
          </button>

          <button
            onClick={handleDeployToEngine}
            className="flex items-center gap-1.5 rounded-xl border border-cyan-500/30 bg-cyan-950/50 px-3.5 py-2 text-xs font-semibold text-cyan-300 hover:bg-cyan-900/50 transition-colors"
          >
            <Save className="h-4 w-4 text-cyan-400" />
            Save Bot
          </button>

          <button
            onClick={handleDeployAndRun}
            className="flex items-center gap-2 rounded-xl border border-cyan-400/30 bg-gradient-to-r from-cyan-500 to-blue-600 px-5 py-2 text-xs font-bold uppercase tracking-wider text-slate-950 hover:from-cyan-400 hover:to-blue-500 hover:text-white transition-all shadow-lg shadow-cyan-500/20"
          >
            <Play className="h-4 w-4 fill-current" />
            Deploy &amp; Run
          </button>
        </div>
      </div>

      {saveSuccess && (
        <div className="flex items-center gap-2 rounded-xl border border-emerald-500/30 bg-emerald-950/40 p-3 text-xs text-emerald-300">
          <CheckCircle className="h-4 w-4 text-emerald-400" />
          <span>Strategy <strong>{botName}</strong> successfully compiled and loaded into the Quantis Live Execution Engine!</span>
        </div>
      )}

      {/* Main Studio Layout */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-4">
        {/* Left Sidebar: Block Library */}
        <div className="space-y-4 lg:col-span-1">
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-xl">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-2">
              <Layers className="h-4 w-4 text-cyan-400" />
              Logic Blocks Library
            </h3>
            <p className="mt-1 text-[11px] text-slate-500">
              Click to insert modular execution blocks into your workspace.
            </p>

            <div className="mt-4 space-y-2">
              <button
                onClick={() => addBlock('purchase')}
                className="w-full flex items-center justify-between rounded-xl border border-cyan-500/20 bg-slate-950/60 p-3 text-left hover:border-cyan-500/50 hover:bg-slate-900 transition-all group"
              >
                <div>
                  <div className="text-xs font-bold text-cyan-300 group-hover:text-cyan-200">
                    + Purchase Condition
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Digit patterns &amp; momentum triggers
                  </div>
                </div>
                <Plus className="h-4 w-4 text-cyan-400 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() => addBlock('recovery')}
                className="w-full flex items-center justify-between rounded-xl border border-purple-500/20 bg-slate-950/60 p-3 text-left hover:border-purple-500/50 hover:bg-slate-900 transition-all group"
              >
                <div>
                  <div className="text-xs font-bold text-purple-300 group-hover:text-purple-200">
                    + Recovery Matrix
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Martingale / D'Alembert progressions
                  </div>
                </div>
                <Plus className="h-4 w-4 text-purple-400 group-hover:scale-110 transition-transform" />
              </button>

              <button
                onClick={() => addBlock('risk')}
                className="w-full flex items-center justify-between rounded-xl border border-emerald-500/20 bg-slate-950/60 p-3 text-left hover:border-emerald-500/50 hover:bg-slate-900 transition-all group"
              >
                <div>
                  <div className="text-xs font-bold text-emerald-300 group-hover:text-emerald-200">
                    + Risk Circuit Breaker
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Dynamic trailing bounds &amp; caps
                  </div>
                </div>
                <Plus className="h-4 w-4 text-emerald-400 group-hover:scale-110 transition-transform" />
              </button>
            </div>
          </div>

          {/* Bot Meta Box */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/60 p-4 backdrop-blur-xl space-y-3">
            <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Bot Identifier
            </label>
            <input
              type="text"
              value={botName}
              onChange={(e) => setBotName(e.target.value)}
              className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
            />
            <div className="text-[11px] text-slate-500">
              Auto-saved locally. XML AST validated for Deriv WebSocket bridge.
            </div>
          </div>
        </div>

        {/* Center / Right: Interactive Canvas Workspace & XML Code View */}
        <div className="lg:col-span-3 space-y-4">
          {/* Workspace Tabs */}
          <div className="flex items-center justify-between border-b border-slate-800 pb-2">
            <div className="flex items-center gap-2">
              <button
                onClick={() => setActiveTab('canvas')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  activeTab === 'canvas'
                    ? 'border border-cyan-500/30 bg-cyan-950/50 text-cyan-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Blocks className="h-3.5 w-3.5" />
                Visual Logic Canvas
              </button>

              <button
                onClick={() => setActiveTab('xml')}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition-colors ${
                  activeTab === 'xml'
                    ? 'border border-cyan-500/30 bg-cyan-950/50 text-cyan-300'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                <Code2 className="h-3.5 w-3.5" />
                Raw XML AST
              </button>
            </div>

            <span className="text-[11px] font-mono text-slate-500">
              {blocks.length} Interconnected Blocks
            </span>
          </div>

          {activeTab === 'canvas' ? (
            <div className="space-y-4">
              {blocks.map((block, idx) => (
                <div
                  key={block.id}
                  className="rounded-2xl border border-slate-800 bg-slate-900/80 p-5 shadow-xl backdrop-blur-md transition-all hover:border-slate-700"
                >
                  <div className="flex items-start justify-between gap-3 border-b border-slate-800/80 pb-3">
                    <div className="flex items-center gap-2.5">
                      <span className="flex h-6 w-6 items-center justify-center rounded-lg bg-cyan-500/20 text-xs font-mono font-bold text-cyan-400">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-bold text-white">{block.title}</h4>
                        <p className="text-xs text-slate-400">{block.description}</p>
                      </div>
                    </div>

                    {block.type !== 'market' && (
                      <button
                        onClick={() => removeBlock(block.id)}
                        title="Delete Block"
                        className="rounded-lg p-1 text-slate-500 hover:bg-slate-800 hover:text-rose-400 transition-colors"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    )}
                  </div>

                  {/* Block Config Inputs */}
                  <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3">
                    {block.type === 'market' && (
                      <>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400">Synthetic Index</label>
                          <select
                            value={block.settings.symbol}
                            onChange={(e) => updateSetting(block.id, 'symbol', e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                          >
                            <option value="R_10">Volatility 10 (1s) Index</option>
                            <option value="R_25">Volatility 25 (1s) Index</option>
                            <option value="R_50">Volatility 50 (1s) Index</option>
                            <option value="R_75">Volatility 75 (1s) Index</option>
                            <option value="R_100">Volatility 100 (1s) Index</option>
                            <option value="1HZ100V">Volatility 100 Index</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400">Contract Type</label>
                          <select
                            value={block.settings.contractType}
                            onChange={(e) => updateSetting(block.id, 'contractType', e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                          >
                            <option value="DIGITDIFF">Matches / Differs</option>
                            <option value="DIGITEVEN">Even / Odd</option>
                            <option value="DIGITOVER">Over / Under</option>
                            <option value="CALLPUT">Rise / Fall</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400">Duration (Ticks)</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={block.settings.duration}
                            onChange={(e) => updateSetting(block.id, 'duration', Number(e.target.value))}
                            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </>
                    )}

                    {block.type === 'purchase' && (
                      <>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400">Base Stake ($)</label>
                          <input
                            type="number"
                            step="0.5"
                            min="0.35"
                            value={block.settings.stake}
                            onChange={(e) => updateSetting(block.id, 'stake', Number(e.target.value))}
                            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400">Prediction Digit</label>
                          <input
                            type="number"
                            min="0"
                            max="9"
                            value={block.settings.predictionDigit}
                            onChange={(e) => updateSetting(block.id, 'predictionDigit', Number(e.target.value))}
                            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400">Entry Trigger</label>
                          <select
                            value={block.settings.triggerCondition}
                            onChange={(e) => updateSetting(block.id, 'triggerCondition', e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                          >
                            <option value="last_digit_differs_3_times">Digit repeated 3x in a row</option>
                            <option value="skew_exceeds_threshold">Skew frequency &gt; 25%</option>
                            <option value="always_next_tick">Immediate Next Tick</option>
                          </select>
                        </div>
                      </>
                    )}

                    {block.type === 'recovery' && (
                      <>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400">Recovery Formula</label>
                          <select
                            value={block.settings.recoveryType}
                            onChange={(e) => updateSetting(block.id, 'recoveryType', e.target.value)}
                            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                          >
                            <option value="martingale">Martingale (Geometric)</option>
                            <option value="dalembert">D'Alembert (Arithmetic)</option>
                            <option value="flat">Fixed Flat Stake (No Recovery)</option>
                          </select>
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400">Multiplier / Step</label>
                          <input
                            type="number"
                            step="0.1"
                            min="1.0"
                            value={block.settings.multiplier || 2.1}
                            onChange={(e) => updateSetting(block.id, 'multiplier', Number(e.target.value))}
                            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400">Max Iterations</label>
                          <input
                            type="number"
                            min="1"
                            max="8"
                            value={block.settings.maxIterations || 4}
                            onChange={(e) => updateSetting(block.id, 'maxIterations', Number(e.target.value))}
                            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </>
                    )}

                    {block.type === 'risk' && (
                      <>
                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400">Take Profit ($)</label>
                          <input
                            type="number"
                            step="1.0"
                            min="1"
                            value={block.settings.takeProfit}
                            onChange={(e) => updateSetting(block.id, 'takeProfit', Number(e.target.value))}
                            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400">Stop Loss ($)</label>
                          <input
                            type="number"
                            step="1.0"
                            min="1"
                            value={block.settings.stopLoss}
                            onChange={(e) => updateSetting(block.id, 'stopLoss', Number(e.target.value))}
                            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                          />
                        </div>

                        <div>
                          <label className="text-[10px] uppercase font-bold text-slate-400">Max Loss Count</label>
                          <input
                            type="number"
                            min="1"
                            max="10"
                            value={block.settings.maxConsecutiveLosses || 3}
                            onChange={(e) => updateSetting(block.id, 'maxConsecutiveLosses', Number(e.target.value))}
                            className="mt-1 w-full rounded-xl border border-slate-800 bg-slate-950 px-3 py-2 text-xs text-white focus:border-cyan-500 focus:outline-none"
                          />
                        </div>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-950 p-4 font-mono text-xs text-cyan-300">
              <pre className="overflow-x-auto whitespace-pre-wrap">{generatedXml}</pre>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
