/**
 * AppexQuant Markets Global - Deriv Subscription Queue Manager
 * Manages public market tick subscriptions, queues requests while socket is connecting or offline,
 * deduplicates subscriptions, and flushes/restores streams upon WebSocket connection establishment.
 */

import { NormalizedTick } from './derivTypes.ts';

export type TickCallback = (tick: NormalizedTick) => void;

interface SubscriptionEntry {
  subId?: string;
  callbacks: Set<TickCallback>;
}

export class SubscriptionQueue {
  private activeSubscriptions = new Map<string, SubscriptionEntry>();

  /**
   * Enqueue or register a callback for a market symbol tick stream.
   * Returns true if this is the first subscriber for the symbol.
   */
  public enqueue(symbol: string, callback?: TickCallback): boolean {
    if (!symbol) return false;
    let entry = this.activeSubscriptions.get(symbol);
    const isFirstSubscriber = !entry;

    if (!entry) {
      entry = { callbacks: new Set() };
      this.activeSubscriptions.set(symbol, entry);
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
    const entry = this.activeSubscriptions.get(symbol);
    if (!entry) return false;

    if (callback) {
      entry.callbacks.delete(callback);
    }

    if (entry.callbacks.size === 0) {
      this.activeSubscriptions.delete(symbol);
      return true;
    }

    return false;
  }

  /**
   * Store the Deriv subscription ID for an active symbol stream.
   */
  public setSubId(symbol: string, subId: string): void {
    const entry = this.activeSubscriptions.get(symbol);
    if (entry) {
      entry.subId = subId;
    }
  }

  /**
   * Get the Deriv subscription ID for an active symbol stream.
   */
  public getSubId(symbol: string): string | undefined {
    return this.activeSubscriptions.get(symbol)?.subId;
  }

  /**
   * Get all callbacks registered for a given symbol.
   */
  public getCallbacks(symbol: string): Set<TickCallback> | undefined {
    return this.activeSubscriptions.get(symbol)?.callbacks;
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
    const entry = this.activeSubscriptions.get(symbol);
    return Boolean(entry && entry.callbacks.size > 0);
  }

  /**
   * Flush all active queued subscriptions over the open WebSocket connection.
   */
  public flush(sendRequestFn: (request: any) => Promise<any>): void {
    const symbols = this.getQueuedSymbols();
    if (symbols.length === 0) return;

    console.log(`[SubscriptionQueue] Flushing ${symbols.length} queued market symbol subscriptions...`);
    symbols.forEach((symbol) => {
      sendRequestFn({ ticks: symbol })
        .then((res: any) => {
          if (res.subscription?.id) {
            this.setSubId(symbol, res.subscription.id);
          }
        })
        .catch((err: any) => {
          console.warn(`[SubscriptionQueue] Failed to subscribe to tick stream for ${symbol}:`, err?.message || err);
        });
    });
  }

  /**
   * Clear all queued subscriptions and reset state.
   */
  public clear(): void {
    this.activeSubscriptions.clear();
  }
}

export const subscriptionQueue = new SubscriptionQueue();
