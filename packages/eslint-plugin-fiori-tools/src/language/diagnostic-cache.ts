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
    public static forceReindexOnFirstUpdate = false; // NOSONAR - Property must be mutable for test setup
    private static cache: Map<string, InternalDiagnosticCache> = new Map();
    private static readonly requests: Map<string, number> = new Map();

    /**
     * Get diagnostics for a given URI and rule type.
     *
     * @param uri - The file URI to retrieve diagnostics for.
     * @param ruleType - The rule type to retrieve diagnostics for.
     * @returns An array of diagnostics or undefined.
     */
    public static getMessages<T extends Diagnostic['type']>(
        uri: string,
        ruleType: T
    ): Extract<Diagnostic, { type: T }>[] | undefined {
        const uriCache = this.cache.get(uri);
        return uriCache?.[ruleType];
    }

    /**
     * Add diagnostic for a given URI and rule type.
     *
     * @param uri - The file URI to add diagnostics for.
     * @param ruleType - The rule type to add diagnostics for.
     * @param diagnostic - Diagnostic to store.
     */
    public static addMessage<T extends Diagnostic['type']>(
        uri: string,
        ruleType: T,
        diagnostic: Extract<Diagnostic, { type: T }>
    ): void {
        let uriCache = this.cache.get(uri);
        if (!uriCache) {
            uriCache = {};
            this.cache.set(uri, uriCache);
        }
        uriCache[ruleType] ??= [];
        uriCache[ruleType].push(diagnostic as any);
    }

    /**
     * Adds diagnostics for a given URI and rule type.
     *
     * @param uri - The file URI to add diagnostics for.
     * @param ruleType - The rule type to add diagnostics for.
     * @param diagnostics - Diagnostics to store.
     */
    public static addMessages<T extends Diagnostic['type']>(
        uri: string,
        ruleType: T,
        diagnostics: Extract<Diagnostic, { type: T }>[]
    ): void {
        let uriCache = this.cache.get(uri);
        if (!uriCache) {
            uriCache = {};
            this.cache.set(uri, uriCache);
        }
        uriCache[ruleType] ??= [];
        for (const diagnostic of diagnostics) {
            uriCache[ruleType].push(diagnostic as any);
        }
    }

    /**
     * Clear diagnostics for a given URI. If ruleType is provided, only clears that specific rule type.
     *
     * @param uri - The file URI to clear diagnostics for.
     * @param ruleType - Optional rule type to clear. If not provided, clears all diagnostics for the URI.
     */
    public static clear(uri: string, ruleType?: string): void {
        const numberOfRequests = this.requests.get(uri) ?? 0;
        this.requests.set(uri, numberOfRequests + 1);
        if (numberOfRequests > 0 || this.forceReindexOnFirstUpdate) {
            // the first time file is processed assume it is pristine
            // clear cache on subsequent calls
            if (ruleType) {
                // Clear specific rule type for this URI
                const uriCache = this.cache.get(uri);
                if (uriCache) {
                    delete uriCache[ruleType as Diagnostic['type']];
                }
            } else {
                // Clear all diagnostics for this URI
                this.cache.delete(uri);
            }
        }
    }
}
