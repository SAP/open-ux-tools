import type { Logger } from '@sap-ux/logger';
import { isAppStudio, errorString } from '../utils';
import { DummyStore } from './dummy-store';
import { KeyStoreManager } from './key-store';
import type { SecureStore } from './types';
import type { keyring as zoweKeyring } from '@zowe/secrets-for-zowe-sdk';
import { join, dirname } from 'path';
import { homedir } from 'os';
import fs from 'fs';

// Ensure the require is not bundled by webpack and resolved at runtime
declare function __non_webpack_require__(moduleName: string): any;

/**
 * Retrieve paths to Zowe SDK from SAP Application Modeler extensions.
 *
 * @param insiders - Flag indicating if VS Code Insiders extensions should be checked.
 * @returns Array of valid paths where Zowe SDK might exist.
 */
function getZoweSdkPaths(insiders: boolean): string[] {
    const vscodeRootPath = insiders ? '.vscode-insiders' : '.vscode';
    const vscodeExtensionsPath = join(homedir(), vscodeRootPath, 'extensions');

    if (!fs.existsSync(vscodeExtensionsPath)) {
        return [];
    }

    const appModelerExtensions = fs
        .readdirSync(vscodeExtensionsPath)
        .filter((dir) => dir.startsWith('sapse.sap-ux-application-modeler-extension'));

    return appModelerExtensions
        .map((extensionDir) => {
            const extensionPath = join(vscodeExtensionsPath, extensionDir);
            const keytarPackageJsonPath = join(extensionPath, 'node_modules/@zowe/secrets-for-zowe-sdk/package.json');
            return fs.existsSync(keytarPackageJsonPath) ? dirname(keytarPackageJsonPath) : '';
        })
        .filter((path) => path !== '');
}

/**
 * Load the Zowe secrets SDK, attempting fallbacks if the default import fails.
 *
 * @param log - Logger instance for logging.
 * @returns The Zowe secrets SDK, or undefined if it cannot be loaded.
 */
function loadZoweSecretSdk(log: Logger): typeof zoweKeyring | undefined {
    try {
        // Attempt to load the Zowe SDK directly
        // eslint-disable-next-line
        return require('@zowe/secrets-for-zowe-sdk').keyring;
    } catch (primaryError) {
        log.warn(errorString(primaryError));
        log.info('Attempting to load Zowe secrets SDK from fallback locations.');

        try {
            const fallbackPaths = [...getZoweSdkPaths(false), ...getZoweSdkPaths(true)];
            log.info(`Discovered fallback directories: ${JSON.stringify(fallbackPaths)}`);

            for (const path of fallbackPaths) {
                try {
                    log.info(`Attempting to load Zowe secrets SDK from: ${path}`);
                    return typeof __non_webpack_require__ === 'function'
                        ? __non_webpack_require__(path)
                        : require(path);
                } catch (fallbackError) {
                    log.warn(`Failed to load Zowe secrets SDK from ${path}: ${errorString(fallbackError)}`);
                }
            }
        } catch (fallbackDiscoveryError) {
            log.warn(`Error while discovering fallback paths: ${errorString(fallbackDiscoveryError)}`);
        }

        log.warn('Unable to load Zowe secrets SDK from any location.');
        return undefined;
    }
}

/**
 * Provides an instance of a secure store.
 *
 * @param log - Logger instance for logging.
 * @returns An instance of SecureStore (KeyStoreManager or DummyStore).
 */
export const getSecureStore = (log: Logger): SecureStore => {
    // Use a DummyStore in environments where secure storage is disabled
    if (isAppStudio() || process.env.FIORI_TOOLS_DISABLE_SECURE_STORE) {
        log.debug('Secure store disabled, using DummyStore.');
        return new DummyStore(log);
    }
    // Try to initialize secure storage with Zowe secrets SDK
    const zoweSecretSdk = loadZoweSecretSdk(log);
    if (zoweSecretSdk) {
        log.info('Using KeyStoreManager for secure storage.');
        return new KeyStoreManager(log, zoweSecretSdk);
    }

    log.debug('Falling back to DummyStore as secure storage could not be initialized.');
    return new DummyStore(log);
};

export * from './types';
