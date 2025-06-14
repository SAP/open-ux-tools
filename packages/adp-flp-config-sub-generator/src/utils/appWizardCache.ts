import { getHostEnvironment, hostEnvironment, type ILogWrapper } from '@sap-ux/fiori-generator-shared';
import type { State } from '../app/types';
import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import { t } from '../utils/i18n';

const ADP_FLP_CONFIG_CACHE = '$adp-flp-config-cache';
// Type alias for the AppWizard object with the cache object.
export type AppWizardCache = AppWizard & { [ADP_FLP_CONFIG_CACHE]?: State };
const hostEnv = getHostEnvironment();

/**
 * Initialize the cache object in the appWizard object. N.B. this will update the passed reference.
 *
 * @param logger - Logger to log messages.
 * @param appWizard - AppWizard object to initialize the cache in.
 */
export function initAppWizardCache(logger: ILogWrapper, appWizard?: AppWizardCache): void {
    if (appWizard && !appWizard[ADP_FLP_CONFIG_CACHE]) {
        appWizard[ADP_FLP_CONFIG_CACHE] = {};
        logger.debug('AppWizard based cache initialized.');
    }
}

/**
 * Adds the specificed partial state to the app wizard cache. N.B. this will update the passed app wizard reference.
 *
 * @param appWizard - AppWizard object.
 * @param state - Partial state to add to the cache.
 * @param logger - Logger to log messages.
 */
export function addToCache(appWizard: AppWizardCache | undefined, state: Partial<State>, logger: ILogWrapper): void {
    logIfCacheMissing(appWizard, logger);
    if (appWizard?.[ADP_FLP_CONFIG_CACHE]) {
        Object.assign(appWizard[ADP_FLP_CONFIG_CACHE], state);
    }
}

/**
 * Gets the cached state from the app wizard object based on the specified key where the key is a propert of the State type.
 *
 * @param appWizard - AppWizard object with the cache object.
 * @param cacheKey - Key of the AdpAppWizardCache object to retrieve.
 * @param logger - Logger to log messages.
 * @returns The cached state of the specified key or undefined if not found.
 */
export function getFromCache<T>(
    appWizard: AppWizardCache | undefined,
    cacheKey: keyof State,
    logger: ILogWrapper
): T | undefined {
    logIfCacheMissing(appWizard, logger);
    return appWizard?.[ADP_FLP_CONFIG_CACHE]?.[cacheKey] as T;
}

/**
 * Deletes the cache object from the app wizard object. N.B. this will update the passed app wizard reference.
 *
 * @param appWizard - AppWizard object with the cache object.
 * @param logger - Logger to log messages.
 */
export function deleteCache(appWizard: AppWizardCache | undefined, logger: ILogWrapper): void {
    logIfCacheMissing(appWizard, logger);
    if (appWizard?.[ADP_FLP_CONFIG_CACHE]) {
        delete appWizard[ADP_FLP_CONFIG_CACHE];
    }
}

/**
 * Logs a warning message if the cache object is missing from the app wizard object.
 *
 * @param appWizard - AppWizard object with the cache object.
 * @param logger - Logger to log messages.
 */
function logIfCacheMissing(appWizard: AppWizardCache | undefined, logger: ILogWrapper): void {
    if (hostEnv === hostEnvironment.vscode && !appWizard?.[ADP_FLP_CONFIG_CACHE]) {
        logger.info(t('logMessages.warningCachingNotSupported'));
    }
}
