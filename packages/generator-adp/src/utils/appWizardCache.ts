import type { AppWizard } from '@sap-devx/yeoman-ui-types';

import { getHostEnvironment, hostEnvironment, type ILogWrapper } from '@sap-ux/fiori-generator-shared';

import { t } from './i18n';
import type { State } from '../app/types';

const ADP_CACHE_KEY = '$adp-generator-cache';

const hostEnv = getHostEnvironment();

/**
 * Augmented AppWizard type with optional internal cache field used for state persistence.
 */
export type AppWizardWithCache = AppWizard & { [ADP_CACHE_KEY]?: Partial<State> };

/**
 * Initializes the internal cache store on the AppWizard instance if it doesn't exist.
 * This should be called early in the generator lifecycle (typically in the constructor).
 *
 * @param logger - The logger instance to log debug or warning messages.
 * @param wiz - The AppWizard instance to augment with cache storage.
 */
export function initCache(logger: ILogWrapper, wiz?: AppWizardWithCache): void {
    if (wiz && !wiz[ADP_CACHE_KEY]) {
        wiz[ADP_CACHE_KEY] = {};
        logger.debug('ADP-wizard cache initialised.');
    }
}

/**
 * Stores or merges partial generator state in the AppWizard’s cache.
 *
 * @param wiz - The AppWizard instance (with optional cache).
 * @param state - Partial state object to cache.
 * @param logger - Logger used for diagnostics.
 */
export function cachePut(wiz: AppWizardWithCache | undefined, state: Partial<State>, logger: ILogWrapper): void {
    ensureCache(logger, wiz);
    if (wiz?.[ADP_CACHE_KEY]) {
        Object.assign(wiz[ADP_CACHE_KEY], state);
    }
}

/**
 * Retrieves a cached value from the AppWizard instance by key.
 *
 * @template T - The expected return type for the cached value.
 * @param wiz - The AppWizard instance with cache.
 * @param key - The key of the value to retrieve.
 * @param logger - Logger used for diagnostics.
 * @returns The cached value if present, otherwise `undefined`.
 */
export function cacheGet<T>(wiz: AppWizardWithCache | undefined, key: keyof State, logger: ILogWrapper): T | undefined {
    ensureCache(logger, wiz);
    return wiz?.[ADP_CACHE_KEY]?.[key] as T | undefined;
}

/**
 * Clears the entire generator state cache from the AppWizard instance.
 *
 * @param wiz - The AppWizard instance with cache to clear.
 * @param logger - Logger used for diagnostics.
 */
export function cacheClear(wiz: AppWizardWithCache | undefined, logger: ILogWrapper): void {
    ensureCache(logger, wiz);
    if (wiz?.[ADP_CACHE_KEY]) {
        delete wiz[ADP_CACHE_KEY];
    }
}

/**
 * Logs a warning if caching is attempted in VS Code but the cache hasn’t been initialized.
 * This is a guard to ensure callers run `initCache()` before interacting with the cache.
 *
 * @param logger - Logger used for diagnostics.
 * @param wiz - The AppWizard instance to check.
 */
function ensureCache(logger: ILogWrapper, wiz?: AppWizardWithCache): void {
    if (hostEnv === hostEnvironment.vscode && !wiz?.[ADP_CACHE_KEY]) {
        logger.info(t('logMessages.warningCachingNotSupported'));
    }
}
