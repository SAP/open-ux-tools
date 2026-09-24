import { dirname, join } from 'node:path';
import type { I18nPropertiesPaths, Manifest } from '../../types/index.js';
import { readJSON } from '../../file/index.js';
import type { Editor } from 'mem-fs-editor';

/**
 * Return absolute paths to i18n.properties files from manifest.
 *
 * @param manifestPath - path to manifest.json; used to parse manifest.json if not provided as second argument and to resolve absolute paths
 * @param manifest - optionally, parsed content of manifest.json, pass to avoid reading it again.
 * @param memFs - optional mem-fs-editor instance
 * @returns - absolute paths to i18n.properties
 */
export async function getI18nPropertiesPaths(
    manifestPath: string,
    manifest?: Manifest,
    memFs?: Editor
): Promise<I18nPropertiesPaths> {
    const parsedManifest = manifest ?? (await readJSON<Manifest>(manifestPath, memFs));
    const manifestFolder = dirname(manifestPath);
    const relativeI18nPropertiesPaths = getRelativeI18nPropertiesPaths(parsedManifest);
    const i18nPropertiesPaths: I18nPropertiesPaths = {
        'sap.app': join(manifestFolder, relativeI18nPropertiesPaths['sap.app']),
        models: {}
    };
    if (relativeI18nPropertiesPaths['sap.app.fallbackLocale']) {
        i18nPropertiesPaths['sap.app.fallbackLocale'] = join(
            manifestFolder,
            relativeI18nPropertiesPaths['sap.app.fallbackLocale']
        );
    }
    for (const modelKey in relativeI18nPropertiesPaths.models) {
        const relativeModelPaths = relativeI18nPropertiesPaths.models[modelKey];
        i18nPropertiesPaths.models[modelKey] = {
            path: join(manifestFolder, relativeModelPaths.path)
        };
        if (relativeModelPaths.fallbackLocalePath) {
            i18nPropertiesPaths.models[modelKey].fallbackLocalePath = join(
                manifestFolder,
                relativeModelPaths.fallbackLocalePath
            );
        }
    }
    return i18nPropertiesPaths;
}

/**
 * Return paths to i18n.properties files from manifest,
 * relative to the manifest.json.
 *
 * @param manifest - parsed content of manifest.json
 * @returns - paths to i18n.properties files from sap.app and models
 */
export function getRelativeI18nPropertiesPaths(manifest: Manifest): I18nPropertiesPaths {
    const appPath = getI18nAppPath(manifest);
    const appFallbackLocalePath = getI18nAppFallbackLocalePath(manifest, appPath);
    const result: I18nPropertiesPaths = {
        'sap.app': appPath,
        models: getI18nModelPaths(manifest)
    };
    if (appFallbackLocalePath) {
        result['sap.app.fallbackLocale'] = appFallbackLocalePath;
    }
    return result;
}

/**
 * Computes the fallback locale variant of a base i18n file path, e.g. "i18n/i18n.properties" + "en" yields "i18n/i18n_en.properties".
 *
 * @param basePath - base i18n file path
 * @param locale - fallback locale string (e.g. "en", "de")
 * @returns - path to the fallback locale file
 */
function computeFallbackLocalePath(basePath: string, locale: string): string {
    const ext = '.properties';
    const stem = basePath.endsWith(ext) ? basePath.slice(0, -ext.length) : basePath;
    return `${stem}_${locale}${ext}`;
}

/**
 * Get the fallback locale i18n path from sap.app.i18n part of the manifest.
 *
 * @param manifest - parsed content of manifest.json
 * @param appPath - resolved base i18n path for sap.app
 * @returns - fallback locale path, or undefined if not configured
 */
function getI18nAppFallbackLocalePath(manifest: Manifest, appPath: string): string | undefined {
    const i18n = manifest?.['sap.app']?.i18n;
    if (i18n !== null && typeof i18n === 'object') {
        const fallbackLocale = (i18n as { fallbackLocale?: unknown }).fallbackLocale;
        if (typeof fallbackLocale === 'string' && fallbackLocale && /^[A-Za-z0-9_-]+$/.test(fallbackLocale)) {
            return computeFallbackLocalePath(appPath, fallbackLocale);
        }
    }
    return undefined;
}

