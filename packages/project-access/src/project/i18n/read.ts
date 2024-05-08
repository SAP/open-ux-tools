import { getCapI18nBundle, getI18nFolderNames, getPropertiesI18nBundle } from '@sap-ux/i18n';
import { getCapEnvironment, getCdsFiles } from '..';
import type { I18nBundles, I18nPropertiesPaths, ProjectType } from '../../types';
import type { Editor } from 'mem-fs-editor';

/**
 * Add error to optional errors object.
 *
 * @param result i18n bundles
 * @param key key to associate with the error
 * @param error error to add
 */
function addToErrors(result: I18nBundles, key: string, error: Error): void {
    if (!result.errors) {
        result.errors = {};
    }
    result.errors[key] = error;
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

    for (const key of Object.keys(i18nPropertiesPaths.models)) {
        try {
            result.models[key] = await getPropertiesI18nBundle(i18nPropertiesPaths.models[key].path, fs);
        } catch (error) {
            // add models key with empty model
            result.models[key] = {};

            addToErrors(result, `models.${key}`, error);
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
