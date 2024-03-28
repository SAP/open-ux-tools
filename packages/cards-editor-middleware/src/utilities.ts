import { promises } from 'fs';
import packageJson from '../package.json';

interface MultiCardsPayload {
    type: string;
    manifest: object;
}

interface MultiCardsStringManifest {
    integration: string;
    adaptive: string;
}

export interface I18nEntry {
    key: string;
    value: string;
    comment?: string;
}

export const CARD_TYPES = {
    INTERGATION: 'integration',
    ADAPTIVE: 'adaptive'
};

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
 * @returns {void}
 */
function prepareIntegrationCardForSaving(card: any): void {
    const version = packageJson.version;
    const insights = card?.['sap.insights'];
    if (!insights.versions) {
        insights.versions = {
            dtMiddleware: version
        };
    } else {
        insights.versions.dtMiddleware = version;
    }
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
    prepareIntegrationCardForSaving(integrationCard.manifest);
    return {
        integration: JSON.stringify(integrationCard.manifest, null, 2),
        adaptive: JSON.stringify(adaptiveCard.manifest, null, 2)
    };
}

/**
 * Traverse the i18n properties file and call the callback function for each property.
 *
 * @param path {string} - Path to the i18n properties file
 * @param entries {Array<I18nEntry>} - Array of entries to be updated
 * @returns {object} - Object containing the lines, updated entries and the output
 */
export async function traverseI18nProperties(path: string, entries: Array<I18nEntry>) {
    const i18nFile: string = await promises.readFile(path, 'utf8');
    const lines = i18nFile.split(/\r\n|\n/);
    const updatedEntries: { [key: number]: boolean } = {};
    const output: string[] = [];

    for (const line of lines) {
        if (line.startsWith('#')) {
            output.push(line);
            continue;
        }

        const [i18nKey, _] = line.split(/[=:]/).map((word) => word.trim());
        const index = entries.findIndex((entry) => entry.key === i18nKey);
        let newLine = line;

        if (index !== -1) {
            const { key, value } = entries[index];
            newLine = `${key}=${value}`;
            updatedEntries[index] = true;
        }
        output.push(newLine);
    }

    return { lines, updatedEntries, output };
}
