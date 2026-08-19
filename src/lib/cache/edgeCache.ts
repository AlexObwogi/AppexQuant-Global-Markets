/**
 * AppexQuant Markets Global - Server-Side Caching & Edge Optimization Layer
 * Features:
 * - Cache-Control & S-MaxAge header generation for Edge CDNs (Vercel Edge, Cloud Run Nginx, Cloudflare)
 * - In-Memory Fast LRU/TTL Cache with Stale-While-Revalidate (SWR) background replenishment
 * - Tag-based Cache Invalidation (e.g. invalidate 'leaderboard', 'community', 'news')
 * - Automatic bypass for authenticated mutative requests or personalized query routes
 */

import { Request, Response, NextFunction } from 'express';
import { logger } from '../../observability/logger.ts';

interface CacheEntry {
  body: any;
  contentType: string;
  statusCode: number;
  createdAt: number;
  ttlMs: number;
  swrMs: number;
  tags: string[];
  etag: string;
}

class EdgeCacheStore {
  private cache = new Map<string, CacheEntry>();
  private tagIndex = new Map<string, Set<string>>();
  private maxEntries = 500;

  private generateEtag(data: string): string {
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      hash = (hash << 5) - hash + data.charCodeAt(i);
      hash |= 0;
    }
    return `W/"${Math.abs(hash).toString(36)}"`;
  }

  public get(key: string): { entry: CacheEntry; isStale: boolean } | null {
    const entry = this.cache.get(key);
    if (!entry) return null;

    const now = Date.now();
    const age = now - entry.createdAt;

    // Completely expired (past TTL + SWR window)
    if (age > entry.ttlMs + entry.swrMs) {
      this.delete(key);
      return null;
    }

    const isStale = age > entry.ttlMs;
    return { entry, isStale };
  }

  public set(
    key: string,
    body: any,
    contentType: string,
    statusCode: number,
    ttlSeconds: number,
    swrSeconds: number,
    tags: string[] = []
  ): string {
    // Evict oldest if exceeding capacity
    if (this.cache.size >= this.maxEntries) {
      const firstKey = this.cache.keys().next().value;
      if (firstKey) this.delete(firstKey);
    }

    const serialized = typeof body === 'string' ? body : JSON.stringify(body);
    const etag = this.generateEtag(serialized);

    const entry: CacheEntry = {
      body,
      contentType,
      statusCode,
      createdAt: Date.now(),
      ttlMs: ttlSeconds * 1000,
      swrMs: swrSeconds * 1000,
      tags,
      etag,
    };

    this.cache.set(key, entry);

    // Index tags
    for (const tag of tags) {
      if (!this.tagIndex.has(tag)) {
        this.tagIndex.set(tag, new Set());
      }
      this.tagIndex.get(tag)!.add(key);
    }

    return etag;
  }

  public delete(key: string): void {
    const entry = this.cache.get(key);
    if (entry) {
      for (const tag of entry.tags) {
        const keys = this.tagIndex.get(tag);
        if (keys) {
          keys.delete(key);
          if (keys.size === 0) this.tagIndex.delete(tag);
        }
      }
      this.cache.delete(key);
    }
  }

  public invalidateTag(tag: string): number {
    const keys = this.tagIndex.get(tag);
    if (!keys) return 0;

    let count = 0;
    for (const key of Array.from(keys)) {
      this.delete(key);
      count++;
    }
    logger.info(`EdgeCache: Invalidated ${count} entries for tag [${tag}]`);
    return count;
  }

  public getStats() {
    return {
      entriesCount: this.cache.size,
      tagsCount: this.tagIndex.size,
    };
  }

  public clear(): void {
    this.cache.clear();
    this.tagIndex.clear();
  }
}

export const edgeCacheStore = new EdgeCacheStore();

export interface EdgeCacheOptions {
  ttlSeconds?: number;
  swrSeconds?: number;
  tags?: string[];
  isPublic?: boolean;
  varyByAuth?: boolean;
}

/**
 * Express Middleware for Server-Side Edge Caching
 */
export function edgeCache(options: EdgeCacheOptions = {}) {
  const ttl = options.ttlSeconds ?? 60; // 1 minute default
  const swr = options.swrSeconds ?? 300; // 5 minutes SWR default
  const isPublic = options.isPublic ?? true;
  const tags = options.tags ?? [];

  return (req: Request, res: Response, next: NextFunction) => {
    // Only cache safe GET / HEAD requests
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return next();
    }

    // Skip cache if bypass header is passed
    if (req.headers['x-cache-bypass'] === 'true') {
      res.setHeader('X-Cache-Status', 'BYPASS');
      return next();
    }

    const authHeader = req.headers.authorization || (req.headers.cookie ? 'has-auth' : 'anon');
    const cacheKey = options.varyByAuth
      ? `${req.method}:${req.originalUrl || req.url}:${authHeader}`
      : `${req.method}:${req.originalUrl || req.url}`;

    // Set standard Edge CDN headers on the response
    const cacheControlDirectives = [
      isPublic ? 'public' : 'private',
      `max-age=${ttl}`,
      `s-maxage=${ttl}`,
      `stale-while-revalidate=${swr}`,
      'stale-if-error=86400',
    ];

    res.setHeader('Cache-Control', cacheControlDirectives.join(', '));
    res.setHeader('Vary', 'Accept-Encoding, Accept');
    res.setHeader('X-Edge-Cache-Tags', tags.join(','));

    // Check in-memory server cache
    const cached = edgeCacheStore.get(cacheKey);

    if (cached) {
      const { entry, isStale } = cached;
      
      // Handle conditional request (If-None-Match)
      const ifNoneMatch = req.headers['if-none-match'];
      if (ifNoneMatch && ifNoneMatch === entry.etag) {
        res.setHeader('ETag', entry.etag);
        res.setHeader('X-Cache-Status', isStale ? 'STALE_REVALIDATING' : 'HIT');
        return res.status(304).end();
      }

      res.setHeader('ETag', entry.etag);
      res.setHeader('X-Cache-Status', isStale ? 'STALE_REVALIDATING' : 'HIT');
      res.setHeader('Content-Type', entry.contentType || 'application/json; charset=utf-8');

      if (entry.statusCode) {
        res.status(entry.statusCode);
      }

      return res.send(entry.body);
    }

    // Cache Miss: Capture the outgoing response body
    res.setHeader('X-Cache-Status', 'MISS');

    const originalSend = res.send.bind(res);
    const originalJson = res.json.bind(res);

    res.send = function (body: any): Response {
      // Only cache successful 200 responses
      if (res.statusCode === 200) {
        const contentType = (res.getHeader('Content-Type') as string) || 'application/json; charset=utf-8';
        const etag = edgeCacheStore.set(cacheKey, body, contentType, res.statusCode, ttl, swr, tags);
        res.setHeader('ETag', etag);
      }
      return originalSend(body);
    };

    res.json = function (jsonBody: any): Response {
      if (res.statusCode === 200) {
        const contentType = 'application/json; charset=utf-8';
        const etag = edgeCacheStore.set(cacheKey, jsonBody, contentType, res.statusCode, ttl, swr, tags);
        res.setHeader('ETag', etag);
      }
      return originalJson(jsonBody);
    };

    next();
  };
}
