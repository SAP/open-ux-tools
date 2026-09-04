// lookupType-agnostic core for the `lookup_ui5_documentation` tool.
//
// Responsible for everything that is independent of *which* piece of documentation is requested:
// discovering and reading ui5.yaml (to resolve the configured UI5 base URL and version), fetching and
// caching a library's designtime api.json, and locating a control symbol within it. The per-lookupType
// extractors (see ./lookups/*) operate on the Ui5Symbol this module returns.
//
// Raw fetch + ~/.cache TTL are deliberate — public anonymous GETs with no suitable common-lib equivalent.

import { existsSync, mkdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { homedir } from 'node:os';
import { basename, dirname, join, resolve } from 'node:path';
import { FileName, getMinimumUI5Version, getWebappPath, readUi5Yaml } from '@sap-ux/project-access';
import type { Manifest } from '@sap-ux/project-access';
import type { FioriToolsProxyConfig, UI5Config } from '@sap-ux/ui5-config';
import type { ApiJson, FetchApiJsonResult, ResolveApiJsonResult, Ui5Symbol } from './types.js';

/** Resolved (url, version) pair read from a ui5.yaml `ui5:` mapping. */
interface Ui5YamlConfig {
    url: string | null;
    version: string | null;
}

const FALLBACK_BASE = 'https://ui5.sap.com';
const CACHE_DIR = join(homedir(), '.cache', 'fiori-mcp-ui5-doc');
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 1 day
const FIORI_TOOLS_PROXY = 'fiori-tools-proxy';

/**
 * Walks up from `start` looking for a ui5.yaml file. Stops at the filesystem root.
 *
 * @param start - Directory (or file within a directory) to begin the search from.
 * @returns Absolute path to the nearest ui5.yaml, or null when none is found.
 */
export function findUi5Yaml(start: string): string | null {
    let dir = resolve(start);
    let parent = dirname(dir);
    while (parent !== dir) {
        const candidate = join(dir, 'ui5.yaml');
        if (existsSync(candidate)) {
            return candidate;
        }
        dir = parent;
        parent = dirname(dir);
    }
    // check the filesystem root itself
    const rootCandidate = join(dir, 'ui5.yaml');
    return existsSync(rootCandidate) ? rootCandidate : null;
}

/**
 * Extracts the configured UI5 base url and version from a parsed ui5.yaml. The base url and version
 * live on the fiori-tools-proxy middleware's `ui5` configuration; the version falls back to the
 * top-level `framework.version`.
 *
 * @param ui5Config - Parsed ui5.yaml.
 * @returns The resolved base url and version (either may be null).
 */
function extractUi5Config(ui5Config: UI5Config): Ui5YamlConfig {
    const proxyUi5 = ui5Config.findCustomMiddleware<FioriToolsProxyConfig>(FIORI_TOOLS_PROXY)?.configuration?.ui5;
    return {
        url: proxyUi5?.url ?? null,
        version: proxyUi5?.version ?? ui5Config.getUi5Framework()?.version ?? null
    };
}

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

/**
 * Resolves the app's minimum UI5 version from its manifest.json. Fiori app projects store the
 * pinned version in `sap.ui5.dependencies.minUI5Version`; adaptation projects store it in ui5.yaml
 * instead and have no manifest.json, so this function returns null for them (best-effort).
 *
 * @param appRoot - Application root directory to resolve the webapp/manifest.json under.
 * @returns The minimum UI5 version, or null when it cannot be determined.
 */
async function resolveMinUi5VersionFromManifest(appRoot: string): Promise<string | null> {
    try {
        const webappPath = await getWebappPath(appRoot);
        // The manifest shape is not validated here; getMinimumUI5Version reads only optional fields
        // and returns undefined when they are absent, so a loose parse is safe.
        const manifest = JSON.parse(readFileSync(join(webappPath, FileName.Manifest), 'utf8')) as Manifest;
        return getMinimumUI5Version(manifest) ?? null;
    } catch {
        return null;
    }
}

/**
 * Reads ui5.yaml (discovered by walking up from `startPath`) and resolves the configured UI5 base
 * URL and version. Adaptation projects carry the version in ui5.yaml; Fiori app projects carry it
 * in manifest.json — when the yaml provides no version, falls back to the app's manifest.json
 * minUI5Version so lookups target the pinned version rather than the latest CDN docs. A missing or
 * unreadable yaml yields a null base, letting the caller fall back to the public base.
 *
 * @param startPath - Directory (or file within it) to begin the ui5.yaml search from.
 * @returns The resolved base url and version (either may be null).
 */
export async function resolveUi5Config(startPath: string): Promise<Ui5YamlConfig> {
    const yamlPath = findUi5Yaml(startPath);
    let url: string | null = null;
    let version: string | null = null;
    let appRoot = resolve(startPath);
    if (yamlPath) {
        appRoot = dirname(yamlPath);
        try {
            const ui5Config = await readUi5Yaml(dirname(yamlPath), basename(yamlPath));
            ({ url, version } = extractUi5Config(ui5Config));
        } catch {
            // fall back to the manifest / public base below
        }
    }
    // Adaptation projects carry the version in ui5.yaml; Fiori app projects carry it in manifest.json.
    version ??= await resolveMinUi5VersionFromManifest(appRoot);
    return { url, version };
}

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

/** In-memory memo for class→api.json resolution, keyed by base|version|fqName. Process-lifetime. */
const classLibraryCache = new Map<string, ResolveApiJsonResult | null>();

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
 * memoizes the outcome for the process lifetime.
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
    if (cached !== undefined) {
        return cached;
    }
    for (const library of candidateLibraries(fqName)) {
        const result = await resolveApiJson(configuredBase, version, library);
        if (result && findControl(result.data, fqName)) {
            classLibraryCache.set(cacheKey, result);
            return result;
        }
    }
    classLibraryCache.set(cacheKey, null);
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
