import type * as Keytar from 'keytar';
import type { Logger } from '@sap-ux/logger';
import { isAppStudio, errorString } from '../utils';
import { DummyStore } from './dummy-store';
import { KeytarStore } from './keytar-store';
import type { SecureStore } from './types';
import { globSync } from 'glob';
import { join, dirname } from 'path';
import { homedir } from 'os';

function getKeytar(log: Logger): typeof Keytar | undefined {
    try {
        return require('keytar');
    } catch (err) {
        log.warn(errorString(err));
        log.warn(`Could not "require('keytar')". Trying VSCode's copy`);
        let vscode;

        const keytarGlobVscode = join(
            homedir(),
            '.vscode/extensions/sapse.sap-ux-application-modeler-extension-**/node_modules/keytar/'
        );
        const keytarGlobVscodeInsiders = join(
            homedir(),
            '.vscode-insiders/extensions/sapse.sap-ux-application-modeler-extension-**/node_modules/keytar/'
        );
        const files = globSync([keytarGlobVscode, keytarGlobVscodeInsiders]);
        console.log('files: \n' + JSON.stringify(files));
        const dirnames: string[] = [];
        files.forEach((filePath: string) => {
            dirnames.push(dirname(filePath));
        });
        console.log('keytarDirectories: \n' + JSON.stringify(dirnames));

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
        try {
            for (const dirname in dirnames) {
                return require(dirname);
            }
        } catch (e) {
            log.warn(errorString(e));
            log.warn('Could not get keytar from vscode sap-ux-application-modeler-extension node_modules');
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
