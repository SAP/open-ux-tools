import packageJson from '../../../package.json';
import type { MultiCardsPayload, CardManifest } from '../../types';

const CARD_TYPES = {
    INTEGRATION: 'integration',
    ADAPTIVE: 'adaptive'
};

/**
 * Prepares an integration card manifest for saving by adding the design time preview middleware i.e.`dtpMiddleware` version to the card manifest.
 *
 * @param {CardManifest} cardManifest - The card manifest object to be updated.
 * @returns {void}
 */
function prepareIntegrationCardForSaving(cardManifest: CardManifest): void {
    const version = packageJson.version;
    const insights = cardManifest?.['sap.insights'];
    if (!insights.versions) {
        insights.versions = {
            dtpMiddleware: version
        };
    } else {
        insights.versions.dtpMiddleware = version;
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
