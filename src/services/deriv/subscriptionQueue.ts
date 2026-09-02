/**
 * AppexQuant Markets Global - Deriv Subscription Queue Manager
 * Manages public market tick subscriptions, queues requests while socket is connecting or offline,
 * validates symbols against available active symbols, eliminates duplicate retries,
 * and flushes/restores streams upon WebSocket connection establishment.
 */

import { NormalizedTick } from './derivTypes.ts';
import { BLACKLISTED_SYMBOLS, isSymbolBlacklisted } from './marketNormalization.ts';

export type TickCallback = (tick: NormalizedTick) => void;

interface SubscriptionEntry {
  subId?: string;
  callbacks: Set<TickCallback>;
}

export class SubscriptionQueue {
  private activeSubscriptions = new Map<string, SubscriptionEntry>();
  private availableSymbols = new Set<string>();
  private subscribingSymbols = new Set<string>();
  private rejectedSymbols = new Set<string>();

  /**
   * Updates the authoritative set of symbols returned by Deriv active_symbols.
   */
  public setAvailableSymbols(symbols: Set<string> | string[]): void {
    this.availableSymbols.clear();
    if (symbols instanceof Set) {
      symbols.forEach((s) => {
        if (s && !BLACKLISTED_SYMBOLS.has(s.trim())) {
          this.availableSymbols.add(s.trim());
        }
      });
    } else if (Array.isArray(symbols)) {
      symbols.forEach((s) => {
        if (s && !BLACKLISTED_SYMBOLS.has(s.trim())) {
          this.availableSymbols.add(s.trim());
        }
      });
    }

    // Prune any queued subscriptions that are invalid or rejected
    for (const symbol of Array.from(this.activeSubscriptions.keys())) {
      if (this.availableSymbols.size > 0 && !this.availableSymbols.has(symbol)) {
        console.warn(`[SubscriptionQueue] Pruning unlisted symbol from subscription queue: ${symbol}`);
        this.activeSubscriptions.delete(symbol);
      }
    }
  }

  /**
   * Returns the set of currently validated available symbols.
   */
  public getAvailableSymbols(): Set<string> {
    return new Set(this.availableSymbols);
  }

  /**
   * Checks whether a symbol is available in Deriv's active symbol list.
   */
  public isSymbolAvailable(symbol: string): boolean {
    if (!symbol || isSymbolBlacklisted(symbol)) return false;
    if (this.rejectedSymbols.has(symbol)) return false;
    if (this.availableSymbols.size === 0) {
      // Symbols not yet loaded from Deriv; validate not blacklisted
      return !isSymbolBlacklisted(symbol);
    }
    return this.availableSymbols.has(symbol);
  }

  /**
   * Enqueue or register a callback for a market symbol tick stream.
   * Validates availableSymbols.has(symbol) and excludes blacklisted/rejected symbols.
   * Returns true if this is the first subscriber for the symbol.
   */
  public enqueue(symbol: string, callback?: TickCallback): boolean {
    if (!symbol) return false;
    const cleanSymbol = symbol.trim();

    // 1. Never subscribe using hardcoded fallback or blacklisted symbols
    if (isSymbolBlacklisted(cleanSymbol)) {
      console.warn(`[SubscriptionQueue] Rejected blacklisted symbol subscription: ${cleanSymbol}`);
      return false;
    }

    // 2. Reject previously failed / rejected symbols
    if (this.rejectedSymbols.has(cleanSymbol)) {
      console.warn(`[SubscriptionQueue] Rejected subscription for previously failed symbol: ${cleanSymbol}`);
      return false;
    }

    // 3. Strict validation against availableSymbols returned by Deriv
    if (this.availableSymbols.size > 0 && !this.availableSymbols.has(cleanSymbol)) {
      console.warn(`[SubscriptionQueue] Subscription rejected: Symbol '${cleanSymbol}' is not present in Deriv active_symbols list.`);
      return false;
    }

    let entry = this.activeSubscriptions.get(cleanSymbol);
    const isFirstSubscriber = !entry;

    if (!entry) {
      entry = { callbacks: new Set() };
      this.activeSubscriptions.set(cleanSymbol, entry);
    }

    if (callback) {
      entry.callbacks.add(callback);
    }

    return isFirstSubscriber;
  }

  /**
   * Dequeue or unregister a callback for a market symbol tick stream.
   * Returns true if no subscribers remain for the symbol (symbol should be unsubscribed from Deriv).
   */
  public dequeue(symbol: string, callback?: TickCallback): boolean {
    if (!symbol) return false;
    const cleanSymbol = symbol.trim();
    const entry = this.activeSubscriptions.get(cleanSymbol);
    if (!entry) return false;

    if (callback) {
      entry.callbacks.delete(callback);
    }

    if (entry.callbacks.size === 0) {
      this.activeSubscriptions.delete(cleanSymbol);
      this.subscribingSymbols.delete(cleanSymbol);
      return true;
    }

    return false;
  }

