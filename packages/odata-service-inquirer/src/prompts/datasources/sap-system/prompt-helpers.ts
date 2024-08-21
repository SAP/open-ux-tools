import { t } from '../../../i18n';
import { validateSystemName } from './validators';

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
