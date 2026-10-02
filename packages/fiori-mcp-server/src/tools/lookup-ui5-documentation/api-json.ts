// Control lookup and inheritance-chain walking for the `lookup_ui5_documentation` tool.
//
// Given a resolved (base, version), locates a control symbol within a library's api.json and follows
// its `extends` chain upward — resolving each ancestor's declaring library on demand — so the
// per-lookupType extractors (see ./lookups/*) can find inherited members. Fetching and caching of the
// api.json itself lives in ./api-json-cache; ui5.yaml/version discovery lives in ./ui5-config-resolver.

import { resolveApiJson } from './api-json-cache.js';
import type { ApiJson, ResolveApiJsonResult, Ui5Symbol } from './types.js';

/**
 * Finds a control symbol by its fully-qualified name within an api.json.
 *
 * @param apiJson - The parsed api.json.
 * @param controlName - Fully-qualified control name.
 * @returns The matching symbol, or null.
 */
export function findControl(apiJson: ApiJson, controlName: string): Ui5Symbol | null {
    if (!Array.isArray(apiJson.symbols)) {
        return null;
    }
    return apiJson.symbols.find((s) => s.name === controlName) ?? null;
}

/**
 * In-memory memo for class→api.json resolution, keyed by base|version|fqName. Only *successful*
 * resolutions are stored — a miss (e.g. a transient CDN failure) is never cached, so it stays
 * retryable on the next call rather than poisoning the entry for the process lifetime. Bounded to
 * {@link MAX_CLASS_CACHE_ENTRIES}; the oldest-inserted entry is evicted when full (FIFO).
 */
const classLibraryCache = new Map<string, ResolveApiJsonResult>();

/** Upper bound on {@link classLibraryCache} entries, to cap memory over a long-running process. */
const MAX_CLASS_CACHE_ENTRIES = 256;

/**
 * Stores a successful class resolution, evicting the oldest-inserted entry when at capacity.
 *
 * @param key - The base|version|fqName cache key.
 * @param result - The resolve result to memoize.
 */
function cacheClassResult(key: string, result: ResolveApiJsonResult): void {
    if (classLibraryCache.size >= MAX_CLASS_CACHE_ENTRIES) {
        const oldest = classLibraryCache.keys().next().value;
        if (oldest !== undefined) {
            classLibraryCache.delete(oldest);
        }
    }
    classLibraryCache.set(key, result);
}

/**
 * Derives candidate library names for a class as the dotted prefixes of its fully-qualified name
 * (minus the class segment), longest first (e.g. "sap.ui.comp.smarttable.SmartTable" →
 * ["sap.ui.comp.smarttable", "sap.ui.comp", "sap.ui"]). Bounded to the first four candidates.
 *
 * @param fqName - Fully-qualified class name.
 * @returns Candidate dotted library names, most-specific first.
 */
function candidateLibraries(fqName: string): string[] {
    const prefixSegments = fqName.split('.').slice(0, -1);
    const candidates: string[] = [];
    for (let len = prefixSegments.length; len >= 2; len--) {
        candidates.push(prefixSegments.slice(0, len).join('.'));
    }
    return candidates.slice(0, 4);
}

/**
 * Resolves the library api.json that declares a given class by probing candidate libraries derived
 * from the class's fully-qualified name. Reuses {@link resolveApiJson} (disk cache + fallbacks) and
 * memoizes a successful outcome. Misses are not cached, so a transient failure can be retried.
 *
 * @param fqName - Fully-qualified class name to locate.
 * @param configuredBase - Base URL discovered from ui5.yaml, or null.
 * @param version - Version discovered from ui5.yaml, or null.
 * @returns The resolve result whose api.json contains the class, or null when none match.
 */
export async function resolveLibraryForClass(
    fqName: string,
    configuredBase: string | null,
    version: string | null
): Promise<ResolveApiJsonResult | null> {
    const cacheKey = `${configuredBase ?? ''}|${version ?? ''}|${fqName}`;
    const cached = classLibraryCache.get(cacheKey);
    if (cached) {
        return cached;
    }
    for (const library of candidateLibraries(fqName)) {
        const result = await resolveApiJson(configuredBase, version, library);
        if (result && findControl(result.data, fqName)) {
            cacheClassResult(cacheKey, result);
            return result;
        }
    }
    return null;
}

/**
 * Builds a control's inheritance chain by following `extends` from the starting symbol upward. Each
 * parent is looked up in the current api.json first, then resolved via {@link resolveLibraryForClass}
 * (often a different library). Stops gracefully on a missing parent or a cycle — a partial chain is
 * still useful.
 *
 * @param startSymbol - The control symbol to start from.
 * @param startApiJson - The api.json that produced `startSymbol`.
 * @param configuredBase - Base URL discovered from ui5.yaml, or null.
 * @param version - Version discovered from ui5.yaml, or null.
 * @returns The chain `[control, ...ancestors]`, ordered from the control to its furthest resolvable ancestor.
 */
export async function resolveControlChain(
    startSymbol: Ui5Symbol,
    startApiJson: ApiJson,
    configuredBase: string | null,
    version: string | null
): Promise<Ui5Symbol[]> {
    const chain: Ui5Symbol[] = [startSymbol];
    const seen = new Set<string>([startSymbol.name]);
    let currentSymbol = startSymbol;
    let currentApiJson = startApiJson;
    while (currentSymbol.extends) {
        const parentName = currentSymbol.extends;
        if (seen.has(parentName)) {
            break;
        }
        let parent = findControl(currentApiJson, parentName);
        let parentApiJson = currentApiJson;
        if (!parent) {
            const resolved = await resolveLibraryForClass(parentName, configuredBase, version);
            if (!resolved) {
                break;
            }
            parent = findControl(resolved.data, parentName);
            parentApiJson = resolved.data;
        }
        if (!parent) {
            break;
        }
        chain.push(parent);
        seen.add(parentName);
        currentSymbol = parent;
        currentApiJson = parentApiJson;
    }
    return chain;
}
