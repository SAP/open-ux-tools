import type * as Keytar from 'keytar';
import type { Logger } from '@sap-ux/logger';
import { isAppStudio, errorString } from '../utils';
import { DummyStore } from './dummy-store';
import { KeytarStore } from './keytar-store';
import type { SecureStore } from './types';
import { globSync } from 'glob';
import { join, dirname } from 'path';
import { homedir } from 'os';

const keytarGlobVscode = join(
    homedir(),
    '.vscode/extensions/sapse.sap-ux-application-modeler-extension-**/node_modules/keytar/package.json'
);
const keytarGlobVscodeInsiders = join(
    homedir(),
    '.vscode-insiders/extensions/sapse.sap-ux-application-modeler-extension-**/node_modules/keytar/package.json'
);

function getKeytar(log: Logger): typeof Keytar | undefined {
    try {
        return require('keytar');
    } catch (err) {
        try {
            const files = globSync([keytarGlobVscode, keytarGlobVscodeInsiders]);
            log.info('files: \n' + JSON.stringify(files));
            const appModDirs: string[] = [];
            files.forEach((filePath: string) => {
                appModDirs.push(dirname(filePath));
            });
            log.info('keytarDirectories: \n' + JSON.stringify(appModDirs));
            if (appModDirs.length > 0) {
                const keytarDir = appModDirs[0];
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
