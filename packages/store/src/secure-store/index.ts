import type * as Keytar from 'keytar';
import type { Logger } from '@sap-ux/logger';
import { isAppStudio, errorString } from '../utils';
import { DummyStore } from './dummy-store';
import { KeytarStore } from './keytar-store';
import type { SecureStore } from './types';

function getKeytar(log: Logger): typeof Keytar | undefined {
    try {
        return require('keytar');
    } catch (err) {
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
    if (isAppStudio()) {
        return new DummyStore(log);
    } else {
        const keytar = getKeytar(log);
        return keytar ? new KeytarStore(log, keytar) : new DummyStore(log);
    }
};

export * from './types';
