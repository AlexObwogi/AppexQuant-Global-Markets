import React, { useState, useRef, useEffect } from 'react';
import { Volume2, VolumeX, Sliders, Play, Check, Sparkles } from 'lucide-react';
import { useTradeVoiceStatus } from '../../hooks/useTradeVoiceStatus.ts';

interface VoiceStatusToggleProps {
  compact?: boolean;
}

export const VoiceStatusToggle: React.FC<VoiceStatusToggleProps> = ({ compact = false }) => {
  const {
    settings,
    isVoiceEnabled,
    isSupported,
    updateSettings,
    toggleVoice,
    testVoice
  } = useTradeVoiceStatus();

  const [showSettings, setShowSettings] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close popup when clicking outside
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowSettings(false);
      }
    };
    if (showSettings) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showSettings]);

  if (!isSupported) {
    return (
      <div 
        className="flex items-center space-x-1.5 px-2.5 py-1.5 rounded-xl bg-bg-main border border-border-color text-text-muted text-[11px]"
        title="SpeechSynthesis is not supported in this browser"
      >
        <VolumeX className="w-3.5 h-3.5" />
        <span className="font-mono">Voice Unsupported</span>
      </div>
    );
  }

  return (
    <div className="relative inline-flex items-center" ref={dropdownRef}>
      <div className="flex items-center rounded-xl bg-bg-main border border-border-color p-0.5 shadow-sm transition-all hover:border-accent-primary/40">
        {/* Main Single Click Toggle Button */}
        <button
          id="voice-status-toggle-btn"
          onClick={toggleVoice}
          className={`flex items-center space-x-2 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer select-none ${
            isVoiceEnabled
              ? 'bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 shadow-[0_0_12px_rgba(16,185,129,0.15)]'
              : 'text-text-secondary hover:text-text-primary hover:bg-bg-hover'
          }`}
          title={isVoiceEnabled ? 'Voice Status Active (Click to mute)' : 'Voice Status Disabled (Click to enable audio cues)'}
        >
          {isVoiceEnabled ? (
            <>
              <div className="relative flex items-center justify-center">
                <Volume2 className="w-4 h-4 text-emerald-400 animate-pulse" />
                <span className="absolute -top-0.5 -right-0.5 w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
              </div>
              <span className="font-mono tracking-tight font-bold">Voice: ON</span>
            </>
          ) : (
            <>
              <VolumeX className="w-4 h-4 text-text-muted" />
              <span className="font-mono tracking-tight text-text-muted">Voice: OFF</span>
            </>
          )}
        </button>

        {/* Quick Settings & Audio Test Button */}
        <button
          id="voice-status-settings-btn"
          onClick={() => setShowSettings(!showSettings)}
          className={`p-1.5 rounded-lg text-text-muted hover:text-text-primary hover:bg-bg-hover transition-colors cursor-pointer ml-0.5 ${
            showSettings ? 'bg-bg-hover text-text-primary' : ''
          }`}
          title="Voice Status Configuration & Test"
          aria-label="Voice Status Settings"
        >
          <Sliders className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Dropdown Settings Popover */}
      {showSettings && (
        <div
          id="voice-status-popover"
          className="absolute right-0 top-full mt-2 w-72 p-4 bg-bg-surface border border-border-color rounded-2xl shadow-2xl z-50 space-y-3.5 animate-in fade-in zoom-in-95 duration-150"
        >
          <div className="flex items-center justify-between border-b border-border-color pb-2.5">
            <div className="flex items-center space-x-2">
              <Sparkles className="w-4 h-4 text-accent-primary" />
              <span className="text-xs font-bold text-text-primary uppercase tracking-wider">Voice Status Audio</span>
            </div>
            <span className={`text-[10px] font-mono px-2 py-0.5 rounded-full border ${
              isVoiceEnabled 
                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20'
                : 'bg-rose-500/10 text-rose-400 border-rose-500/20'
            }`}>
              {isVoiceEnabled ? 'LIVE ACTIVE' : 'MUTED'}
            </span>
          </div>

          <p className="text-[11px] text-text-secondary leading-relaxed">
            Announces instant vocal status updates when trade orders execute, fill, cancel, or when positions close.
          </p>

          {/* Test Voice Button */}
          <button
            onClick={testVoice}
            className="w-full flex items-center justify-center space-x-2 py-2 px-3 rounded-xl bg-accent-primary/10 hover:bg-accent-primary/20 text-accent-primary border border-accent-primary/30 text-xs font-bold transition-colors cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Test Voice Audio Cue</span>
          </button>

          {/* Volume Control */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-text-secondary">Speech Volume</span>
              <span className="text-text-primary font-bold">{Math.round(settings.volume * 100)}%</span>
            </div>
            <input
              type="range"
              min="0.1"
              max="1.0"
              step="0.05"
              value={settings.volume}
              onChange={(e) => updateSettings({ volume: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-bg-main rounded-lg appearance-none cursor-pointer accent-accent-primary"
            />
          </div>

          {/* Speech Rate Control */}
          <div className="space-y-1.5">
            <div className="flex justify-between text-[11px] font-mono">
              <span className="text-text-secondary">Speech Speed</span>
              <span className="text-text-primary font-bold">{settings.rate}x</span>
            </div>
            <input
              type="range"
              min="0.8"
              max="1.4"
              step="0.05"
              value={settings.rate}
              onChange={(e) => updateSettings({ rate: parseFloat(e.target.value) })}
              className="w-full h-1.5 bg-bg-main rounded-lg appearance-none cursor-pointer accent-accent-primary"
            />
          </div>

          {/* Granular Toggles */}
          <div className="space-y-2 pt-1 border-t border-border-color">
            <label className="flex items-center justify-between text-[11px] text-text-secondary hover:text-text-primary cursor-pointer select-none">
              <span>Order Executions</span>
              <input
                type="checkbox"
                checked={settings.announceOrders}
                onChange={(e) => updateSettings({ announceOrders: e.target.checked })}
                className="w-3.5 h-3.5 rounded border-border-color text-accent-primary focus:ring-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between text-[11px] text-text-secondary hover:text-text-primary cursor-pointer select-none">
              <span>Closed Positions & Realized P/L</span>
              <input
                type="checkbox"
                checked={settings.announcePositions}
                onChange={(e) => updateSettings({ announcePositions: e.target.checked })}
                className="w-3.5 h-3.5 rounded border-border-color text-accent-primary focus:ring-0 cursor-pointer"
              />
            </label>

            <label className="flex items-center justify-between text-[11px] text-text-secondary hover:text-text-primary cursor-pointer select-none">
              <span>Audio Chime Synthesizer</span>
              <input
                type="checkbox"
                checked={settings.playAudioChime}
                onChange={(e) => updateSettings({ playAudioChime: e.target.checked })}
                className="w-3.5 h-3.5 rounded border-border-color text-accent-primary focus:ring-0 cursor-pointer"
              />
            </label>
          </div>
        </div>
      )}
    </div>
  );
};
