const cache = new Map<string, { data: any; timestamp: number }>();
const DEFAULT_TTL = 60 * 1000; // 1 minute

export function getCached<T>(key: string, ttl: number = DEFAULT_TTL): T | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() - entry.timestamp > ttl) {
    cache.delete(key);
    return null;
  }
  return entry.data as T;
}

export function setCache(key: string, data: any): void {
  cache.set(key, { data, timestamp: Date.now() });
}

export function invalidateCache(prefix?: string): void {
  if (!prefix) {
    cache.clear();
    return;
  }
  const keysToDelete: string[] = [];
  cache.forEach((_, key) => {
    if (key.startsWith(prefix)) {
      keysToDelete.push(key);
    }
  });
  keysToDelete.forEach(key => cache.delete(key));
}
