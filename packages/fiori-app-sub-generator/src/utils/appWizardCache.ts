import { getHostEnvironment, hostEnvironment, type ILogWrapper } from '@sap-ux/fiori-generator-shared';
import { t } from './i18n';
import type { State } from '../types';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';

const FIORI_CACHE = '$fiori-cache';
// Type alias for the AppWizard object with the cache object.
export type AppWizardCache = AppWizard & { [FIORI_CACHE]?: Partial<State> };
const hostEnv = getHostEnvironment();

/**
 * Initialize the cache object in the appWizard object. N.B. this will update the passed reference.
 *
 * @param logger
 * @param appWizard
 */
export function initAppWizardCache(logger: ILogWrapper, appWizard?: AppWizardCache): void {
    if (appWizard && !appWizard[FIORI_CACHE]) {
        appWizard[FIORI_CACHE] = {};
        logger.debug('AppWizard based cache initialized.');
    }
}

/**
 * Adds the specificed partial state to the app wizard cache. N.B. this will update the passed app wizard reference.
 *
 * @param appWizard
 * @param state
 * @param logger
 */
export function addToCache(appWizard: AppWizardCache | undefined, state: Partial<State>, logger: ILogWrapper): void {
    logIfCacheMissing(appWizard, logger);
    if (appWizard?.[FIORI_CACHE]) {
        Object.assign(appWizard[FIORI_CACHE], state);
    }
}

/**
 * Gets the cached state from the app wizard object based on the specified key where the key is a propert of the State type.
 *
 * @param appWizard
 * @param stateKey
 * @param logger
 * @returns
 */
export function getFromCache<T>(
    appWizard: AppWizardCache | undefined,
    stateKey: keyof State,
    logger: ILogWrapper
): T | undefined {
    logIfCacheMissing(appWizard, logger);
    return appWizard?.[FIORI_CACHE]?.[stateKey] as T;
}

/**
 * Deletes the cache object from the app wizard object. N.B. this will update the passed app wizard reference.
 *
 * @param appWizard
 * @param logger
 */
export function deleteCache(appWizard: AppWizardCache | undefined, logger: ILogWrapper): void {
    logIfCacheMissing(appWizard, logger);
    if (appWizard?.[FIORI_CACHE]) {
        delete appWizard[FIORI_CACHE];
    }
}

/**
 * Logs a warning message if the cache object is missing from the app wizard object.
 *
 * @param appWizard
 * @param logger
 */
function logIfCacheMissing(appWizard: AppWizardCache | undefined, logger: ILogWrapper): void {
    // YUI cache only available in vscode
    if (hostEnv === hostEnvironment.vscode && !appWizard?.[FIORI_CACHE]) {
        logger.info(t('logMessages.warningCachingNotSupported'));
    }
}
