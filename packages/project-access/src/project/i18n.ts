import { readFile, updateFile } from '../file/file-access';
import type { Manifest } from '../types';
import { ManifestSection } from '../types';
import { join } from 'path';
import os from 'os';
import type { Model } from '@ui5/manifest/types/manifest';
import type { Editor } from 'mem-fs-editor';

type I18nFileTraverseCallback = (line: string, index: number, key?: string, value?: string) => void;

export interface I18nEntry {
    key: string;
    value: string;
    comment?: string;
    lineIndex?: number;
}

/**
 * Return path to i18n.properties file from manifest.
 *
 * @param manifestFolder - path to folder that contains manifest.json
 * @param manifest - parsed content of manifest.json
 * @param i18nSection - manifest section to search for i18n path
 * @returns - path to i18n.properties file
 */
function getI18nPath(
    manifestFolder: string,
    manifest: Manifest,
    i18nSection: ManifestSection.app | ManifestSection.ui5 = ManifestSection.ui5
): string | undefined {
    let relativePath: string | undefined;
    if (i18nSection === ManifestSection.app) {
        if (typeof manifest?.[i18nSection]?.['i18n'] === 'string') {
            relativePath = manifest['sap.app']['i18n'] as string;
        } else {
            relativePath = 'i18n/i18n.properties';
        }
    } else {
        const i18nModel = manifest?.[ManifestSection.ui5]?.models?.['i18n'] ?? ({} as Model);
        if ('uri' in i18nModel && typeof i18nModel.uri === 'string') {
            relativePath = i18nModel.uri;
        } else if (
            'settings' in i18nModel &&
            typeof i18nModel.settings === 'object' &&
            'bundleUrl' in i18nModel.settings &&
            typeof i18nModel.settings.bundleUrl === 'string'
        ) {
            relativePath = i18nModel.settings.bundleUrl;
        } else if (
            'settings' in i18nModel &&
            typeof i18nModel.settings === 'object' &&
            'bundleName' in i18nModel.settings &&
            typeof i18nModel.settings.bundleName === 'string'
        ) {
            const relBundleString = i18nModel.settings.bundleName.replace(manifest['sap.app'].id, '');
            relativePath = `${join(...relBundleString.split('.'))}.properties`;
        }
    }
    return relativePath ? join(manifestFolder, relativePath) : undefined;
}

/**
 * Return paths to i18n.properties files from manifest.
 *
 * @param manifestFolder - path to folder that contains manifest.json
 * @param manifest - parsed content of manifest.json
 * @returns - paths to i18n.properties files, split by manifest section
 */
export function getI18nPaths(
    manifestFolder: string,
    manifest: Manifest
): { [ManifestSection.app]: string; [ManifestSection.ui5]: string } {
    const sapAppPath = getI18nPath(manifestFolder, manifest, ManifestSection.app);
    const sapUi5Path = getI18nPath(manifestFolder, manifest);
    return {
        [ManifestSection.app]: sapAppPath as string,
        [ManifestSection.ui5]: sapUi5Path as string
    };
}

/**
 * Method to read i18n file and traverse each line of the i18n file.
 *
 * @param {string} path - Path to the i18n file.
 * @param {I18nFileTraverseCallback} fnCallback - Callback method for i18n file traverse.
 * @param {Editor} memFs optional mem-fs-editor instance
 * @returns {Promise<string[]>} - Promise that resolves to an array of lines in the i18n file.
 */
async function traverseI18nProperties(
    path: string,
    fnCallback: I18nFileTraverseCallback,
    memFs?: Editor
): Promise<string[]> {
    const i18nFile: string = await readFile(path, memFs);
    const lines = i18nFile.split(/\r\n|\n/);
    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.startsWith('#')) {
            const [key, value] = line.includes('=') ? line.split('=') : line.split(':');
            fnCallback(line, i, key ? key.trim() : key, value ? value.trim() : value);
        } else {
            fnCallback(line, i);
        }
    }
    return lines;
}

