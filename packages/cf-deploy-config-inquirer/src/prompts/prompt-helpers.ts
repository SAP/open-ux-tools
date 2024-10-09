import type { CfSystemChoice } from '../types';
import { existsSync } from 'fs';
import { join } from 'path';
import {
    isAppStudio,
    listDestinations,
    getDisplayName,
    isAbapEnvironmentOnBtp,
    type Destinations
} from '@sap-ux/btp-utils';

/**
 * Generates a sorted list of Cloud Foundry system destination choices from provided destinations.
 *
 * @param {Destinations} [destinations] - Object containing destination details retrieved from BTP.
 * @returns {CfSystemChoice[]} - Array of destination choices formatted for selection prompts.
 */
function createDestinationChoices(destinations: Destinations = {}): CfSystemChoice[] {
    return Object.values(destinations)
        .sort((a, b) => a.Name.localeCompare(b.Name, undefined, { numeric: true, caseFirst: 'lower' }))
        .map((destination) => ({
            name: `${getDisplayName(destination)} - ${destination.Host}`,
            value: destination.Name,
            scp: isAbapEnvironmentOnBtp(destination),
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
 * Checks for the presence of an MTA configuration file in specified path.
 *
 * @param {string} projectPath - project path to check for the MTA file.
 * @returns {boolean} - `true` if the MTA file exists, otherwise `false`.
 */
export function mtaFileExists(projectPath: string): boolean {
    return existsSync(join(projectPath, 'mta.yaml'));
}

/**
 * Retrieves and caches the list of available BTP destinations if running in BAS.
 *
 * @returns {Promise<Destinations | undefined>} - A promise resolving to a list of destinations or undefined if not in BAS.
 */
export async function fetchBTPDestinations(): Promise<Destinations | undefined> {
    if (isAppStudio()) {
        const destinations = await listDestinations();
        return destinations;
    }
    return undefined;
}