  /**
   * Store the Deriv subscription ID for an active symbol stream.
   */
  public setSubId(symbol: string, subId: string): void {
    const cleanSymbol = symbol ? symbol.trim() : '';
    const entry = this.activeSubscriptions.get(cleanSymbol);
    if (entry) {
      entry.subId = subId;
    }
    this.subscribingSymbols.delete(cleanSymbol);
  }

  /**
   * Get the Deriv subscription ID for an active symbol stream.
   */
  public getSubId(symbol: string): string | undefined {
    return this.activeSubscriptions.get(symbol ? symbol.trim() : '')?.subId;
  }

  /**
   * Get all callbacks registered for a given symbol.
   */
  public getCallbacks(symbol: string): Set<TickCallback> | undefined {
    return this.activeSubscriptions.get(symbol ? symbol.trim() : '')?.callbacks;
  }

  /**
   * Returns a list of all distinct market symbols currently queued/subscribed.
   */
  public getQueuedSymbols(): string[] {
    return Array.from(this.activeSubscriptions.keys());
  }

  /**
   * Returns true if the symbol has at least one active subscriber callback.
   */
  public hasSubscribers(symbol: string): boolean {
    const entry = this.activeSubscriptions.get(symbol ? symbol.trim() : '');
    return Boolean(entry && entry.callbacks.size > 0);
  }

  /**
   * Returns whether a subscription for the symbol is currently in-flight.
   */
  public isSubscribing(symbol: string): boolean {
    return this.subscribingSymbols.has(symbol ? symbol.trim() : '');
  }

  /**
   * Flush all active queued subscriptions over the open WebSocket connection.
   * Validates availableSymbols.has(symbol) before every request and eliminates duplicate retries.
   */
  public flush(sendRequestFn: (request: any) => Promise<any>): void {
    const symbols = this.getQueuedSymbols();
    if (symbols.length === 0) return;

    // Filter candidate symbols through availability checks and deduplicate
    const symbolsToSubscribe = symbols.filter((symbol) => {
      if (isSymbolBlacklisted(symbol)) return false;
      if (this.rejectedSymbols.has(symbol)) return false;
      if (this.availableSymbols.size > 0 && !this.availableSymbols.has(symbol)) {
        console.warn(`[SubscriptionQueue] Skipping flush for unlisted symbol: ${symbol}`);
        return false;
      }
      if (this.subscribingSymbols.has(symbol)) {
        return false; // Already in-flight
      }
      if (this.getSubId(symbol)) {
        return false; // Already actively subscribed
      }
      return true;
    });

    if (symbolsToSubscribe.length === 0) return;

    console.log(`[SubscriptionQueue] Flushing ${symbolsToSubscribe.length} validated market subscriptions...`);

    symbolsToSubscribe.forEach((symbol) => {
      this.subscribingSymbols.add(symbol);

      sendRequestFn({ ticks: symbol })
        .then((res: any) => {
          this.subscribingSymbols.delete(symbol);
          if (res?.subscription?.id) {
            this.setSubId(symbol, res.subscription.id);
          } else if (res?.error) {
            console.warn(`[SubscriptionQueue] Deriv rejected tick subscription for ${symbol}:`, res.error.message || res.error);
            this.rejectedSymbols.add(symbol);
            this.activeSubscriptions.delete(symbol);
          }
        })
        .catch((err: any) => {
          this.subscribingSymbols.delete(symbol);
          const errMsg = err?.message || String(err);
          console.warn(`[SubscriptionQueue] Failed to subscribe to tick stream for ${symbol}:`, errMsg);
          
          // If error indicates symbol rejection (e.g. Unrecognised symbol / MarketIsClosed / InputValidationFailed),
          // reject symbol to prevent duplicate retry loops
          if (errMsg.toLowerCase().includes('unrecognised') || errMsg.toLowerCase().includes('invalid') || errMsg.toLowerCase().includes('not found')) {
            this.rejectedSymbols.add(symbol);
            this.activeSubscriptions.delete(symbol);
          }
        });
    });
  }

  /**
   * Mark a symbol as explicitly rejected to prevent further retry loops.
   */
  public markRejected(symbol: string): void {
    if (!symbol) return;
    const clean = symbol.trim();
    this.rejectedSymbols.add(clean);
    this.subscribingSymbols.delete(clean);
    this.activeSubscriptions.delete(clean);
  }

  /**
   * Clear all queued subscriptions and reset state.
   */
  public clear(): void {
    this.activeSubscriptions.clear();
    this.subscribingSymbols.clear();
  }
}

export const subscriptionQueue = new SubscriptionQueue();