/**
 * Merge i18n properties.
 *
 * @param {object} i18n object
 * @param {string} path to a i18n properties file
 * @returns {*}  {Promise<object>}
 */
export async function mergeI18nProperties(i18n: any, path: string): Promise<object> {
    await traverseI18nProperties(path, (line: string, index: number, key?: string, value?: string) => {
        if (key && value) {
            i18n[key] = value;
        }
    });
    return i18n;
}

/**
 * Read the i18n properties from the given location.
 *
 * @param path path to main i18n.properties file
 * @param locale optional localization
 * @returns {*}  {Promise<object>}
 */
export async function getI18nProperties(path: string, locale?: string): Promise<object> {
    let i18n = {};
    i18n = await mergeI18nProperties(i18n, path);
    if (locale) {
        i18n = await mergeI18nProperties(i18n, path.replace('i18n.', `i18n_${locale}.`));
    }
    return i18n;
}

/**
 * Method to update i18n file with new i18n entry or by updating existing i18n entry.
 *
 * @param {string} path I18n file path.
 * @param {string} key New or existing i18n entry's key.
 * @param {string} value New value for i18n entry.
 * @param {string} [comment] Comment to insert on line before new i18n entry.
 * @returns {Promise<void>} Promise to void.
 */
export async function updateI18nProperty(path: string, key: string, value: string, comment?: string): Promise<void> {
    await updateI18nProperties(path, [{ key, value, comment }]);
}

/**
 * Method to update i18n file with new i18n entries or by updating existing i18n entries.
 *
 * @param {string} path I18n file path.
 * @param {Array<I18nEntry>} entries New or existing i18n entries.
 * @param {Editor} memFs optional mem-fs-editor instance
 */
export async function updateI18nProperties(path: string, entries: Array<I18nEntry>, memFs?: Editor): Promise<void> {
    if (entries.length === 0) {
        return;
    }
    const output = [];
    const updatedEntries: { [key: number]: boolean } = {};
    // Traverse i18n file and find if key already exists in i18n file
    const lines = await traverseI18nProperties(
        path,
        (line: string, index: number, keyTemp?: string, valueTemp?: string) => {
            const existingIndex: number =
                valueTemp !== undefined ? entries.findIndex((entry) => entry.key === keyTemp) : -1;
            if (existingIndex !== -1) {
                const { key, value } = entries[existingIndex];
                line = `${key}=${value}`;
                updatedEntries[existingIndex] = true;
            }
            output.push(line);
        },
        memFs
    );
    // check if file does not end with new line
    if (lines.length > 0 && lines[lines.length - 1].trim() && entries.length) {
        // If there no end line - add new gap line before new content
        output.push('');
    }
    for (const index in entries) {
        if (!updatedEntries[index]) {
            const { comment, key, value } = entries[index];
            // New i18n entry - add it at the end of file
            if (comment) {
                // Add comment only for new entry
                output.push(`#${comment}`);
            }
            output.push(`${key}=${value}${os.EOL}`);
        }
    }
    await updateFile(path, output.join(os.EOL), memFs);
}

/**
 * Method searches for i18n property.
 *
 * @param {string} path I18n file path.
 * @param {string} key I18N entry's key to look up.
 * @param {Editor} memFs optional mem-fs-editor instance
 * @returns {Promise<I18nEntry | undefined>} Returns value and line number if i18n entry matches passed key.
 */
export async function findI18nProperty(path: string, key: string, memFs: Editor): Promise<I18nEntry | undefined> {
    let i18nProperty;
    // Search property by traversing i18n file
    await traverseI18nProperties(
        path,
        (line: string, index: number, keyTemp?: string, value?: string) => {
            if (key && value && key === keyTemp) {
                i18nProperty = {
                    key,
                    value,
                    lineIndex: index
                };
            }
        },
        memFs
    );
    return i18nProperty;
}
