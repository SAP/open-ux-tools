import type { CdsEnvironment } from '../types';

interface ApplicationSearchCacheStore {
    /**
     * Cache for retrieve of capEnvironment using `cds.env.for`.
     */
    capEnvironment: Map<string, CdsEnvironment | undefined>;
    // ToDo - other cached values???
    types: Map<string, string | undefined>;
}

interface ApplicationSearchCache {
    /**
     * Is cache enabled.
     * @default false
     */
    enabled: boolean;
    /**
     * Cache store
     */
    store: ApplicationSearchCacheStore;
}

let searchCache = initCache();

function initCache(): ApplicationSearchCache {
    return {
        enabled: false,
        store: {
            capEnvironment: new Map([]),
            types: new Map([])
        }
    };
}

export function enableSearchCache(): void {
    searchCache.enabled = true;
}

export function disableSearchCache(): void {
    searchCache = initCache();
}

export function updateCache<K extends keyof ApplicationSearchCacheStore>(
    store: K,
    key: string,
    value: ApplicationSearchCacheStore[K] extends Map<string, infer V> ? V : never
): void {
    if (!searchCache.enabled) {
        return;
    }
    (searchCache.store[store] as Map<string, typeof value>).set(key, value);
}

export function getCache<K extends keyof ApplicationSearchCacheStore>(
    store: K,
    key: string
): (ApplicationSearchCacheStore[K] extends Map<string, infer V> ? V : never) | undefined {
    if (!searchCache.enabled) {
        return undefined;
    }
    return searchCache.store[store].get(key) as
        | (ApplicationSearchCacheStore[K] extends Map<string, infer V> ? V : never)
        | undefined;
}
