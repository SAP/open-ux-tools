import type { CfSystemChoice } from '../types';
import {
    isAppStudio,
    listDestinations,
    getDisplayName,
    isAbapEnvironmentOnBtp,
    type Destinations
} from '@sap-ux/btp-utils';
import type { Logger } from '@sap-ux/logger';
import { t } from '../i18n';

/**
 * Generates a sorted list of Cloud Foundry system destination choices from provided destinations.
 *
 * @param {Destinations} [destinations] - Object containing destination details retrieved from BTP.
 * @returns {CfSystemChoice[]} - Array of destination choices formatted for selection prompts.
 */
function createDestinationChoices(destinations: Destinations = {}): CfSystemChoice[] {
    return Object.values(destinations)
        .filter(
            (destination): destination is Destinations[keyof Destinations] =>
                destination && typeof destination.Name === 'string' && typeof destination.Host === 'string'
        )
        .sort((a, b) => a.Name.localeCompare(b.Name, undefined, { numeric: true, caseFirst: 'lower' }))
        .map((destination) => ({
            name: `${getDisplayName(destination) ?? 'Unknown'} - ${destination.Host}`,
            value: destination.Name,
            scp: isAbapEnvironmentOnBtp(destination) || false,
            url: destination.Host
        }));
}

/**
 * Retrieves an array of Cloud Foundry system choices.
 *
 * @param {Destinations} [destinations] - Optional destinations object retrieved from BTP.
 * @returns {Promise<CfSystemChoice[]>} - List of system choices formatted for selection prompts.
 */
export async function getCfSystemChoices(destinations?: Destinations): Promise<CfSystemChoice[]> {
    return destinations ? createDestinationChoices(destinations) : [];
}

/**
 * Retrieves and caches the list of available BTP destinations if running in BAS.
 *
 * @param {Logger} [log] - The logger instance to use for logging.
 * @returns {Promise<Destinations | undefined>} - A promise resolving to a list of destinations or undefined if not in BAS.
 */
export async function fetchBTPDestinations(log?: Logger): Promise<Destinations | undefined> {
    if (isAppStudio()) {
        const destinations = await listDestinations();
        log?.warn(t('warning.btpDestinationListWarning'));
        return destinations;
    }
    return undefined;
}
