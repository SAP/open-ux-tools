import type { Diagnostic } from './diagnostics';

type InternalDiagnosticCache = {
    [K in Diagnostic['type']]?: Extract<Diagnostic, { type: K }>[];
};

/**
 * In memory cache for diagnostics.
 */
export class DiagnosticCache {
    /**
     * If set to true, forces cache clear on the first update of a file.
     */
    public static forceReindexOnFirstUpdate = false;
    private static cache: InternalDiagnosticCache = {};
    private static requests: Map<string, number> = new Map();

    /**
     * Get diagnostics for a given key.
     *
     * @param key - The key to retrieve diagnostics for.
     * @returns An array of diagnostics or undefined.
     */
    public static getMessages<T extends Diagnostic['type']>(key: T): Extract<Diagnostic, { type: T }>[] | undefined {
        return this.cache[key];
    }

    /**
     * Add diagnostic for a given key.
     *
     * @param key - The key to add diagnostics for.
     * @param diagnostic - Diagnostic to store.
     */
    public static addMessage<T extends Diagnostic['type']>(key: T, diagnostic: Extract<Diagnostic, { type: T }>): void {
        this.cache[key] ??= [];
        this.cache[key].push(diagnostic as any);
    }

    /**
     * Adds diagnostics for a given key.
     *
     * @param key - The key to add diagnostics for.
     * @param diagnostics - Diagnostics to store.
     */
    public static addMessages<T extends Diagnostic['type']>(
        key: T,
        diagnostics: Extract<Diagnostic, { type: T }>[]
    ): void {
        this.cache[key] ??= [];
        for (const diagnostic of diagnostics) {
            this.cache[key].push(diagnostic as any);
        }
    }

    /**
     * Clear diagnostics for a given key.
     *
     * @param key - The key to clear diagnostics for.
     */
    public static clear(key: string): void {
        const numberOfRequests = this.requests.get(key) ?? 0;
        this.requests.set(key, numberOfRequests + 1);
        if (numberOfRequests > 0 || this.forceReindexOnFirstUpdate) {
            // the first time file is processed assume it is pristine
            // clear cache on subsequent calls
            this.cache = {};
        }
    }
}
