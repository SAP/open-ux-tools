import { t } from '../../../i18n';
import { validateSystemName } from './validators';

/**
 * Returns a default system name based on the service URL, system ID, and system client.
 * If the system name already exists in the secure store an incremented suffix is added to the name.
 *
 * @param serviceUrl path of the service
 * @param systemClient client of the system
 * @returns
 */
/* export async function getDefaultSystemName(serviceUrl: string, systemClient?: string): Promise<string> {
    const suggestedSystemName = await suggestSystemName(serviceUrl, systemClient);
    if (
        !tempAnswers.lastSystemNameSuggested ||
        //If last suggestion !== answers.newSystemName, user altered it
        (tempAnswers.isSuggestion && answersSystemName === tempAnswers.lastSystemNameSuggested)
    ) {
        tempAnswers.lastSystemNameSuggested = tempAnswers.suggestedSystemName;
        return tempAnswers.suggestedSystemName;
    }
    //Set isSuggestion to false so even if user makes answers.newSystemName === tempAnswers.lastSystemNameSuggested, name isn't suggested after they changed it
    tempAnswers.isSuggestion = false;
    return answersSystemName;
    return suggestedSystemName;
} */

/**
 * Provides a system name suggestion based on the system URL, system ID, and client, validating the name is unique against the secure store.
 *
 * @param systemUrl
 * @param client
 * @returns
 */
export async function suggestSystemName(systemUrl: string, client?: string): Promise<string> {
    const initialSystemName = systemUrl + (client ? t('texts.suggestedSystemNameClient', { client }) : '');

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
