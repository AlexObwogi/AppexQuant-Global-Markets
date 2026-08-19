/**
 * AppexQuant Markets Global - Smart SWR Query Hook
 * Replaces aggressive high-frequency polling with stale-while-revalidate caching.
 *
 * Directives:
 * - revalidateOnFocus: false (avoids window focus storm)
 * - revalidateOnReconnect: false (avoids reconnection thundering herd)
 * - deduplicationInterval: 30,000ms (30s) by default
 * - event-driven mutation & invalidation
 * - automatically pauses any optional background tick when tab is inactive
 */

import { useState, useEffect, useRef, useCallback } from 'react';

export interface SmartQueryOptions<T> {
  initialData?: T;
  dedupingInterval?: number; // default 30,000ms
  revalidateOnFocus?: boolean; // default false
  revalidateOnReconnect?: boolean; // default false
  refreshInterval?: number; // 0 = disabled (no interval polling)
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
}

export interface SmartQueryResult<T> {
  data: T | undefined;
  error: Error | null;
  isLoading: boolean;
  isValidating: boolean;
  mutate: (newData?: T | Promise<T> | ((current: T | undefined) => T), shouldRevalidate?: boolean) => Promise<T | undefined>;
  revalidate: () => Promise<T | undefined>;
}

// Global in-memory cache shared across components
interface CacheBucket<T> {
  data: T;
  timestamp: number;
  promise?: Promise<T>;
}

const queryCache = new Map<string, CacheBucket<any>>();
const listeners = new Map<string, Set<() => void>>();

