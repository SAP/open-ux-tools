import packageJson from '../../../package.json';
import type { MultiCardsPayload, I18nEntry, CardManifest } from '../../types';
import type { Editor as MemFsEditor } from 'mem-fs-editor';

const CARD_TYPES = {
    INTEGRATION: 'integration',
    ADAPTIVE: 'adaptive'
};

/**
 * Prepares an integration card manifest for saving by adding the `dtMiddleware` version to the card manifest.
 *
 * @param {CardManifest} cardManifest - The card manifest object to be updated.
 * @returns {void}
 */
function prepareIntegrationCardForSaving(cardManifest: CardManifest): void {
    const version = packageJson.version;
    const insights = cardManifest?.['sap.insights'];
    if (!insights.versions) {
        insights.versions = {
            dtMiddleware: version
        };
    } else {
        insights.versions.dtMiddleware = version;
    }
}

/**
 * Retrieves the integration card from the provided payload and prepares it for saving.
 *
 * @param {MultiCardsPayload[]} multipleCard - The payload containing multiple card manifests.
 * @returns {MultiCardsPayload} The integration card manifest.
 */
export function getIntegrationCard(multipleCard: MultiCardsPayload[]): MultiCardsPayload {
    const integrationCard = multipleCard.find((card) => card.type === CARD_TYPES.INTEGRATION) ?? {
        type: CARD_TYPES.INTEGRATION,
        manifest: {
            'sap.insights': {}
        },
        entitySet: ''
    };

    prepareIntegrationCardForSaving(integrationCard.manifest);
    return integrationCard;
}

/**
 * Traverses the i18n properties file and updates it with the provided entries.
 *
 * @param {string} path - The path to the i18n properties file.
 * @param {Array<I18nEntry>} entries - An array of entries to be updated in the i18n file. Each entry contains a key, value, and optional comment.
 * @param {MemFsEditor} fs - The mem-fs editor instance used to read and write files.
 * @returns {Promise<{ lines: string[]; updatedEntries: { [key: number]: boolean }; output: string[] }>} The updated lines of the i18n file, a map of updated entries, and the output lines.
 */
export async function traverseI18nProperties(
    path: string,
    entries: Array<I18nEntry>,
    fs: MemFsEditor
): Promise<{ lines: string[]; updatedEntries: { [key: number]: boolean }; output: string[] }> {
    const i18nFile = fs.read(path);
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
