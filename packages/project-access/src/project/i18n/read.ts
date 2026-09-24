import type { I18nBundle } from '@sap-ux/i18n';
import { getCapI18nBundle, getI18nFolderNames, getPropertiesI18nBundle } from '@sap-ux/i18n';
import { getCapEnvironment, getCdsFiles } from '../index.js';
import type { I18nBundles, I18nPropertiesPaths, ProjectType } from '../../types/index.js';
import type { Editor } from 'mem-fs-editor';

/**
 * Add error to optional errors object.
 *
 * @param result i18n bundles
 * @param key key to associate with the error
 * @param error error to add
 */
function addToErrors(result: I18nBundles, key: string, error: Error): void {
    result.errors ??= {};
    result.errors[key] = error;
}

/**
 * Merges a fallback locale bundle into a primary bundle.
 * Skipped when the primary failed with a non-ENOENT error (file exists but unreadable).
 * Clears the primary ENOENT error when the fallback is read successfully.
 * Stores non-ENOENT fallback errors in result.errors instead of throwing.
 *
 * @param result - accumulator for bundles and errors
 * @param primaryKey - error key used to look up the primary error (e.g. 'sap.app')
 * @param current - primary bundle (may be empty if primary failed)
 * @param fallbackPath - path to the fallback locale .properties file
 * @param fs - optional mem-fs-editor instance
 * @returns merged bundle (fallback keys supplemented by primary entries)
 */
async function mergeWithFallback(
    result: I18nBundles,
    primaryKey: string,
    current: I18nBundle,
    fallbackPath: string,
    fs: Editor | undefined
): Promise<I18nBundle> {
    const primaryError = result.errors?.[primaryKey] as NodeJS.ErrnoException | undefined;
    if (primaryError && primaryError.code !== 'ENOENT') {
        return current;
    }
    try {
        const fallbackBundle = await getPropertiesI18nBundle(fallbackPath, fs);
        if (primaryError?.code === 'ENOENT') {
            delete result.errors![primaryKey];
            if (Object.keys(result.errors!).length === 0) {
                result.errors = undefined;
            }
        }
        // Primary entries take precedence on key collision
        return { ...fallbackBundle, ...current };
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') {
            addToErrors(result, `${primaryKey}.fallbackLocale`, error as Error);
        }
        return current;
    }
}

/**
 * For a given app in project, retrieves i18n bundles for 'sap.app' namespace,`models` of `sap.ui5` namespace and service for cap services.
 *
 * @param root project root
 * @param i18nPropertiesPaths paths to `.properties` file`
 * @param projectType optional type of project
 * @param fs optional `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node.
 * In case of CAP project, some CDS APIs are used internally which depends on `fs` of node and not `mem-fs-editor`.
 * When calling this function, adding or removing a CDS file in memory or changing CDS configuration will not be considered until present on real file system.
 * @returns i18n bundles or exception captured in optional errors object
 */
export async function getI18nBundles(
    root: string,
    i18nPropertiesPaths: I18nPropertiesPaths,
    projectType?: ProjectType,
    fs?: Editor
): Promise<I18nBundles> {
    const result: I18nBundles = {
        'sap.app': {},
        models: {},
        service: {}
    };
    try {
        result['sap.app'] = await getPropertiesI18nBundle(i18nPropertiesPaths['sap.app'], fs);
    } catch (error) {
        addToErrors(result, 'sap.app', error);
    }

    if (i18nPropertiesPaths['sap.app.fallbackLocale']) {
        result['sap.app'] = await mergeWithFallback(
            result,
            'sap.app',
            result['sap.app'],
            i18nPropertiesPaths['sap.app.fallbackLocale'],
            fs
        );
    }

    for (const key of Object.keys(i18nPropertiesPaths.models)) {
        try {
            result.models[key] = await getPropertiesI18nBundle(i18nPropertiesPaths.models[key].path, fs);
        } catch (error) {
            // add models key with empty model
            result.models[key] = {};

            addToErrors(result, `models.${key}`, error);
        }

        const fallbackLocalePath = i18nPropertiesPaths.models[key].fallbackLocalePath;
        if (fallbackLocalePath) {
            result.models[key] = await mergeWithFallback(
                result,
                `models.${key}`,
                result.models[key],
                fallbackLocalePath,
                fs
            );
        }
    }

    if (projectType === 'CAPJava' || projectType === 'CAPNodejs') {
        try {
            const env = await getCapEnvironment(root);
            const cdsFiles = await getCdsFiles(root, true);
            result.service = await getCapI18nBundle(root, env, cdsFiles, fs);
        } catch (error) {
            addToErrors(result, 'service', error);
        }
    }

    return result;
}
/**
 * Retrieves a list of potential folder names for i18n files.
 *
 * @param root Project root.
 * @returns ii18n folder names
 */
export async function getCapI18nFolderNames(root: string): Promise<string[]> {
    const environment = await getCapEnvironment(root);
    return getI18nFolderNames(environment);
}
