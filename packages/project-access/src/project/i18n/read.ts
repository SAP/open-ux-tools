import { getCapI18nBundle, getI18nFolderNames, getPropertiesI18nBundle } from '@sap-ux/i18n';
import { getCapEnvironment, getCdsFiles } from '..';
import type { I18nBundles, Project } from '../../types';

// replaces: get18nBundle, getCapI18nBundle, getEdmxI18nBundle in project-access

/**
 * Retrieves app, ui5 and service bundles for a given app in project.
 *
 * @param project project
 * @param appId id of an application for which to retrieve the i18n bundle.
 * @returns i18n bundles or exception
 */
export const getI18nBundles = async (project: Project, appId: string): Promise<I18nBundles> => {
    const { root } = project;
    const result: I18nBundles = {
        'sap.app': {},
        models: {},
        service: {}
    };
    // const i18nFilePathApp = join(root, apps[appId].i18n?.['sap.app'] ?? '');
    // const i18nFilePathUi5 = join(root, apps[appId].i18n?.['sap.ui5'] ?? '');
    result['sap.app'] = await getPropertiesI18nBundle(project.apps[appId].i18n['sap.app']);

    for (const key of Object.keys(project.apps[appId].i18n.models)) {
        result.models[key] = await getPropertiesI18nBundle(project.apps[appId].i18n.models[key].path);
    }

    if (project.projectType === 'CAPNodejs') {
        const env = await getCapEnvironment(root);
        const cdsFiles = await getCdsFiles(root, true);
        result.service = await getCapI18nBundle(root, env, cdsFiles);
    }
    return result;
    // const ui5I18nFilePath = project.apps[appId].i18n['sap.ui5.i18n'] ?? '';
    // const ui5AtI18nFilePath = project.apps[appId].i18n['sap.ui5.@i18n'] ?? '';
    // if (project.type === 'Cap') {
    //     const env = await getCapEnvironment(root);
    //     const cdsFiles = await getCdsFiles(root, true);
    //     const [app, ui5I18n, ui5Ati18n, service] = await Promise.all([
    //         getPropertiesI18nBundle(appI18nFilePath),
    //         getPropertiesI18nBundle(ui5I18nFilePath),
    //         getPropertiesI18nBundle(ui5AtI18nFilePath),
    //         getCapI18nBundle(root, env, cdsFiles)
    //     ]);
    //     return {
    //         app,
    //         'ui5.i18n': ui5I18n,
    //         'ui5.@i18n': ui5Ati18n,
    //         service
    //     };
    // }

    // const [app, ui5I18n, ui5Ati18n] = await Promise.all([
    //     getPropertiesI18nBundle(appI18nFilePath),
    //     getPropertiesI18nBundle(ui5I18nFilePath),
    //     getPropertiesI18nBundle(ui5AtI18nFilePath)
    // ]);
    // return {
    //     app,
    //     'ui5.i18n': ui5I18n,
    //     'ui5.@i18n': ui5Ati18n,
    //     service: {}
    // };
};

/**
 * Retrieves a list of potential folder names for i18n files.
 *
 * @param root Project root.
 * @returns ii18n folder names
 */
export const getCapI18nFolderNames = async (root: string): Promise<string[]> => {
    const environment = await getCapEnvironment(root);
    return getI18nFolderNames(environment);
};
