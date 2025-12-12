import { Diagnostic } from './diagnostics';

type InternalDiagnosticCache = {
    [K in Diagnostic['type']]?: Extract<Diagnostic, { type: K }>[];
};

/**
 * In memory cache for diagnostics.
 */
export class DiagnosticCache {
    private static cache: InternalDiagnosticCache = {};
    private static requests: Map<string, number> = new Map();

    /**
     * Get diagnostics for a given key.
     *
     * @param key - The key to retrieve diagnostics for.
     * @returns An array of diagnostics or undefined.
     */
    public static getMessages(key: Diagnostic['type']): Diagnostic[] | undefined {
        return this.cache[key];
    }

    /**
     * Add diagnostic for a given key.
     *
     * @param key - The key to add diagnostics for.
     * @param diagnostic - Diagnostic to store.
     */
    public static addMessage(key: Diagnostic['type'], diagnostic: Diagnostic): void {
        this.cache[key] ??= [];
        this.cache[key].push(diagnostic as any);
    }

    /**
     * Adds diagnostics for a given key.
     *
     * @param key - The key to add diagnostics for.
     * @param diagnostics - Diagnostics to store.
     */
    public static addMessages(key: Diagnostic['type'], diagnostics: Diagnostic[]): void {
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
        if (numberOfRequests > 0) {
            // the first time file is processed assume it is pristine
            // clear cache on subsequent calls
            console.log('DiagnosticCache.clear - triggered by', key);
            this.cache = {};
        }
    }
}
