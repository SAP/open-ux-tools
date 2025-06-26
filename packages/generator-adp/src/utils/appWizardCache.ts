import type { AppWizard } from '@sap-devx/yeoman-ui-types';
import type { ToolsLogger } from '@sap-ux/logger';

import { getHostEnvironment, hostEnvironment, type ILogWrapper } from '@sap-ux/fiori-generator-shared';

import type { ConfigPrompter } from '../app/questions/configuration';

/**
 * Values that are stashed in the App-Wizard cache.
 */
interface State {
    /** Re-use the heavy-weight ConfigPrompter when the user navigates back-and-forth. */
    prompter?: ConfigPrompter;
}

const ADP_CACHE_KEY = '$adp-generator-cache';

/**
 * Augmented AppWizard type with optional internal cache field used for state persistence.
 */
export type AppWizardWithCache = AppWizard & { [ADP_CACHE_KEY]?: Partial<State> };

/**
 * Initializes the internal cache store on the AppWizard instance if it doesn't exist.
 * This should be called early in the generator lifecycle (typically in the constructor).
 *
 * @param {ILogWrapper} logger - Logger instance used for debugging messages.
 * @param {AppWizardWithCache} [wizard] - The AppWizard instance to augment with cache storage.
 * @returns {void}
 */
export function initCache(logger: ToolsLogger, wizard?: AppWizardWithCache): void {
    if (wizard && !wizard[ADP_CACHE_KEY]) {
        wizard[ADP_CACHE_KEY] = {};
        logger.debug('ADP-wizard cache initialised.');
    }
}

/**
 * Stores or merges partial generator state in the AppWizard’s cache.
 *
 * @param {AppWizardWithCache | undefined} wizard - The AppWizard instance (may be undefined).
 * @param {Partial<State>} state - Partial state object to cache.
 * @param {ILogWrapper} logger - Logger instance for diagnostics.
 * @returns {void}
 */
export function cachePut(wizard: AppWizardWithCache | undefined, state: Partial<State>, logger: ToolsLogger): void {
    ensureCache(logger, wizard);
    if (wizard?.[ADP_CACHE_KEY]) {
        Object.assign(wizard[ADP_CACHE_KEY], state);
    }
}

/**
 * Retrieves a cached value from the AppWizard instance by key.
 *
 * @template T
 * @param {AppWizardWithCache | undefined} wizard - The AppWizard instance with cache.
 * @param {keyof State} key - The key to retrieve from the cached state.
 * @param {ILogWrapper} logger - Logger instance used for diagnostics.
 * @returns {T | undefined} - The cached value if present, otherwise `undefined`.
 */
export function cacheGet<T>(
    wizard: AppWizardWithCache | undefined,
    key: keyof State,
    logger: ToolsLogger
): T | undefined {
    ensureCache(logger, wizard);
    return wizard?.[ADP_CACHE_KEY]?.[key] as T | undefined;
}

/**
 * Clears the entire generator state cache from the AppWizard instance.
 *
 * @param {AppWizardWithCache | undefined} wizard - The AppWizard instance with cache to clear.
 * @param {ILogWrapper} logger - Logger instance for diagnostics.
 * @returns {void}
 */
export function cacheClear(wizard: AppWizardWithCache | undefined, logger: ToolsLogger): void {
    ensureCache(logger, wizard);
    if (wizard?.[ADP_CACHE_KEY]) {
        delete wizard[ADP_CACHE_KEY];
    }
}

/**
 * Logs a warning if caching is attempted in VS Code but the cache hasn’t been initialized.
 * This is a guard to ensure callers run `initCache()` before interacting with the cache.
 *
 * @param {ILogWrapper} logger - Logger instance for diagnostics.
 * @param {AppWizardWithCache | undefined} wizard - The AppWizard instance to check.
 * @returns {void}
 */
function ensureCache(logger: ToolsLogger, wizard?: AppWizardWithCache): void {
    const hostEnv = getHostEnvironment();
    if (hostEnv === hostEnvironment.vscode && !wizard?.[ADP_CACHE_KEY]) {
        logger.info('Warning: caching is not supported');
    }
}
