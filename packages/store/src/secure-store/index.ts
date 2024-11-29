import type { Logger } from '@sap-ux/logger';
import { isAppStudio, errorString } from '../utils';
import { DummyStore } from './dummy-store';
import { KeyStoreManager } from './key-store';
import type { SecureStore } from './types';
// __non_webpack_require__ is used to ensure the require is not bundled by webpack and resolved at runtime
declare function __non_webpack_require__(m: string): any;

/**
 * Retrieves an instance of KeyStoreManager.
 * Falls back to returning a DummyStore instance if KeyStoreManager fails to initialize.
 *
 * @param log - Logger instance.
 * @returns An instance of KeyStoreManager or DummyStore.
 */
const getKeyStoreManager = (log: Logger): SecureStore => {
    try {
        log.info('Attempting to initialize KeyStoreManager.');
        return new KeyStoreManager(log);
    } catch (error) {
        log.warn(`Failed to initialize KeyStoreManager. Falling back to DummyStore. ${errorString(error)}`);
        return new DummyStore(log);
    }
};

/**
 * Instance of secure store.
 *
 * @param log - Logger instance for logging messages.
 * @returns An instance of SecureStore (KeyStoreManager or DummyStore).
 */
export const getSecureStore = (log: Logger): SecureStore => {
    const useDummyStore = isAppStudio() || (process.env.FIORI_TOOLS_DISABLE_SECURE_STORE ?? false);

    return useDummyStore ? new DummyStore(log) : getKeyStoreManager(log);
};

export * from './types';
