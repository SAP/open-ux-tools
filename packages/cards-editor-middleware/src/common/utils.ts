import { statSync, readdirSync, readFileSync } from 'fs';
import { ToolsLogger, LogLevel } from '@sap-ux/logger';
import { join } from 'path';

interface MultiCardsPayload {
    type: string;
    manifest: object;
}

interface MultiCardsStringManifest {
    integration: string;
    adaptive: string;
}

export interface i18nEntry {
    key: string;
    value: string;
    comment?: string;
}

export const CARD_TYPES = {
    INTERGATION: 'integration',
    ADAPTIVE: 'adaptive'
};

/**
 * Return the version from package.json.
 *
 *  @returns - version from package.json
 */
function getVersion(): string {
    let version = '';
    try {
        version = JSON.parse(
            readFileSync(join(__dirname, '../../package.json'), { encoding: 'utf8' }).toString()
        ).version;
    } catch (error: any) {
        const logger = new ToolsLogger({
            logLevel: LogLevel.Info
        });
        logger.warn(`Could not read version from 'package.json'`);
        logger.debug(error);
    }
    return version;
}

/**
 * Prepare the file name by adding .json extension if it is missing.
 *
 * @param path Path to the file
 * @returns returns the file name
 */
export function prepareFileName(path: string): string {
    const fileName = path.split('/')[path.split('/').length - 1];
    return fileName.endsWith('.json') ? fileName : `${fileName}.json`;
}

/**
 * Prepare card for saving by adding dtMiddleware parameter to the card manifest.
 *
 * @param card {object}
 * @returns {string} returns the card as a string
 */
export function prepareCardForSaving(card: any): string {
    const version = getVersion();
    const insights = card?.['sap.insights'];
    if (!insights.versions) {
        insights.versions = {
            dtMiddleware: version
        };
    } else {
        insights.versions.dtMiddleware = version;
    }
    return JSON.stringify(card, null, 2);
}

/**
 * This function takes the payload from the editor and prepares the integration and adaptive cards for saving.
 *
 * @param aMultipleCards {MultiCardsPayload[]}
 * @returns {MultiCardsStringManifest} returns the integration and adaptive cards as strings
 */
export function prepareCardTypesForSaving(aMultipleCards: MultiCardsPayload[]): MultiCardsStringManifest {
    const integrationCard = aMultipleCards.find((card) => card.type === CARD_TYPES.INTERGATION) ?? {
        type: CARD_TYPES.INTERGATION,
        manifest: {}
    };
    const adaptiveCard = aMultipleCards.find((card) => card.type === CARD_TYPES.ADAPTIVE) ?? {
        type: CARD_TYPES.ADAPTIVE,
        manifest: {}
    };
    return {
        integration: JSON.stringify(integrationCard.manifest, null, 2),
        adaptive: JSON.stringify(adaptiveCard.manifest, null, 2)
    };
}

/**
 * Find all manifests in the given folder.
 *
 * @param folder path to the folder to find all manifests
 * @returns An array of objects containing the file path and the manifest
 */
export function getAllManifests(folder: string): Array<object> {
    return readdirSync(folder)
        .filter((file: string) => {
            return statSync(join(folder, file)).isFile();
        })
        .map((file: string) => {
            let manifest: object = {};
            try {
                manifest = JSON.parse(readFileSync(join(folder, file), 'utf8'));
            } catch (err) {
                if (err instanceof SyntaxError) {
                    manifest = {
                        _error: err.message
                    };
                }
            }
            return {
                file: folder + '/' + file.replace('.json', ''),
                manifest: manifest
            };
        });
}

/**
 * Traverse the i18n properties file and call the callback function for each property.
 *
 * @param path {string} - Path to the i18n properties file
 * @param entries {Array<i18nEntry>} - Array of entries to be updated
 * @returns {string[]} - Array of lines
 */
export function traverseI18nProperties(path: string, entries: Array<i18nEntry>) {
    const i18nFile: string = readFileSync(path, 'utf8');
    const lines = i18nFile.split(/\r\n|\n/);
    const updatedEntries: { [key: number]: boolean } = {};
    const output: string[] = [];

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i];
        if (!line.startsWith('#')) {
            let [key, value] = line.includes('=') ? line.split('=') : line.split(':');
            key = key ? key.trim() : key;
            value = value ? value.trim() : value;
            const existingIndex = entries.findIndex((entry: any) => entry.key === key);
            let newLine = line;
            if (existingIndex !== -1) {
                const { key, value } = entries[existingIndex];
                newLine = `${key}=${value}`;
                updatedEntries[existingIndex] = true;
            }
            output.push(newLine);
        } else {
            output.push(line);
        }
    }
    return { lines, updatedEntries, output };
}

/**
 * Flatten an array of arrays into a single array.
 *
 * @param lists {Array<string>} - Array of arrays
 * @returns {Array<any>} - Flattened array
 */
const flatten = (lists: any) => {
    return lists.reduce((a: any, b: string) => a.concat(b), []);
};

/**
 * Get all directories in the given path.
 *
 * @param srcpath {string} - Path to the folder
 * @returns {Array<string>} - Array of directories
 */
const getDirectories = (srcpath: string) => {
    return readdirSync(srcpath)
        .map((file) => join(srcpath, file))
        .filter((path) => statSync(path).isDirectory());
};

/**
 * Get all directories recursively.
 *
 * @param srcpath {string} - Path to the folder
 * @returns {Array<string>} - Array of directories
 */
export const getDirectoriesRecursive = (srcpath: string): Array<string> => {
    return [srcpath, ...flatten(getDirectories(srcpath).map(getDirectoriesRecursive))];
};
