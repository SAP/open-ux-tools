import { createCapI18nEntries as createI18nEntriesBase, createPropertiesI18nEntries } from '@sap-ux/i18n';
import type { NewI18nEntry } from '@sap-ux/i18n';
import { getCapEnvironment } from '..';
import type { I18nPropertiesPaths, Manifest } from '../../types';
import { join, dirname } from 'path';
import { readJSON } from '../../file';
import { ensureDir, writeJson } from 'fs-extra';

/**
 * Maintains new translation entries in CAP i18n files.
 *
 * @param root project root.
 * @param filePath file in which the translation entry will be used.
 * @param newI18nEntries translation entries to write in the i18n file.
 * @returns boolean or exception
 */
export async function createCapI18nEntries(
    root: string,
    filePath: string,
    newI18nEntries: NewI18nEntry[]
): Promise<boolean> {
    const env = await getCapEnvironment(root);
    return createI18nEntriesBase(root, filePath, newI18nEntries, env);
}

/**
 * Maintains new translation entries in an existing i18n file or in a new i18n properties file if it does not exist for given model key
 *
 * @param root project root
 * @param manifestPath absolute path to `manifest.json` file
 * @param i18nPropertiesPaths paths to `.properties` file`
 * @param newEntries translation entries to write in the `.properties` file
 * @param modelKey i18n model key
 */
async function createUI5I18nEntriesBase(
    root: string,
    manifestPath: string,
    i18nPropertiesPaths: I18nPropertiesPaths,
    newEntries: NewI18nEntry[],
    modelKey: string
): Promise<boolean> {
    const defaultPath = 'i18n/i18n.properties';
    const i18nFilePath = i18nPropertiesPaths.models[modelKey]?.path;
    if (i18nFilePath) {
        // ensure folder for i18n exists
        const dirPath = dirname(i18nFilePath);
        await ensureDir(dirPath);

        return createPropertiesI18nEntries(i18nFilePath, newEntries, root);
    }

    // update manifest.json entry
    const manifest = await readJSON<Manifest>(manifestPath);
    const models = {
        ...manifest['sap.ui5']?.models
    };
    models[modelKey] = { type: 'sap.ui.model.resource.ResourceModel', uri: defaultPath };
    const newContent = {
        ...manifest,
        'sap.ui5': {
            ...manifest['sap.ui5'],
            models
        }
    } as Manifest;
    await writeJson(manifestPath, newContent);

    // make sure i18n folder exists
    const dirPath = dirname(defaultPath);
    await ensureDir(join(root, dirPath));
    return createPropertiesI18nEntries(join(root, defaultPath), newEntries, root);
}

/**
 * Maintains new translation entries in an existing i18n file or in a new i18n properties file if it does not exist.
 *
 * @param root project root
 * @param manifestPath absolute path to `manifest.json` file
 * @param i18nPropertiesPaths paths to `.properties` file`
 * @param newEntries translation entries to write in the `.properties` file
 * @param modelKey i18n model key
 * @returns boolean or exception
 * @description it also update `manifest.json` file if `<modelKey>` entry is missing from `"sap.ui5":{"models": {}}`
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
export async function createUI5I18nEntries(
    root: string,
    manifestPath: string,
    i18nPropertiesPaths: I18nPropertiesPaths,
    newEntries: NewI18nEntry[],
    modelKey: string
): Promise<boolean> {
    return createUI5I18nEntriesBase(root, manifestPath, i18nPropertiesPaths, newEntries, modelKey);
}
/**
 * Maintains new translation entries in an existing i18n file or in a new i18n properties file if it does not exist.
 *
 * @param root project root
 * @param manifestPath absolute path to `manifest.json` file
 * @param i18nPropertiesPaths paths to `.properties` file`
 * @param newEntries translation entries to write in the `.properties` file
 * @returns boolean or exception
 * @description it also update `manifest.json` file if `@i18n` entry is missing from `"sap.ui5":{"models": {}}`
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
export async function createAnnotationI18nEntries(
    root: string,
    manifestPath: string,
    i18nPropertiesPaths: I18nPropertiesPaths,
    newEntries: NewI18nEntry[]
): Promise<boolean> {
    return createUI5I18nEntriesBase(root, manifestPath, i18nPropertiesPaths, newEntries, '@i18n');
}

/**
 * Maintains new translation entries in an existing i18n file or in a new i18n properties file if it does not exist.
 *
 * @param root project root
 * @param i18nPropertiesPaths paths to `.properties` file`
 * @param newEntries translation entries to write in the `.properties` file
 * @returns boolean or exception
 * @description if `i18n` entry is missing from `"sap.app":{}`, default `i18n/i18n.properties` is used. Update of `manifest.json` file is not needed
 */
export async function createManifestI18nEntries(
    root: string,
    i18nPropertiesPaths: I18nPropertiesPaths,
    newEntries: NewI18nEntry[]
): Promise<boolean> {
    const i18nFilePath = i18nPropertiesPaths['sap.app'];
    // make sure i18n folder exists
    const dirPath = dirname(i18nFilePath);
    await ensureDir(dirPath);
    return createPropertiesI18nEntries(i18nFilePath, newEntries, root);
}
