import { createCapI18nEntries as createI18nEntriesBase, createPropertiesI18nEntries } from '@sap-ux/i18n';
import type { NewI18nEntry } from '@sap-ux/i18n';
import { getCapEnvironment } from '..';
// import { ManifestNamespaceSelection } from '../../types';
import type { Manifest, Project } from '../../types';
import { join, dirname } from 'path';
import { readJSON } from '../../file';
import { ensureDir, writeJson } from 'fs-extra';

// import { getI18nPropertiesPath } from './utils';

// replaces: createI18nEntryForEdmx, createI18nEntriesForCap in project-access
// export const createI18nEntry = async (param: {
//     cap: boolean;
//     ui5: boolean;
//     root: string;
//     filePath: string;
//     newI18nEntries: NewI18nEntry[];
// }) => {
//     const { root, filePath, cap, newI18nEntries } = param;
//     if (cap) {
//         const env = await getCapEnvironment(root);
//         return abc(root, filePath, newI18nEntries, env);
//     }
//     return xyz(root, 'absolute-path-to-manifest-json-file', newI18nEntries);
// };

/**
 * Maintains new translation entries in CAP i18n files.
 *
 * @param root project root.
 * @param filePath file in which the translation entry will be used.
 * @param newI18nEntries translation entries to write in the i18n file.
 * @returns boolean or exception
 */
export const createCapI18nEntries = async (
    root: string,
    filePath: string,
    newI18nEntries: NewI18nEntry[]
): Promise<boolean> => {
    const env = await getCapEnvironment(root);
    return createI18nEntriesBase(root, filePath, newI18nEntries, env);
};

const createUI5I18nEntriesBase = async (
    project: Project,
    newEntries: NewI18nEntry[],
    modelKey: string
): Promise<boolean> => {
    const manifestPath = join(project.root, project.apps[''].manifest);
    const manifest = await readJSON<Manifest>(manifestPath);
    const defaultPath = 'i18n/i18n.properties';
    const i18nFilePath = project.apps[''].i18n.models[modelKey]?.path;
    if (i18nFilePath) {
        // const i18nFilePath = getI18nPropertiesPath({
        //     root: project.root,
        //     manifestPath,
        //     manifest,
        //     namespaceSelection: ManifestNamespaceSelection.ui5
        // });
        // const i18nFilePath = project.apps[''].i18n['sap.ui5.i18n'] ?? defaultPath;
        // ensure folder for i18n exists
        const dirPath = dirname(i18nFilePath);
        await ensureDir(dirPath);

        return createPropertiesI18nEntries(i18nFilePath, newEntries, project.root);
    }
    // update manifest.json entry
    let newContent = {
        ...manifest,
        'sap.ui5': {
            ...manifest['sap.ui5'],
            models: {
                ...manifest['sap.ui5']?.models,
                modelKey: { type: 'sap.ui.model.resource.ResourceModel', uri: defaultPath }
            }
        }
    } as Manifest;
    await writeJson(manifestPath, newContent);

    // const i18nFilePath = getI18nPropertiesPath({ root: project.root, manifestPath, manifest });
    // make sure i18n folder exists
    const dirPath = dirname(defaultPath);
    await ensureDir(join(project.root, dirPath));
    return createPropertiesI18nEntries(join(project.root, defaultPath), newEntries, project.root);
};
/**
 * Maintains new translation entries in an existing i18n file or in a new i18n properties file if it does not exist.
 *
 * @param project project
 * @param newEntries translation entries to write in the `.properties` file.
 * @returns boolean or exception
 * @Note it also update `manifest.json` file if `<modelKey>` (default is `i18n`) entry is missing from `"sap.ui5":{"models": {}}`
 * as
 * ```JSON
 * {
 *      "sap.ui5": {
 *          "models": {
 *              "<modelKey>": {
 *                  "type": "sap.ui.model.resource.ResourceModel",
 *                  "uri": "i18n/i18n.properties"
 *              }
 *          }
 *      }
 * }
 * ```
 */
export const createUI5I18nEntries = async (
    project: Project,
    newEntries: NewI18nEntry[],
    modelKey: string = 'i18n'
): Promise<boolean> => {
    return createUI5I18nEntriesBase(project, newEntries, modelKey);
};
/**
 * Maintains new translation entries in an existing i18n file or in a new i18n properties file if it does not exist.
 *
 * @param project project
 * @param newEntries translation entries to write in the `.properties` file.
 * @returns boolean or exception
 * @Note it also update `manifest.json` file if `@i18n` entry is missing from `"sap.ui5":{"models": {}}`
 * as
 * ```JSON
 * {
 *      "sap.ui5": {
 *          "models": {
 *              "@i18n": {
 *                  "type": "sap.ui.model.resource.ResourceModel",
 *                  "uri": "i18n/i18n.properties"
 *              }
 *          }
 *      }
 * }
 * ```
 */
export const createAnnotationI18nEntries = async (project: Project, newEntries: NewI18nEntry[]): Promise<boolean> => {
    return createUI5I18nEntriesBase(project, newEntries, '@i18n');
};

/**
 * Maintains new translation entries in an existing i18n file or in a new i18n properties file if it does not exist.
 *
 * @param project project
 * @param newEntries translation entries to write in the `.properties` file.
 * @returns boolean or exception
 * @Note if `i18n` entry is missing from `"sap.app":{}`, default `i18n/i18n.properties` is used. Update of `manifest.json` file is not needed
 */
export const createManifestI18nEntries = async (project: Project, newEntries: NewI18nEntry[]): Promise<boolean> => {
    // const manifestPath = join(project.root, project.apps[''].manifest);
    // const manifest = await readJSON<Manifest>(manifestPath);
    // const i18nFilePath = getI18nPropertiesPath({
    //     root: project.root,
    //     manifestPath,
    //     manifest,
    //     namespaceSelection: ManifestNamespaceSelection.app
    // });
    const i18nFilePath = project.apps[''].i18n['sap.app'];
    // make sure i18n folder exists
    const dirPath = dirname(i18nFilePath);
    await ensureDir(dirPath);
    return createPropertiesI18nEntries(i18nFilePath, newEntries, project.root);
};

// export const createPropertiesI18nEntries = async (project: Project, newEntries: NewI18nEntry[]) => true;

// some info for ui5

/**
 * 
 * Note
In case the properties bundleName and bundleUrl have both been specified, bundleName will be preferred.
 
// info from doc on sap.app.i18n: If the manifest contains placeholders in {{...}} syntax, but no i18n attribute has been provided, the default value i18n/i18n.properties is used to request a ResourceBundle.
 */

/**
 * default - i18n/i18n.properties - relative to manifest.json
 * for app (manifest) - maintaing is not needed. By default it pick default .properties file
 * for ui5 -
 * i18n or @i1un -> must maintain in manifest.json file (missing entry app does not crashes)
 * cases
 * modes.1i8n.uri: "i18n/i18n.properties" - uri can be i18n/a/b/ci18n.properties. (relative to manifest.json)
 * modes.1i8n.settings.bundleName => dot.notation. (app.id.folder.name)
 * modes.1i8n.settings.bundleUrl => uri like e.g  "i18n/i18n.properties",
 *
 */
