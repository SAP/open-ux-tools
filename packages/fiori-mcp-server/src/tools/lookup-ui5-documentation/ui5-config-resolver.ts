// UI5 project configuration discovery for the `lookup_ui5_documentation` tool.
//
// Resolves the UI5 base URL and version a lookup should target by walking up from a project path to
// the nearest ui5.yaml, reading the fiori-tools-proxy `ui5` config, and — for Fiori app projects that
// pin the version in manifest.json rather than ui5.yaml — falling back to the app's minUI5Version.

import { existsSync, readFileSync } from 'node:fs';
import { basename, dirname, join, resolve } from 'node:path';
import { FileName, getMinimumUI5Version, getWebappPath, readUi5Yaml } from '@sap-ux/project-access';
import type { Manifest } from '@sap-ux/project-access';
import type { FioriToolsProxyConfig, UI5Config } from '@sap-ux/ui5-config';

/** Resolved (url, version) pair read from a ui5.yaml `ui5:` mapping. */
export interface Ui5YamlConfig {
    url: string | null;
    version: string | null;
}

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
