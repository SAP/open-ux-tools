import { dirname, join } from 'path';
import type { I18nPropertiesPaths, Manifest } from '../types';
import { readJSON } from '../file';

/**
 * Return paths to i18n.properties files from manifest, combined with path.
 *
 * @param manifestPath - path to manifest.json
 * @returns - paths to i18n.properties files combined with path to manifest.json
 */
export async function getI18nPropertiesPaths(manifestPath: string): Promise<I18nPropertiesPaths> {
    const manifest = await readJSON<Manifest>(manifestPath);
    const manifestFolder = dirname(manifestPath);
    const relativeI18nPropertiesPaths = getRelativeI18nPropertiesPaths(manifest);
    const i18nPropertiesPaths: I18nPropertiesPaths = {
        'sap.app': join(manifestFolder, relativeI18nPropertiesPaths['sap.app'])
    };
    if (relativeI18nPropertiesPaths['sap.ui5.i18n']) {
        i18nPropertiesPaths['sap.ui5.i18n'] = join(manifestFolder, relativeI18nPropertiesPaths['sap.ui5.i18n']);
    }
    if (relativeI18nPropertiesPaths['sap.ui5.@i18n']) {
        i18nPropertiesPaths['sap.ui5.@i18n'] = join(manifestFolder, relativeI18nPropertiesPaths['sap.ui5.@i18n']);
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
    return {
        'sap.app': getI18nAppPath(manifest),
        'sap.ui5.i18n': getI18nModelPath(manifest),
        'sap.ui5.@i18n': getI18nModelPath(manifest, true)
    };
}

/**
 * Get I18N path from sap.app part of the manifest.
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
    const defaultPath = 'i18n/i18n.properties';

    if (typeof manifest?.['sap.app']?.i18n === 'string') {
        return manifest['sap.app'].i18n;
    }
    if (typeof manifest?.['sap.app']?.i18n === 'object') {
        // bundleName wins over `bundleUrl`
        if ('bundleName' in manifest['sap.app'].i18n) {
            // module name is in dot notation
            const withoutAppId = manifest['sap.app'].i18n.bundleName.replace(manifest['sap.app'].id, '');
            const i18nPath = `${join(...withoutAppId.split('.'))}.properties`;
            return i18nPath;
        }

        if ('bundleUrl' in manifest['sap.app'].i18n) {
            return manifest['sap.app'].i18n.bundleUrl;
        }
    }
    // default
    return defaultPath;
}

/**
 * Get the I18N path from UI5 model declared in sap.ui5 part of the manifest. This is
 * model 'i18n' by default and can be set to annotation model '@18n' if forAnnotation is true.
 *
 * for For `sap.ui5` namespace
 * 1. from `sap.ui5.models.i18n.bundleName` as `bundleName` wins over `bundleUrl`
 * 2. from `sap.ui5.models.i18n.bundleUrl`
 * 3. from `sap.ui5.models.i18n.uri`
 *
 * @param manifest - parsed content of manifest.json
 * @param forAnnotation - indicates if `@i18n` model should be considered (default is false)
 * @returns - path to i18n.properties file
 */
function getI18nModelPath(manifest: Manifest, forAnnotation = false): string | undefined {
    const modelName = forAnnotation ? '@i18n' : 'i18n';
    const i18nModel = manifest?.['sap.ui5']?.models?.[modelName] ?? {};

    // settings wins over `uri`
    if (i18nModel.settings) {
        // bundleName wins over `bundleUrl`
        if (i18nModel.settings.bundleName) {
            // module name is in dot notation
            const withoutAppId = i18nModel.settings.bundleName.replace(manifest['sap.app'].id, '');
            const i18nPath = `${join(...withoutAppId.split('.'))}.properties`;
            return i18nPath;
        }
        if (i18nModel.settings.bundleUrl) {
            return i18nModel.settings.bundleUrl;
        }
    }
    if (i18nModel.uri) {
        return i18nModel.uri;
    }
    return undefined;
}
