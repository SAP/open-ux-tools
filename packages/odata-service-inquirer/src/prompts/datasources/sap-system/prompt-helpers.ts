import { t } from '../../../i18n';
import { validateSystemName } from './validators';
import type { BackendSystem } from '@sap-ux/store';

export type SystemType = 'OnPrem' | 'S4HC' | 'BTP' | undefined;

/**
 * Provides a system name suggestion based on the passed system name and client, validating the name is unique against the secure store.
 *
 * @param systemName the system name to use as a base for the suggestion
 * @param client the sap client to use for the system
 * @returns a unique system name suggestion
 */
export async function suggestSystemName(systemName: string, client?: string): Promise<string> {
    const initialSystemName = systemName + (client ? t('texts.suggestedSystemNameClient', { client }) : '');

    if ((await validateSystemName(initialSystemName)) === true) {
        return initialSystemName;
    }
    // If initial suggested name is taken, append a suffix
    return appendSuffix(initialSystemName);
}

/**
 * Appends a suffix to the system name to make it unique.
 *
 * @param systemName system name to use as a base name for finding a unique name
 * @returns suffixed system name
 */
async function appendSuffix(systemName: string) {
    let suffixNumber = 1;
    let suffixedSystemName = `${systemName} (${suffixNumber})`;
    while ((await validateSystemName(suffixedSystemName)) !== true) {
        suffixedSystemName = `${systemName} (${suffixNumber})`;
        suffixNumber++;
    }
    return suffixedSystemName;
}

/**
 * Determines the backend system type based on the authentication type and service keys (defaults to OnPrem).
 *
 * @param system - the backend system to determine the type for.
 * @returns - the system type
 */
export function getBackendSystemType(system: BackendSystem): SystemType {
    let backendSystemType: SystemType;
    if (system.authenticationType === 'reentranceTicket') {
        backendSystemType = 'S4HC';
    } else if (system.serviceKeys) {
        backendSystemType = 'BTP';
    } else if (system.authenticationType === 'basic' || system.username) {
        backendSystemType = 'OnPrem';
    }
    return backendSystemType;
}
