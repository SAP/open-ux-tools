// Disk cache + network fetch for UI5 designtime api.json documents.
//
// Owns the caching policy for the `lookup_ui5_documentation` tool: a per-library on-disk cache with a
// TTL, the raw anonymous GET against the UI5 CDN, and the fallback chain that tries the configured
// base+version before degrading to the public base and/or the latest (unversioned) docs.
//
// Raw fetch + ~/.cache TTL are deliberate — public anonymous GETs with no suitable common-lib equivalent.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { dirname, join } from 'node:path';
import type { ApiJson, FetchApiJsonResult, ResolveApiJsonResult } from './types.js';

const FALLBACK_BASE = 'https://ui5.sap.com';
// Disk cache for fetched api.json documents. Entries are refreshed on re-fetch of the same
// base × version × library key once older than CACHE_TTL_MS, but keys that are no longer used (old
// UI5 versions, projects you switched away from) are never pruned. The directory only ever holds
// public api.json docs, so it is safe to delete manually at any time to reclaim space.
const CACHE_DIR = join(homedir(), '.cache', 'fiori-mcp-ui5-doc');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day

/**
 * Converts a dotted UI5 library name to its resource path segment.
 *
 * @param libraryName - Dotted library name (e.g. "sap.ui.comp").
 * @returns Slash-separated path (e.g. "sap/ui/comp").
 */
function libToPath(libraryName: string): string {
    return libraryName.replace(/\./g, '/');
}

/**
 * Builds the designtime api.json URL for a library at a given base and version.
 *
 * @param base - UI5 base URL.
 * @param version - UI5 version, or null for the latest (no version segment).
 * @param libraryName - Dotted library name.
 * @returns Fully-qualified api.json URL.
 */
function apiJsonUrl(base: string, version: string | null, libraryName: string): string {
    const libPath = libToPath(libraryName);
    const cleanBase = base.replace(/\/+$/, '');
    if (version) {
        return `${cleanBase}/${version}/test-resources/${libPath}/designtime/api.json`;
    }
    return `${cleanBase}/test-resources/${libPath}/designtime/api.json`;
}

/**
 * Computes the on-disk cache path for a given base/version/library combination.
 *
 * @param base - UI5 base URL.
 * @param version - UI5 version, or null for the latest.
 * @param libraryName - Dotted library name.
 * @returns Absolute cache file path.
 */
function cachePathFor(base: string, version: string | null, libraryName: string): string {
    const safeBase = base.replace(/[^a-z0-9]+/gi, '_');
    const safeVersion = version ?? 'latest';
    return join(CACHE_DIR, `${safeBase}__${safeVersion}__${libraryName}.json`);
}

/**
 * Reads a cached api.json if present and not older than the TTL.
 *
 * @param path - Cache file path.
 * @returns The parsed api.json, or null on miss/expiry/error.
 */
function readCache(path: string): ApiJson | null {
    if (!existsSync(path)) {
        return null;
    }
    try {
        const stat = statSync(path);
        if (Date.now() - stat.mtimeMs > CACHE_TTL_MS) {
            return null;
        }
        return JSON.parse(readFileSync(path, 'utf8')) as ApiJson;
    } catch {
        return null;
    }
}

/**
 * Writes an api.json document to the cache. Failures are swallowed (cache is best-effort).
 *
 * @param path - Cache file path.
 * @param data - The api.json to persist.
 */
function writeCache(path: string, data: ApiJson): void {
    try {
        mkdirSync(dirname(path), { recursive: true });
        writeFileSync(path, JSON.stringify(data));
    } catch {
        // cache failures are non-fatal
    }
}

/**
 * Fetches an api.json for a library from cache or network.
 *
 * @param base - UI5 base URL.
 * @param version - UI5 version, or null for the latest.
 * @param libraryName - Dotted library name.
 * @returns Either the fetched data (with source) or an error descriptor.
 */
async function fetchApiJson(base: string, version: string | null, libraryName: string): Promise<FetchApiJsonResult> {
    const url = apiJsonUrl(base, version, libraryName);
    const cachePath = cachePathFor(base, version, libraryName);
    const cached = readCache(cachePath);
    if (cached) {
        return { data: cached, source: 'cache', url };
    }

    let res: Response;
    try {
        res = await fetch(url);
    } catch (e) {
        return { error: `network error fetching ${url}: ${e instanceof Error ? e.message : String(e)}`, url };
    }
    if (!res.ok) {
        return { error: `HTTP ${res.status} fetching ${url}`, status: res.status, url };
    }
    let data: ApiJson;
    try {
        data = (await res.json()) as ApiJson;
    } catch (e) {
        return { error: `invalid JSON from ${url}: ${e instanceof Error ? e.message : String(e)}`, url };
    }
    writeCache(cachePath, data);
    return { data, source: 'network', url };
}

/**
 * Resolves an api.json by trying the configured base+version first, then falling back through:
 * configured base + latest, then the public fallback base + version, then fallback + latest.
 *
 * @param configuredBase - Base URL discovered from ui5.yaml, or null.
 * @param version - Version discovered from ui5.yaml, or null.
 * @param libraryName - Dotted library name.
 * @returns The first successful fetch, or null when every attempt fails.
 */
export async function resolveApiJson(
    configuredBase: string | null,
    version: string | null,
    libraryName: string
): Promise<ResolveApiJsonResult | null> {
    const attempts: { base: string; version: string | null }[] = [];
    if (configuredBase && version) {
        attempts.push({ base: configuredBase, version });
    }
    if (configuredBase) {
        attempts.push({ base: configuredBase, version: null });
    }
    if (version) {
        attempts.push({ base: FALLBACK_BASE, version });
    }
    attempts.push({ base: FALLBACK_BASE, version: null });

    // dedupe (configuredBase may equal FALLBACK_BASE)
    const seen = new Set<string>();
    for (const a of attempts) {
        const key = `${a.base}|${a.version ?? ''}`;
        if (seen.has(key)) {
            continue;
        }
        seen.add(key);
        const res = await fetchApiJson(a.base, a.version, libraryName);
        if ('data' in res) {
            return { ...res, base: a.base, version: a.version };
        }
    }
    return null;
}
