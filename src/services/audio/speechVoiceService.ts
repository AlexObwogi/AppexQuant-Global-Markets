/**
 * AppexQuant Markets Global - Trade Execution Voice Audio Engine
 * Utilizes the browser's native SpeechSynthesis API and Web Audio API synthesis
 * to deliver clear, professional voice cues for order execution and position closures.
 */

export interface SpeechSettings {
  enabled: boolean;
  volume: number; // 0.0 to 1.0
  rate: number;   // 0.8 to 1.5
  pitch: number;  // 0.8 to 1.2
  voiceURI?: string;
  announceOrders: boolean;
  announcePositions: boolean;
  announceCancellations: boolean;
  playAudioChime: boolean;
}

const STORAGE_KEY = 'appexquant_voice_status_settings_v1';

const DEFAULT_SETTINGS: SpeechSettings = {
  enabled: true,
  volume: 0.9,
  rate: 1.05,
  pitch: 1.0,
  announceOrders: true,
  announcePositions: true,
  announceCancellations: true,
  playAudioChime: true,
};

class TradeSpeechVoiceService {
  private settings: SpeechSettings = { ...DEFAULT_SETTINGS };
  private audioCtx: AudioContext | null = null;
  private isSpeaking = false;
  private queue: string[] = [];

  constructor() {
    this.loadSettings();
  }

