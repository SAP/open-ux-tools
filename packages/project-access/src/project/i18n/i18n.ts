import { dirname, join } from 'path';
import type { I18nPropertiesPaths, Manifest } from '../../types';
import { readJSON } from '../../file';
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
    for (const modelKey in relativeI18nPropertiesPaths.models) {
        i18nPropertiesPaths.models[modelKey] = {
            path: join(manifestFolder, relativeI18nPropertiesPaths.models[modelKey].path)
        };
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
        models: getI18nModelPaths(manifest)
    };
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
    if (typeof manifest?.['sap.app']?.i18n === 'object') {
        // bundleName wins over `bundleUrl`
        if ('bundleName' in manifest['sap.app'].i18n) {
            // module name is in dot notation
            const withoutAppId = manifest['sap.app'].i18n.bundleName.replace(manifest['sap.app'].id, '');
            const i18nPath = `${join(...withoutAppId.split('.'))}.properties`;
            return join(i18nPath);
        }

        if ('bundleUrl' in manifest['sap.app'].i18n) {
            return join(manifest['sap.app'].i18n.bundleUrl);
        }
    }
    // default
    return defaultPath;
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
function getI18nModelPaths(manifest: Manifest): { [modelKey: string]: { path: string } } {
    const result: { [modelKey: string]: { path: string } } = {};
    const models = manifest?.['sap.ui5']?.models ?? {};
    const resourceModelKeys = Object.keys(models).filter(
        (key) => models[key].type === 'sap.ui.model.resource.ResourceModel'
    );
    for (const modelKey of resourceModelKeys) {
        const i18nModel = models[modelKey];
        // settings wins over `uri`
        if (i18nModel.settings) {
            // bundleName wins over `bundleUrl`
            if (i18nModel.settings.bundleName) {
                // module name is in dot notation
                const withoutAppId = i18nModel.settings.bundleName.replace(manifest['sap.app'].id, '');
                const i18nPath = `${join(...withoutAppId.split('.'))}.properties`;
                result[modelKey] = { path: join(i18nPath) };
                continue;
            }
            if (i18nModel.settings.bundleUrl) {
                result[modelKey] = { path: join(i18nModel.settings.bundleUrl) };
                continue;
            }
        }
        if (i18nModel.uri) {
            result[modelKey] = { path: join(i18nModel.uri) };
        }
    }
    return result;
}
