/**
 * AppexQuant Markets Global - Economic Calendar & Event Impact Engine
 * Real-time macro economic calendar with impact indicators and automated pre-news risk controls.
 */

import React, { useState, useEffect } from 'react';
import { EconomicEvent } from '../types/ai';
import { fetchLiveNewsSentinel } from '../services/ai/newsSentinelEngine';
import { useGlobalState } from '../state/GlobalStateContext';
import { CollapsibleText } from '../components/common/CollapsibleText';
import {
  Calendar as CalendarIcon,
  Filter,
  Search,
  ShieldAlert,
  Clock,
  Globe,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Lock,
  Plus,
  BookOpen,
} from 'lucide-react';

export const CalendarView: React.FC = () => {
  const { dispatch } = useGlobalState();
  const [events, setEvents] = useState<EconomicEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedCurrency, setSelectedCurrency] = useState<string>('ALL');
  const [selectedImpact, setSelectedImpact] = useState<string>('ALL');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Pre-News Guardrail state
  const [isPreNewsGuardrailActive, setIsPreNewsGuardrailActive] = useState<boolean>(true);
  const [preNewsMinutesBuffer, setPreNewsMinutesBuffer] = useState<number>(15);

  // Journal notes state
  const [journalNotes, setJournalNotes] = useState<{ id: string; eventId: string; note: string; timestamp: string }[]>([]);
  const [activeNoteInput, setActiveNoteInput] = useState<{ eventId: string; text: string } | null>(null);

  useEffect(() => {
    loadCalendarData();
  }, []);

  const loadCalendarData = async () => {
    setIsLoading(true);
    const data = await fetchLiveNewsSentinel();
    setEvents(data.calendar || []);
    setIsLoading(false);
  };

  const handleToggleGuardrail = () => {
    const nextState = !isPreNewsGuardrailActive;
    setIsPreNewsGuardrailActive(nextState);
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        title: 'Pre-News Safety Guardrail',
        message: nextState
          ? `Auto-halt execution enabled ${preNewsMinutesBuffer}m before HIGH impact events.`
          : 'Pre-news safety halt disabled.',
        type: nextState ? 'success' : 'warning',
      },
    });
  };

  const handleAddJournalNote = (eventId: string) => {
    if (!activeNoteInput || !activeNoteInput.text.trim()) return;
    const newNote = {
      id: `note-${Date.now()}`,
      eventId,
      note: activeNoteInput.text.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };
    setJournalNotes((prev) => [newNote, ...prev]);
    setActiveNoteInput(null);
    dispatch({
      type: 'ADD_NOTIFICATION',
      payload: {
        title: 'Macro Journal Saved',
        message: 'Event note saved to local journal.',
        type: 'info',
      },
    });
  };

  // Filtering
  const filteredEvents = events.filter((evt) => {
    const matchesCurr = selectedCurrency === 'ALL' || evt.currency === selectedCurrency;
    const matchesImpact = selectedImpact === 'ALL' || evt.impact === selectedImpact;
    const matchesSearch =
      evt.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.country.toLowerCase().includes(searchQuery.toLowerCase()) ||
      evt.currency.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCurr && matchesImpact && matchesSearch;
  });

  const getImpactBadge = (impact: string) => {
    switch (impact) {
      case 'HIGH':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-500/15 text-rose-400 border border-rose-500/30 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" />
            HIGH
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            MED
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-bg-hover text-text-secondary border border-border-color">
            LOW
          </span>
        );
    }
  };

  return (
    <div className="space-y-6 pb-12 font-mono">
      {/* HEADER BAR */}
      <div className="p-4 sm:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-[#131822] to-slate-900 border border-border-color shadow-xl flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl sm:text-2xl font-extrabold text-text-primary tracking-tight flex items-center gap-2">
              <CalendarIcon className="w-6 h-6 text-cyan-400" />
              Macro Economic Calendar
            </h1>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 font-bold uppercase">
              LIVE DATA
            </span>
          </div>
          <CollapsibleText
            text="Central bank decisions, CPI releases, payrolls, and automated pre-news risk controls to prevent slippage during rate shocks."
            maxChars={90}
            className="text-xs text-text-secondary font-sans mt-1"
          />
        </div>

        {/* Quick Stats */}
        <div className="flex items-center gap-3 bg-[#080B10] p-2.5 rounded-xl border border-border-color text-xs w-full md:w-auto justify-around">
          <div className="text-center px-2">
            <span className="text-text-secondary text-[9px] uppercase block">High Impact</span>
            <span className="text-rose-400 font-bold">
              {events.filter((e) => e.impact === 'HIGH').length} Events
            </span>
          </div>
          <div className="w-px h-6 bg-bg-hover" />
          <div className="text-center px-2">
            <span className="text-text-secondary text-[9px] uppercase block">Risk Buffer</span>
            <span className="text-cyan-400 font-bold">{preNewsMinutesBuffer}m Active</span>
          </div>
        </div>
      </div>

      {/* AUTOMATED PRE-NEWS RISK CONTROL GUARDRAIL BOX */}
      <div className="p-4 rounded-xl bg-[#111622] border border-border-color space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0" />
            <div>
              <h3 className="text-xs font-bold text-text-secondary uppercase">Pre-News Execution Guardrail</h3>
              <p className="text-[11px] text-text-secondary font-sans">
                Automatically halt automated signal processing before high-tier news events.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <select
              value={preNewsMinutesBuffer}
              onChange={(e) => setPreNewsMinutesBuffer(Number(e.target.value))}
              className="bg-[#080B10] border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-text-secondary focus:outline-none focus:border-cyan-500"
            >
              <option value={5}>5m Buffer</option>
              <option value={15}>15m Buffer</option>
              <option value={30}>30m Buffer</option>
              <option value={60}>60m Buffer</option>
            </select>

            <button
              onClick={handleToggleGuardrail}
              className={`px-3 py-2 min-h-[44px] sm:min-h-[36px] rounded-lg font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border ${
                isPreNewsGuardrailActive
                  ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/20'
                  : 'bg-bg-hover border-border-color text-text-secondary hover:text-text-secondary'
              }`}
            >
              {isPreNewsGuardrailActive ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : <Lock className="w-4 h-4" />}
              <span>{isPreNewsGuardrailActive ? 'Guardrail ACTIVE' : 'Guardrail OFF'}</span>
            </button>
          </div>
        </div>
      </div>

      {/* FILTER CONTROLS */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 border-b border-border-color pb-3">
        <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto no-scrollbar pb-1">
          <span className="text-text-secondary text-xs font-semibold mr-1 flex items-center gap-1 shrink-0">
            <Filter className="w-3.5 h-3.5" /> Filter:
          </span>

          {['ALL', 'USD', 'EUR', 'GBP'].map((curr) => (
            <button
              key={curr}
              onClick={() => setSelectedCurrency(curr)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                selectedCurrency === curr
                  ? 'bg-cyan-500/20 text-cyan-600 dark:text-cyan-300 border-cyan-500/40 font-bold'
                  : 'bg-bg-surface text-text-secondary border-border-color hover:text-text-primary'
              }`}
            >
              {curr}
            </button>
          ))}

          <div className="w-px h-4 bg-border-color mx-1 shrink-0" />

          {['ALL', 'HIGH', 'MEDIUM', 'LOW'].map((imp) => (
            <button
              key={imp}
              onClick={() => setSelectedImpact(imp)}
              className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                selectedImpact === imp
                  ? 'bg-bg-hover text-cyan-600 dark:text-cyan-300 border-cyan-500/40 font-bold'
                  : 'bg-bg-surface text-text-secondary border-border-color hover:text-text-primary'
              }`}
            >
              {imp}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-text-secondary absolute left-3 top-2.5" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search economic events..."
            className="w-full bg-bg-surface border border-border-color rounded-xl pl-8 pr-3 py-1.5 text-xs text-text-primary focus:outline-none focus:border-cyan-500"
          />
        </div>
      </div>

      {/* EVENT LISTING */}
      {isLoading ? (
        <div className="p-8 text-center text-xs text-text-secondary">Loading economic calendar feed...</div>
      ) : filteredEvents.length === 0 ? (
        <div className="p-8 text-center bg-bg-surface border border-border-color rounded-xl text-xs text-text-secondary">
          No economic events match the current filter selection.
        </div>
      ) : (
        <div className="space-y-3">
          {filteredEvents.map((evt) => {
            const eventNotes = journalNotes.filter((n) => n.eventId === evt.id);
            return (
              <div
                key={evt.id}
                className="p-4 rounded-xl bg-bg-surface border border-border-color hover:border-border-color/80 shadow-sm transition-all space-y-3"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                  <div className="flex items-center gap-2.5">
                    <span className="px-2.5 py-1 rounded-full bg-bg-hover border border-border-color text-cyan-600 dark:text-cyan-400 font-bold text-xs">
                      {evt.currency}
                    </span>
                    <div>
                      <h4 className="font-bold text-text-primary text-sm">{evt.title}</h4>
                      <span className="text-xs text-text-secondary font-sans">
                        {evt.country} • {evt.time}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {getImpactBadge(evt.impact)}
                    <span className="text-[10px] text-text-secondary font-mono">{evt.date}</span>
                  </div>
                </div>

                {/* Metrics Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 py-2 px-3 rounded-lg bg-[#111622] border border-border-color/80 text-xs">
                  <div>
                    <span className="text-text-secondary text-[9px] uppercase block">Forecast</span>
                    <span className="font-bold text-text-secondary">{evt.forecast}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary text-[9px] uppercase block">Previous</span>
                    <span className="font-bold text-text-secondary">{evt.previous}</span>
                  </div>
                  <div>
                    <span className="text-text-secondary text-[9px] uppercase block">Currency Pair</span>
                    <span className="font-bold text-cyan-400">{evt.currency}USD</span>
                  </div>
                  <div>
                    <span className="text-text-secondary text-[9px] uppercase block">Volatility Impact</span>
                    <span className="font-bold text-amber-400">
                      {evt.impact === 'HIGH' ? 'High Tier' : 'Moderate'}
                    </span>
                  </div>
                </div>

                {/* Event Notes & Journaling */}
                <div className="space-y-2 pt-1 border-t border-border-color/60">
                  {eventNotes.map((n) => (
                    <div key={n.id} className="p-2 rounded bg-bg-hover/80 text-[11px] text-text-secondary font-sans flex justify-between items-start">
                      <div className="flex items-center gap-1.5">
                        <BookOpen className="w-3 h-3 text-cyan-400 shrink-0" />
                        <span>{n.note}</span>
                      </div>
                      <span className="text-[9px] text-text-secondary font-mono">{n.timestamp}</span>
                    </div>
                  ))}

                  {activeNoteInput?.eventId === evt.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={activeNoteInput.text}
                        onChange={(e) => setActiveNoteInput({ eventId: evt.id, text: e.target.value })}
                        placeholder="Add trader analysis or reaction note..."
                        className="flex-1 bg-bg-hover border border-border-color rounded-lg px-2.5 py-1.5 text-xs text-text-primary focus:outline-none focus:border-cyan-500 font-sans"
                        autoFocus
                      />
                      <button
                        onClick={() => handleAddJournalNote(evt.id)}
                        className="px-3 py-1.5 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-text-secondary font-bold text-xs min-h-[36px]"
                      >
                        Save
                      </button>
                      <button
                        onClick={() => setActiveNoteInput(null)}
                        className="px-2.5 py-1.5 rounded-lg bg-bg-hover text-text-secondary text-xs min-h-[36px]"
                      >
                        Cancel
                      </button>
                    </div>
                  ) : (
                    <button
                      onClick={() => setActiveNoteInput({ eventId: evt.id, text: '' })}
                      className="text-[11px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 cursor-pointer font-bold pt-1"
                    >
                      <Plus className="w-3 h-3" />
                      <span>Attach Journal Note</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