  public loadSettings(): SpeechSettings {
    if (typeof window === 'undefined') return this.settings;
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      if (saved) {
        this.settings = { ...DEFAULT_SETTINGS, ...JSON.parse(saved) };
      }
    } catch (e) {
      console.warn('[SpeechVoiceService] Failed to parse voice settings from localStorage:', e);
    }
    return this.settings;
  }

  public saveSettings(newSettings: Partial<SpeechSettings>): SpeechSettings {
    this.settings = { ...this.settings, ...newSettings };
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(this.settings));
      } catch (e) {
        console.warn('[SpeechVoiceService] Failed to save voice settings:', e);
      }
    }
    return this.settings;
  }

  public getSettings(): SpeechSettings {
    return { ...this.settings };
  }

  public isSupported(): boolean {
    return typeof window !== 'undefined' && 'speechSynthesis' in window && 'SpeechSynthesisUtterance' in window;
  }

  public getAvailableVoices(): SpeechSynthesisVoice[] {
    if (!this.isSupported()) return [];
    try {
      const voices = window.speechSynthesis.getVoices();
      return voices.filter(v => v.lang.startsWith('en') || v.default);
    } catch {
      return [];
    }
  }

  /**
   * Generates a sleek, high-tech auditory chime using Web Audio API before voice delivery
   */
  private playChime(type: 'success' | 'close' | 'alert' = 'success'): void {
    if (!this.settings.playAudioChime || typeof window === 'undefined') return;
    try {
      const AudioContextClass = window.AudioContext || (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioContextClass) return;

      if (!this.audioCtx || this.audioCtx.state === 'closed') {
        this.audioCtx = new AudioContextClass();
      }
      if (this.audioCtx.state === 'suspended') {
        this.audioCtx.resume();
      }

      const now = this.audioCtx.currentTime;
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();

      osc.connect(gain);
      gain.connect(this.audioCtx.destination);

      if (type === 'success') {
        // High crisp double-tone for order execution (e.g. 880Hz -> 1320Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, now);
        osc.frequency.exponentialRampToValueAtTime(1320, now + 0.12);
        gain.gain.setValueAtTime(0.08 * this.settings.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      } else if (type === 'close') {
        // Soft resolved harmonic tone for position close (e.g. 660Hz -> 880Hz)
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(660, now);
        osc.frequency.exponentialRampToValueAtTime(880, now + 0.15);
        gain.gain.setValueAtTime(0.07 * this.settings.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
        osc.start(now);
        osc.stop(now + 0.3);
      } else {
        // Alert tone for cancellation / warning (440Hz -> 330Hz)
        osc.type = 'sine';
        osc.frequency.setValueAtTime(550, now);
        osc.frequency.exponentialRampToValueAtTime(440, now + 0.15);
        gain.gain.setValueAtTime(0.08 * this.settings.volume, now);
        gain.gain.exponentialRampToValueAtTime(0.001, now + 0.25);
        osc.start(now);
        osc.stop(now + 0.25);
      }
    } catch {
      // Audio context might be restricted before user gesture
    }
  }

  /**
   * Speak arbitrary text via SpeechSynthesis API with queue management
   */
  public speak(text: string, chimeType: 'success' | 'close' | 'alert' = 'success', force = false): void {
    if (!this.isSupported()) return;
    if (!this.settings.enabled && !force) return;

    // Trigger chime sound first
    this.playChime(chimeType);

    try {
      // If busy, cancel current or queue
      if (window.speechSynthesis.paused) {
        window.speechSynthesis.resume();
      }

      window.speechSynthesis.cancel();

      const utterance = new SpeechSynthesisUtterance(text);
      utterance.volume = Math.max(0.1, Math.min(1.0, this.settings.volume));
      utterance.rate = Math.max(0.8, Math.min(1.5, this.settings.rate));
      utterance.pitch = Math.max(0.8, Math.min(1.2, this.settings.pitch));

      // Attempt to pick optimal voice
      const voices = window.speechSynthesis.getVoices();
      if (voices.length > 0) {
        if (this.settings.voiceURI) {
          const matched = voices.find(v => v.voiceURI === this.settings.voiceURI);
          if (matched) utterance.voice = matched;
        }
        if (!utterance.voice) {
          // Select preferred natural English voice
          const naturalVoice = voices.find(v => 
            v.lang.startsWith('en') && 
            (v.name.includes('Natural') || v.name.includes('Google') || v.name.includes('Samantha') || v.name.includes('Daniel') || v.name.includes('Premium'))
          ) || voices.find(v => v.lang.startsWith('en-US') || v.lang.startsWith('en-GB')) || voices[0];
          
          if (naturalVoice) utterance.voice = naturalVoice;
        }
      }

      this.isSpeaking = true;
      utterance.onend = () => {
        this.isSpeaking = false;
      };
      utterance.onerror = () => {
        this.isSpeaking = false;
      };

      window.speechSynthesis.speak(utterance);
    } catch (err) {
      console.warn('[SpeechVoiceService] Speech synthesis error:', err);
    }
  }

  /**
   * Natural phonetic formatting for financial symbols
   */
  private formatSymbolForVoice(symbol: string): string {
    const s = symbol.toUpperCase();
    if (s === 'EURUSD') return 'Euro U S Dollar';
    if (s === 'GBPUSD') return 'British Pound U S Dollar';
    if (s === 'USDJPY') return 'U S Dollar Yen';
    if (s === 'XAUUSD') return 'Gold';
    if (s === 'BTCUSD' || s === 'BTCUSDT') return 'Bitcoin';
    if (s === 'ETHUSD' || s === 'ETHUSDT') return 'Ethereum';
    if (s === 'XRPUSD' || s === 'XRPUSDT') return 'X R P';
    if (s === 'MEMEUSDT') return 'Meme token';
    if (s.startsWith('R_') || s.startsWith('1HZ')) return `Volatility index ${s.replace(/[^0-9]/g, '')}`;
    return s.split('').join(' ');
  }

  /**
   * Format prices nicely for human speech
   */
  private formatPriceForVoice(price?: number): string {
    if (typeof price !== 'number' || isNaN(price)) return '';
    if (price >= 1000) return price.toFixed(2);
    if (price >= 1) return price.toFixed(4);
    return price.toFixed(5);
  }

  /**
   * Announce Trade Order Executed / Filled
   */
  public announceOrderExecuted(order: {
    symbol: string;
    side: string;
    quantity: number;
    fillPrice?: number;
    price?: number;
  }): void {
    if (!this.settings.enabled || !this.settings.announceOrders) return;
    const side = order.side.toUpperCase() === 'SHORT' || order.side.toUpperCase() === 'SELL' ? 'Sell' : 'Buy';
    const symbolStr = this.formatSymbolForVoice(order.symbol);
    const price = order.fillPrice || order.price;
    const priceStr = price ? ` at ${this.formatPriceForVoice(price)}` : '';
    const qtyStr = order.quantity ? `${order.quantity} lot${order.quantity > 1 ? 's' : ''} of ` : '';

    const phrase = `Order executed. ${side} ${qtyStr}${symbolStr}${priceStr}.`;
    this.speak(phrase, 'success');
  }

  /**
   * Announce Trade Order Submitted / Routed
   */
  public announceOrderSubmitted(order: {
    symbol: string;
    side: string;
    quantity: number;
  }): void {
    if (!this.settings.enabled || !this.settings.announceOrders) return;
    const side = order.side.toUpperCase() === 'SHORT' || order.side.toUpperCase() === 'SELL' ? 'Sell' : 'Buy';
    const symbolStr = this.formatSymbolForVoice(order.symbol);
    const phrase = `Order submitted. ${side} ${order.quantity} lots ${symbolStr}.`;
    this.speak(phrase, 'success');
  }

  /**
   * Announce Order Cancelled
   */
  public announceOrderCancelled(symbol: string): void {
    if (!this.settings.enabled || !this.settings.announceCancellations) return;
    const symbolStr = this.formatSymbolForVoice(symbol);
    const phrase = `Order cancelled for ${symbolStr}.`;
    this.speak(phrase, 'alert');
  }

  /**
   * Announce Position Closed with Realized P/L
   */
  public announcePositionClosed(position: {
    symbol: string;
    realizedPl?: number;
    unrealizedPl?: number;
    reason?: string;
  }): void {
    if (!this.settings.enabled || !this.settings.announcePositions) return;
    const symbolStr = this.formatSymbolForVoice(position.symbol);
    const pnl = position.realizedPl ?? position.unrealizedPl ?? 0;
    
    let pnlPhrase = '';
    if (pnl > 0) {
      pnlPhrase = ` Realized profit, ${Math.abs(pnl).toFixed(2)} dollars.`;
    } else if (pnl < 0) {
      pnlPhrase = ` Realized loss, ${Math.abs(pnl).toFixed(2)} dollars.`;
    } else {
      pnlPhrase = ' Break even.';
    }

    const phrase = `Position closed. ${symbolStr}.${pnlPhrase}`;
    this.speak(phrase, 'close');
  }

  /**
   * Test audio cue and voice readout
   */
  public testVoiceCue(): void {
    this.speak('Voice status enabled. AppexQuant trade audio alerts are active.', 'success', true);
  }
}

export const tradeSpeechVoice = new TradeSpeechVoiceService();
