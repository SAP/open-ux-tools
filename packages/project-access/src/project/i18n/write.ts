import { createCapI18nEntries as createI18nEntriesBase, createPropertiesI18nEntries } from '@sap-ux/i18n';
import type { NewI18nEntry } from '@sap-ux/i18n';
import { getCapEnvironment } from '..';
import type { I18nPropertiesPaths, Manifest } from '../../types';
import { join, dirname } from 'path';
import { readJSON, writeFile } from '../../file';
import { mkdir } from 'fs/promises';
import type { Editor } from 'mem-fs-editor';

/**
 * Maintains new translation entries in CAP i18n files.
 *
 * @param root project root.
 * @param filePath Relative file path in which the translation entry will be used.
 * @param newI18nEntries translation entries to write in the i18n file.
 * @param fs optional `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node
 * In case of CAP project, some CDS APIs are used internally which depends on `fs` of node and not `mem-fs-editor`.
 * When calling this function, adding or removing a CDS file in memory or changing CDS configuration will not be considered until present on real file system.
 * @returns boolean or exception
 */
export async function createCapI18nEntries(
    root: string,
    filePath: string,
    newI18nEntries: NewI18nEntry[],
    fs?: Editor
): Promise<boolean> {
    const env = await getCapEnvironment(root);
    return createI18nEntriesBase(root, filePath, newI18nEntries, env, fs);
}

/**
 * Maintains new translation entries in an existing i18n file or in a new i18n properties file if it does not exist for given model key.
 *
 * @param root project root
 * @param manifestPath absolute path to `manifest.json` file
 * @param i18nPropertiesPaths paths to `.properties` file`
 * @param newEntries translation entries to write in the `.properties` file
 * @param modelKey i18n model key,
 * @param fs optional `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node
 * @returns boolean or exception
 */
async function createUI5I18nEntriesBase(
    root: string,
    manifestPath: string,
    i18nPropertiesPaths: I18nPropertiesPaths,
    newEntries: NewI18nEntry[],
    modelKey: string,
    fs?: Editor
): Promise<boolean> {
    const defaultPath = 'i18n/i18n.properties';
    const i18nFilePath = i18nPropertiesPaths.models[modelKey]?.path;
    if (i18nFilePath) {
        // ensure folder for i18n exists
        const dirPath = dirname(i18nFilePath);
        if (!fs) {
            // create directory when mem-fs-editor is not provided. when mem-fs-editor is provided, directory is created on using `.commit()` API
            await mkdir(dirPath, { recursive: true });
        }

        return createPropertiesI18nEntries(i18nFilePath, newEntries, root, fs);
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
    await writeFile(manifestPath, JSON.stringify(newContent, undefined, 4), fs);

    // make sure i18n folder exists
    const dirPath = dirname(defaultPath);
    if (!fs) {
        // create directory when mem-fs-editor is not provided. when mem-fs-editor is provided, directory is created on using `.commit()` API
        await mkdir(join(dirname(manifestPath), dirPath), { recursive: true });
    }
    return createPropertiesI18nEntries(join(dirname(manifestPath), defaultPath), newEntries, root, fs);
}

/**
 * Maintains new translation entries in an existing i18n file or in a new i18n properties file if it does not exist.
 *
 * @param root project root
 * @param manifestPath absolute path to `manifest.json` file
 * @param i18nPropertiesPaths paths to `.properties` file`
 * @param newEntries translation entries to write in the `.properties` file
 * @param modelKey i18n model key
 * @param fs optional `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node
 * @returns boolean or exception
 * @description It also update `manifest.json` file if `<modelKey>` entry is missing from `"sap.ui5":{"models": {}}`
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
    modelKey: string,
    fs?: Editor
): Promise<boolean> {
    return createUI5I18nEntriesBase(root, manifestPath, i18nPropertiesPaths, newEntries, modelKey, fs);
}
/**
 * Maintains new translation entries in an existing i18n file or in a new i18n properties file if it does not exist.
 *
 * @param root project root
 * @param manifestPath absolute path to `manifest.json` file
 * @param i18nPropertiesPaths paths to `.properties` file`
 * @param newEntries translation entries to write in the `.properties` file
 * @param fs optional `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node
 * @returns boolean or exception
 * @description It also update `manifest.json` file if `@i18n` entry is missing from `"sap.ui5":{"models": {}}`
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
    newEntries: NewI18nEntry[],
    fs?: Editor
): Promise<boolean> {
    return createUI5I18nEntriesBase(root, manifestPath, i18nPropertiesPaths, newEntries, '@i18n', fs);
}

/**
 * Maintains new translation entries in an existing i18n file or in a new i18n properties file if it does not exist.
 *
 * @param root project root
 * @param i18nPropertiesPaths paths to `.properties` file`
 * @param newEntries translation entries to write in the `.properties` file
 * @param fs optional `mem-fs-editor` instance. If provided, `mem-fs-editor` api is used instead of `fs` of node
 * @returns boolean or exception
 * @description If `i18n` entry is missing from `"sap.app":{}`, default `i18n/i18n.properties` is used. Update of `manifest.json` file is not needed.
 */
export async function createManifestI18nEntries(
    root: string,
    i18nPropertiesPaths: I18nPropertiesPaths,
    newEntries: NewI18nEntry[],
    fs?: Editor
): Promise<boolean> {
    const i18nFilePath = i18nPropertiesPaths['sap.app'];
    // make sure i18n folder exists
    const dirPath = dirname(i18nFilePath);
    if (!fs) {
        // create directory when mem-fs-editor is not provided. when mem-fs-editor is provided, directory is created on using `.commit()` API
        await mkdir(dirPath, { recursive: true });
    }
    return createPropertiesI18nEntries(i18nFilePath, newEntries, root, fs);
}