/**
 * Get the i18n path from sap.app.i18n part of the manifest.
 *
 * 1. from `sap.app.i18n` if `i18n` is string
 * 2. from `sap.app.bundleName` as `bundleName` wins over `bundleUrl`
 * 3. from `sap.app.bundleUrl`
 * 4. default which is `'i18n/i18n.properties'`
 *
 * @param manifest - parsed content of manifest.json
 * @returns - path to i18n.properties file
 */
function getI18nAppPath(manifest: Manifest): string {
    const defaultPath = join('i18n/i18n.properties');

    if (typeof manifest?.['sap.app']?.i18n === 'string') {
        return join(manifest['sap.app'].i18n);
    }
    const i18nObj = manifest?.['sap.app']?.i18n;
    if (i18nObj !== null && typeof i18nObj === 'object') {
        // bundleName wins over `bundleUrl`
        if ('bundleName' in i18nObj) {
            // module name is in dot notation; strip appId as a prefix
            const bundleName = i18nObj.bundleName;
            const appId = manifest['sap.app'].id ?? '';
            const suffix = appId && bundleName.startsWith(appId) ? bundleName.slice(appId.length) : bundleName;
            const i18nPath = `${join(...suffix.split('.'))}.properties`;
            return join(i18nPath);
        }

        if ('bundleUrl' in i18nObj) {
            return join(i18nObj.bundleUrl);
        }
    }
    // default
    return defaultPath;
}

/**
 * Resolves the i18n file path from a resource model's settings object.
 *
 * @param appId - application id from sap.app namespace
 * @param settings - resource model settings object
 * @param settings.bundleName - bundle name in dot notation (e.g. "sample.app.i18n")
 * @param settings.bundleUrl - bundle URL path (e.g. "i18n/i18n.properties")
 * @returns - resolved relative path, or undefined if it cannot be determined
 */
function extractBundlePath(appId: string, settings: { bundleName?: string; bundleUrl?: string }): string | undefined {
    if (settings.bundleName) {
        if (!appId) {
            return undefined;
        }
        // Strip appId as a prefix when present; fall back to full bundleName otherwise.
        // Prefix-strip is safer than String.replace which would remove the first occurrence anywhere in the string.
        const suffix = settings.bundleName.startsWith(appId)
            ? settings.bundleName.slice(appId.length)
            : settings.bundleName;
        return `${join(...suffix.split('.'))}.properties`;
    }
    if (settings.bundleUrl) {
        return join(settings.bundleUrl);
    }
    return undefined;
}

/**
 * Get the i18n path from UI5 resource models declared in sap.ui5.models part of the manifest.
 * By default the model used for internationalization in the UI is 'i18n'. For
 * internationalization of annotations the model is '@18n'.
 *
 * for For `sap.ui5` namespace
 * 1. from `sap.ui5.models.{resource model key}.bundleName` as `bundleName` wins over `bundleUrl`
 * 2. from `sap.ui5.models.{resource model key}.bundleUrl`
 * 3. from `sap.ui5.models.{resource model key}.uri`
 *
 * @param manifest - parsed content of manifest.json
 * @returns - paths to i18n.properties file from models
 */
function getI18nModelPaths(manifest: Manifest): { [modelKey: string]: { path: string; fallbackLocalePath?: string } } {
    const result: { [modelKey: string]: { path: string; fallbackLocalePath?: string } } = {};
    const models = manifest?.['sap.ui5']?.models ?? {};
    const resourceModelKeys = Object.keys(models).filter(
        (key) => models[key].type === 'sap.ui.model.resource.ResourceModel'
    );
    for (const modelKey of resourceModelKeys) {
        const i18nModel = models[modelKey];
        if (i18nModel.settings) {
            const appId = manifest['sap.app']?.id ?? '';
            const path = extractBundlePath(appId, i18nModel.settings);
            if (path) {
                result[modelKey] = { path };
                const fallbackLocale = (i18nModel.settings as { fallbackLocale?: unknown }).fallbackLocale;
                if (typeof fallbackLocale === 'string' && fallbackLocale && /^[A-Za-z0-9_-]+$/.test(fallbackLocale)) {
                    result[modelKey].fallbackLocalePath = computeFallbackLocalePath(path, fallbackLocale);
                }
                continue;
            }
        }
        if (i18nModel.uri) {
            result[modelKey] = { path: join(i18nModel.uri) };
        }
    }
    return result;
}