export function useSmartQuery<T = any>(
  key: string | null | (() => string | null),
  fetcher: (url: string) => Promise<T>,
  options: SmartQueryOptions<T> = {}
): SmartQueryResult<T> {
  const {
    initialData,
    dedupingInterval = 30000,
    revalidateOnFocus = false,
    revalidateOnReconnect = false,
    refreshInterval = 0,
    onSuccess,
    onError,
  } = options;

  const resolvedKey = typeof key === 'function' ? key() : key;

  const cachedBucket = resolvedKey ? queryCache.get(resolvedKey) : undefined;
  const [data, setData] = useState<T | undefined>(() => cachedBucket ? cachedBucket.data : initialData);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(() => !cachedBucket && !initialData && Boolean(resolvedKey));
  const [isValidating, setIsValidating] = useState<boolean>(false);

  const fetcherRef = useRef(fetcher);
  fetcherRef.current = fetcher;
  const isMountedRef = useRef(true);

  const executeFetch = useCallback(
    async (forceRevalidate = false): Promise<T | undefined> => {
      if (!resolvedKey || !isMountedRef.current) return undefined;

      const now = Date.now();
      const currentBucket = queryCache.get(resolvedKey);

      // Check deduplication window
      if (!forceRevalidate && currentBucket) {
        if (now - currentBucket.timestamp < dedupingInterval) {
          setData(currentBucket.data);
          setIsLoading(false);
          setIsValidating(false);
          return currentBucket.data;
        }
      }

      // If an existing flight is pending, join it to prevent duplicate network calls
      if (currentBucket?.promise) {
        setIsValidating(true);
        try {
          const result = await currentBucket.promise;
          if (isMountedRef.current) {
            setData(result);
            setIsValidating(false);
          }
          return result;
        } catch (err: any) {
          if (isMountedRef.current) setIsValidating(false);
          return undefined;
        }
      }

      setIsValidating(true);
      if (!currentBucket && !initialData) {
        setIsLoading(true);
      }

      const fetchPromise = (async () => {
        try {
          const result = await fetcherRef.current(resolvedKey);
          queryCache.set(resolvedKey, {
            data: result,
            timestamp: Date.now(),
          });

          if (isMountedRef.current) {
            setData(result);
            setError(null);
            setIsLoading(false);
            setIsValidating(false);
            onSuccess?.(result);
          }

          // Notify any other components subscribed to the same key
          const keyListeners = listeners.get(resolvedKey);
          if (keyListeners) {
            keyListeners.forEach((listener) => listener());
          }

          return result;
        } catch (err: any) {
          const errorObj = err instanceof Error ? err : new Error(String(err));
          if (isMountedRef.current) {
            setError(errorObj);
            setIsLoading(false);
            setIsValidating(false);
            onError?.(errorObj);
          }
          throw errorObj;
        }
      })();

      if (currentBucket) {
        currentBucket.promise = fetchPromise;
      } else {
        queryCache.set(resolvedKey, {
          data: data as any,
          timestamp: 0,
          promise: fetchPromise,
        });
      }

      try {
        return await fetchPromise;
      } catch {
        return undefined;
      } finally {
        const bucket = queryCache.get(resolvedKey);
        if (bucket) bucket.promise = undefined;
      }
    },
    [resolvedKey, dedupingInterval, onSuccess, onError, initialData, data]
  );

  // Mutate cached value optimistically and revalidate optionally
  const mutate = useCallback(
    async (
      newData?: T | Promise<T> | ((current: T | undefined) => T),
      shouldRevalidate = true
    ): Promise<T | undefined> => {
      if (!resolvedKey) return undefined;

      let value: T | undefined;
      if (typeof newData === 'function') {
        const currentData = queryCache.get(resolvedKey)?.data ?? data;
        value = (newData as any)(currentData);
      } else if (newData instanceof Promise) {
        value = await newData;
      } else {
        value = newData;
      }

      if (value !== undefined) {
        queryCache.set(resolvedKey, {
          data: value,
          timestamp: Date.now(),
        });
        if (isMountedRef.current) {
          setData(value);
        }
      }

      if (shouldRevalidate) {
        return executeFetch(true);
      }

      return value;
    },
    [resolvedKey, data, executeFetch]
  );

  useEffect(() => {
    isMountedRef.current = true;

    if (!resolvedKey) {
      setIsLoading(false);
      setIsValidating(false);
      return;
    }

    // Subscribe to cross-component revalidations
    if (!listeners.has(resolvedKey)) {
      listeners.set(resolvedKey, new Set());
    }
    const updateListener = () => {
      const bucket = queryCache.get(resolvedKey);
      if (bucket && isMountedRef.current) {
        setData(bucket.data);
      }
    };
    listeners.get(resolvedKey)!.add(updateListener);

    // Initial fetch
    executeFetch(false);

    // Window focus / reconnect listeners (strictly opt-in, disabled by default)
    let handleFocus: (() => void) | undefined;
    let handleOnline: (() => void) | undefined;

    if (revalidateOnFocus) {
      handleFocus = () => {
        if (document.visibilityState === 'visible') {
          executeFetch(false);
        }
      };
      window.addEventListener('visibilitychange', handleFocus);
      window.addEventListener('focus', handleFocus);
    }

    if (revalidateOnReconnect) {
      handleOnline = () => executeFetch(false);
      window.addEventListener('online', handleOnline);
    }

    // Optional controlled slow interval (only if explicitly enabled > 0)
    let timer: NodeJS.Timeout | undefined;
    if (refreshInterval > 0) {
      timer = setInterval(() => {
        if (typeof document !== 'undefined' && document.hidden) return; // Skip if tab backgrounded
        executeFetch(false);
      }, refreshInterval);
    }

    return () => {
      isMountedRef.current = false;
      if (timer) clearInterval(timer);
      if (handleFocus) {
        window.removeEventListener('visibilitychange', handleFocus);
        window.removeEventListener('focus', handleFocus);
      }
      if (handleOnline) {
        window.removeEventListener('online', handleOnline);
      }
      const keyListeners = listeners.get(resolvedKey);
      if (keyListeners) {
        keyListeners.delete(updateListener);
        if (keyListeners.size === 0) listeners.delete(resolvedKey);
      }
    };
  }, [resolvedKey, executeFetch, revalidateOnFocus, revalidateOnReconnect, refreshInterval]);

  return {
    data,
    error,
    isLoading,
    isValidating,
    mutate,
    revalidate: () => executeFetch(true),
  };
}

/**
 * Invalidate a key globally across all mounted components
 */
export function invalidateSmartQuery(key: string): void {
  const bucket = queryCache.get(key);
  if (bucket) {
    bucket.timestamp = 0; // mark stale
  }
  const keyListeners = listeners.get(key);
  if (keyListeners) {
    keyListeners.forEach((listener) => listener());
  }
}
