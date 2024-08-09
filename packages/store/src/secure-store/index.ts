import type * as Keytar from 'keytar';
import type { Logger } from '@sap-ux/logger';
import { isAppStudio, errorString } from '../utils';
import { DummyStore } from './dummy-store';
import { KeytarStore } from './keytar-store';
import type { SecureStore } from './types';
import { join, dirname } from 'path';
import { homedir } from 'os';
import { default as fs } from 'fs';

function getKeytarPaths(insiders: boolean): string[] {
    const vscodeRootPath = insiders ? '.vscode-insiders' : '.vscode';
    const vscodeExtensionsPath = join(homedir(), vscodeRootPath, 'extensions/');
    const AppMFoldersVscode =
        fs
            .readdirSync(vscodeExtensionsPath)
            .filter((fn) => fn.startsWith('sapse.sap-ux-application-modeler-extension')) ?? [];
    return (
        (AppMFoldersVscode.map((AppMFolderVscode) => {
            const extensionPath = join(vscodeExtensionsPath, AppMFolderVscode);
            const keytarPackageJsonPath = join(extensionPath, 'node_modules/keytar/package.json');
            if (fs.existsSync(keytarPackageJsonPath)) {
                return dirname(keytarPackageJsonPath);
            }
        }) as string[]) ?? ([] as string[])
    );
}

function getKeytar(log: Logger): typeof Keytar | undefined {
    try {
        return require('keytar');
    } catch (err) {
        // Try to load keytar from sap-ux-application-modeler-extension node_modules if available this helps in some
        // cases such as windows machines with restricted access. From node modules such as @sap/generator-fiori or @sap/ux-ui5-tooling
        // keytar is not installed or is removed from the fs by virus scanner.
        try {
            const AppMKeytarDirs = getKeytarPaths(false).concat(getKeytarPaths(true));
            log.info('keytarDirectories: \n' + JSON.stringify(AppMKeytarDirs));
            if (AppMKeytarDirs.length > 0) {
                const keytarDir = AppMKeytarDirs[0];
                log.info('Try to load keytar from :' + JSON.stringify(keytarDir));
                return require(keytarDir);
            }
        } catch (e) {
            log.warn(errorString(e));
            log.warn('Could not get keytar from sap-ux-application-modeler-extension node_modules');
        }

        log.warn(errorString(err));
        log.warn(`Could not "require('keytar')". Trying VSCode's copy`);
        let vscode;

        try {
            vscode = require('vscode');
        } catch (e) {
            log.warn(errorString(e));
            log.warn('Could not get hold of vscode');
            return undefined;
        }
        try {
            return require(`${vscode?.env?.appRoot}/node_modules.asar/keytar`);
        } catch (e) {
            log.warn(errorString(e));
            log.warn('Could not get keytar from vscode node_modules.asar');
        }
        try {
            return require(`${vscode?.env?.appRoot}/node_modules/keytar`);
        } catch (e) {
            log.warn(errorString(e));
            log.warn('Could not get keytar from vscode node_modules');
        }

        return undefined;
    }
}

/**
 * Create an instance of a store
 */
export const getSecureStore = (log: Logger): SecureStore => {
    if (isAppStudio() || process.env.FIORI_TOOLS_DISABLE_SECURE_STORE) {
        return new DummyStore(log);
    } else {
        const keytar = getKeytar(log);
        return keytar ? new KeytarStore(log, keytar) : new DummyStore(log);
    }
};

export * from './types';
