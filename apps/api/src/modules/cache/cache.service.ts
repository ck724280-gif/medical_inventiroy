import { Injectable, Logger } from '@nestjs/common';

export interface CacheEntry<T> {
  data: T;
  expiresAt: number;
}

@Injectable()
export class CacheService {
  private readonly logger = new Logger(CacheService.name);
  private readonly storage = new Map<string, CacheEntry<any>>();

  /**
   * Set cache with TTL in milliseconds (default 5 minutes)
   */
  set<T>(key: string, data: T, ttlMs: number = 300000): void {
    const expiresAt = Date.now() + ttlMs;
    this.storage.set(key, { data, expiresAt });
  }

  /**
   * Get cached data if valid and not expired
   */
  get<T>(key: string): T | null {
    const entry = this.storage.get(key);
    if (!entry) return null;

    if (Date.now() > entry.expiresAt) {
      this.storage.delete(key);
      return null;
    }

    return entry.data as T;
  }

  /**
   * Delete a specific cache key
   */
  del(key: string): boolean {
    return this.storage.delete(key);
  }

  /**
   * Invalidate all keys matching a prefix (e.g. `branding:*` or `tenant:branch123:*`)
   */
  invalidatePattern(prefix: string): number {
    let deletedCount = 0;
    for (const key of this.storage.keys()) {
      if (key.startsWith(prefix)) {
        this.storage.delete(key);
        deletedCount++;
      }
    }
    this.logger.debug(`Invalidated ${deletedCount} cache entries for pattern: ${prefix}`);
    return deletedCount;
  }

  /**
   * Clear entire cache
   */
  clear(): void {
    this.storage.clear();
  }

  /**
   * Helper: Wrap get or fetch pattern
   */
  async getOrSet<T>(key: string, fetchFn: () => Promise<T>, ttlMs: number = 300000): Promise<T> {
    const cached = this.get<T>(key);
    if (cached !== null) {
      return cached;
    }

    const fresh = await fetchFn();
    this.set(key, fresh, ttlMs);
    return fresh;
  }
}
