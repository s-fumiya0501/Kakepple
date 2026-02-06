const DEFAULT_TTL = 5 * 60 * 1000; // 5 minutes
const CACHE_PREFIX = 'app_cache:';

interface CacheEntry {
  data: any;
  timestamp: number;
}

function getStorageKey(key: string): string {
  return CACHE_PREFIX + key;
}

export function getCached<T>(key: string, ttl: number = DEFAULT_TTL): T | null {
  try {
    const raw = sessionStorage.getItem(getStorageKey(key));
    if (!raw) return null;
    const entry: CacheEntry = JSON.parse(raw);
    if (Date.now() - entry.timestamp > ttl) {
      sessionStorage.removeItem(getStorageKey(key));
      return null;
    }
    return entry.data as T;
  } catch {
    return null;
  }
}

export function setCache(key: string, data: any): void {
  try {
    const entry: CacheEntry = { data, timestamp: Date.now() };
    sessionStorage.setItem(getStorageKey(key), JSON.stringify(entry));
  } catch {
    // sessionStorage full or unavailable - silently fail
  }
}

export function invalidateCache(prefix?: string): void {
  try {
    if (!prefix) {
      // Clear all app cache entries
      const keysToDelete: string[] = [];
      for (let i = 0; i < sessionStorage.length; i++) {
        const key = sessionStorage.key(i);
        if (key && key.startsWith(CACHE_PREFIX)) {
          keysToDelete.push(key);
        }
      }
      keysToDelete.forEach(key => sessionStorage.removeItem(key));
      return;
    }
    const fullPrefix = getStorageKey(prefix);
    const keysToDelete: string[] = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && key.startsWith(fullPrefix)) {
        keysToDelete.push(key);
      }
    }
    keysToDelete.forEach(key => sessionStorage.removeItem(key));
  } catch {
    // sessionStorage unavailable - silently fail
  }
}
