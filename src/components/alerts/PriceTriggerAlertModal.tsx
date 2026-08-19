/**
 * AppexQuant Markets Global - Price Trigger Alert Modal Component
 * Configures target price thresholds and preferred notification channels tied to live asset streams.
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Bell, X, Check, Volume2, Send, Mail, ShieldAlert, Sparkles, Plus, Trash2 } from 'lucide-react';
import { useMarketData } from '../../state/MarketDataContext.tsx';

export interface PriceAlert {
  id: string;
  symbol: string;
  targetPrice: number;
  condition: 'ABOVE' | 'BELOW';
  channels: {
    inApp: boolean;
    audio: boolean;
    telegram: boolean;
    email: boolean;
  };
  note: string;
  createdAt: string;
  status: 'ACTIVE' | 'TRIGGERED';
}

interface PriceTriggerAlertModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const STORAGE_KEY = 'apx_price_alerts_v1';

export const PriceTriggerAlertModal: React.FC<PriceTriggerAlertModalProps> = ({ isOpen, onClose }) => {
  const { selectedSymbol, instruments, ticks, setSelectedSymbol } = useMarketData();
  
  const [alerts, setAlerts] = useState<PriceAlert[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const currentTick = ticks[selectedSymbol];
  const activeInst = instruments.find((i) => i.symbol === selectedSymbol);
  const currentPrice = currentTick ? currentTick.quote : activeInst?.bid || 1.0;
  const pipSize = activeInst?.pipSize || 0.0001;

  const [targetPrice, setTargetPrice] = useState<number>(currentPrice);
  const [condition, setCondition] = useState<'ABOVE' | 'BELOW'>('ABOVE');
  const [channels, setChannels] = useState({
    inApp: true,
    audio: true,
    telegram: false,
    email: false,
  });
  const [note, setNote] = useState('');
  const [triggeredAlert, setTriggeredAlert] = useState<PriceAlert | null>(null);

  // Sync target price when current price updates initially
  useEffect(() => {
    if (isOpen) {
      setTargetPrice(Number((currentPrice * 1.005).toFixed(pipSize < 0.001 ? 5 : 2)));
    }
  }, [isOpen, selectedSymbol]);

  // Save alerts to localStorage
  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
    } catch (e) {
      console.warn('Failed to save price alerts:', e);
    }
  }, [alerts]);

  // LIVE PRICE ALERT WATCHER EFFECT
  useEffect(() => {
    if (alerts.length === 0) return;

    alerts.forEach((alert) => {
      if (alert.status !== 'ACTIVE') return;

      const tick = ticks[alert.symbol];
      if (!tick) return;

      const livePrice = tick.quote;
      let isTriggered = false;

      if (alert.condition === 'ABOVE' && livePrice >= alert.targetPrice) {
        isTriggered = true;
      } else if (alert.condition === 'BELOW' && livePrice <= alert.targetPrice) {
        isTriggered = true;
      }

      if (isTriggered) {
        // Mark alert as triggered
        setAlerts((prev) =>
          prev.map((a) => (a.id === alert.id ? { ...a, status: 'TRIGGERED' } : a))
        );

        setTriggeredAlert(alert);

        // Audio chime notification if enabled
        if (alert.channels.audio) {
          try {
            const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
            const osc = audioCtx.createOscillator();
            const gain = audioCtx.createGain();
            osc.type = 'sine';
            osc.frequency.setValueAtTime(880, audioCtx.currentTime); // A5 note
            gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
            osc.connect(gain);
            gain.connect(audioCtx.destination);
            osc.start();
            osc.stop(audioCtx.currentTime + 0.3);
          } catch (e) {
            // Audio context blocked or unsupported
          }
        }
      }
    });
  }, [ticks, alerts]);

  const handleCreateAlert = (e: React.FormEvent) => {
    e.preventDefault();

    const newAlert: PriceAlert = {
      id: `alert-${Date.now()}`,
      symbol: selectedSymbol,
      targetPrice,
      condition,
      channels,
      note: note.trim() || `Price alert when ${selectedSymbol} crosses ${condition} ${targetPrice}`,
      createdAt: new Date().toISOString(),
      status: 'ACTIVE',
    };

    setAlerts((prev) => [newAlert, ...prev]);
    setNote('');
  };

  const handleDeleteAlert = (id: string) => {
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  const applyOffset = (pct: number) => {
    const updated = currentPrice * (1 + pct / 100);
    setTargetPrice(Number(updated.toFixed(pipSize < 0.001 ? 5 : 2)));
    if (pct > 0) setCondition('ABOVE');
    else setCondition('BELOW');
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-bg-surface border border-border-color rounded-2xl p-5 max-w-lg w-full shadow-2xl space-y-4 max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between border-b border-border-color pb-3">
            <div className="flex items-center space-x-2">
              <div className="p-2 bg-cyan-500/10 text-cyan-400 rounded-xl border border-cyan-500/20">
                <Bell className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-text-primary font-display">
                  Price Trigger Alerts
                </h3>
                <p className="text-xs text-text-secondary">
                  Real-time target price monitor linked to Deriv live ticks
                </p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 text-text-secondary hover:text-text-primary hover:bg-bg-main rounded-xl transition-colors cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Triggered Alert Notification Banner */}
          {triggeredAlert && (
            <div className="p-3 bg-emerald-500/10 border border-emerald-500/30 rounded-xl flex items-center justify-between text-xs">
              <div className="flex items-center space-x-2 text-emerald-400 font-mono">
                <Sparkles className="w-4 h-4 animate-spin" />
                <span>
                  <strong>ALERT TRIGGERED:</strong> {triggeredAlert.symbol} reached target {triggeredAlert.targetPrice}!
                </span>
              </div>
              <button
                onClick={() => setTriggeredAlert(null)}
                className="text-emerald-400 underline cursor-pointer"
              >
                Dismiss
              </button>
            </div>
          )}

          {/* Active Asset Live Status */}
          <div className="p-3 bg-bg-main border border-border-color rounded-xl flex items-center justify-between font-mono text-xs">
            <div>
              <span className="text-text-secondary uppercase block text-[10px]">Symbol</span>
              <select
                value={selectedSymbol}
                onChange={(e) => setSelectedSymbol(e.target.value)}
                className="bg-transparent font-bold text-text-primary cursor-pointer focus:outline-none"
              >
                {instruments.map((inst) => (
                  <option key={inst.symbol} value={inst.symbol} className="bg-bg-surface text-text-primary">
                    {inst.displayName || inst.name} ({inst.symbol})
                  </option>
                ))}
              </select>
            </div>
            <div className="text-right">
              <span className="text-text-secondary uppercase block text-[10px]">Live Market Quote</span>
              <span className="text-text-primary font-bold text-sm">
                {currentPrice.toFixed(pipSize < 0.001 ? 5 : 2)}
              </span>
            </div>
          </div>

          {/* Create Alert Form */}
          <form onSubmit={handleCreateAlert} className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              {/* Target Price */}
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase block mb-1">
                  Target Price Threshold
                </label>
                <input
                  type="number"
                  step={pipSize < 0.001 ? '0.00001' : '0.01'}
                  value={targetPrice}
                  onChange={(e) => setTargetPrice(parseFloat(e.target.value) || 0)}
                  className="w-full bg-bg-main border border-border-color rounded-xl px-3 py-2 text-xs font-mono font-bold text-text-primary focus:border-accent-primary focus:outline-none"
                  required
                />
              </div>

              {/* Condition */}
              <div>
                <label className="text-xs font-bold text-text-secondary uppercase block mb-1">
                  Trigger Condition
                </label>
                <select
                  value={condition}
                  onChange={(e) => setCondition(e.target.value as 'ABOVE' | 'BELOW')}
                  className="w-full bg-bg-main border border-border-color rounded-xl px-3 py-2 text-xs font-mono font-bold text-text-primary focus:border-accent-primary focus:outline-none"
                >
                  <option value="ABOVE">Price Crosses ABOVE</option>
                  <option value="BELOW">Price Crosses BELOW</option>
                </select>
              </div>
            </div>

            {/* Quick Percentage Adjustments */}
            <div className="flex items-center space-x-1.5 overflow-x-auto pb-1">
              <span className="text-[10px] text-text-secondary uppercase font-bold mr-1">Offsets:</span>
              {[
                { label: '+0.5%', val: 0.5 },
                { label: '+1.0%', val: 1.0 },
                { label: '+2.0%', val: 2.0 },
                { label: '-0.5%', val: -0.5 },
                { label: '-1.0%', val: -1.0 },
                { label: '-2.0%', val: -2.0 },
              ].map((opt) => (
                <button
                  key={opt.label}
                  type="button"
                  onClick={() => applyOffset(opt.val)}
                  className="px-2 py-1 text-[10px] font-mono font-bold rounded-lg bg-bg-main border border-border-color hover:border-accent-primary transition-colors cursor-pointer text-text-secondary hover:text-text-primary"
                >
                  {opt.label}
                </button>
              ))}
            </div>

            {/* Channels Selection */}
            <div>
              <label className="text-xs font-bold text-text-secondary uppercase block mb-1">
                Notification Channels
              </label>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <label className="flex items-center space-x-2 p-2 bg-bg-main border border-border-color rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels.inApp}
                    onChange={(e) => setChannels({ ...channels, inApp: e.target.checked })}
                    className="accent-accent-primary"
                  />
                  <Bell className="w-3.5 h-3.5 text-cyan-400" />
                  <span className="text-text-primary font-medium">In-App Banner</span>
                </label>
                <label className="flex items-center space-x-2 p-2 bg-bg-main border border-border-color rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels.audio}
                    onChange={(e) => setChannels({ ...channels, audio: e.target.checked })}
                    className="accent-accent-primary"
                  />
                  <Volume2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-text-primary font-medium">Audio Chime</span>
                </label>
                <label className="flex items-center space-x-2 p-2 bg-bg-main border border-border-color rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels.telegram}
                    onChange={(e) => setChannels({ ...channels, telegram: e.target.checked })}
                    className="accent-accent-primary"
                  />
                  <Send className="w-3.5 h-3.5 text-blue-400" />
                  <span className="text-text-primary font-medium">Telegram Bot</span>
                </label>
                <label className="flex items-center space-x-2 p-2 bg-bg-main border border-border-color rounded-xl cursor-pointer">
                  <input
                    type="checkbox"
                    checked={channels.email}
                    onChange={(e) => setChannels({ ...channels, email: e.target.checked })}
                    className="accent-accent-primary"
                  />
                  <Mail className="w-3.5 h-3.5 text-purple-400" />
                  <span className="text-text-primary font-medium">Email Alert</span>
                </label>
              </div>
            </div>

            {/* Custom Strategy Note */}
            <div>
              <label className="text-xs font-bold text-text-secondary uppercase block mb-1">
                Strategy Label / Note
              </label>
              <input
                type="text"
                placeholder="e.g., Key Resistance Breakout Entry"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className="w-full bg-bg-main border border-border-color rounded-xl px-3 py-2 text-xs text-text-primary focus:border-accent-primary focus:outline-none"
              />
            </div>

            <button
              type="submit"
              className="w-full py-2.5 bg-accent-primary text-text-primary font-bold rounded-xl text-xs hover:bg-accent-hover transition-colors flex items-center justify-center space-x-2 cursor-pointer shadow-md"
            >
              <Plus className="w-4 h-4" />
              <span>Set Price Trigger Alert</span>
            </button>
          </form>

          {/* Active Alerts List */}
          <div className="pt-2 border-t border-border-color space-y-2">
            <h4 className="text-xs font-bold text-text-secondary uppercase">
              Active Configured Alerts ({alerts.filter((a) => a.status === 'ACTIVE').length})
            </h4>

            {alerts.length === 0 ? (
              <p className="text-xs text-text-secondary italic text-center py-2">
                No active price alerts set.
              </p>
            ) : (
              <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
                {alerts.map((alert) => (
                  <div
                    key={alert.id}
                    className="p-2 bg-bg-main border border-border-color rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center space-x-2">
                        <span className="font-bold text-text-primary font-mono">{alert.symbol}</span>
                        <span className={`text-[10px] font-mono px-1.5 py-0.5 rounded ${
                          alert.condition === 'ABOVE' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                        }`}>
                          {alert.condition} {alert.targetPrice}
                        </span>
                        {alert.status === 'TRIGGERED' && (
                          <span className="bg-amber-500/20 text-amber-400 text-[10px] px-1 rounded font-bold">
                            TRIGGERED
                          </span>
                        )}
                      </div>
                      <p className="text-[10px] text-text-secondary mt-0.5">{alert.note}</p>
                    </div>

                    <button
                      onClick={() => handleDeleteAlert(alert.id)}
                      className="p-1 text-text-secondary hover:text-rose-400 transition-colors cursor-pointer"
                      title="Delete Alert"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </AnimatePresence>
  );
};
