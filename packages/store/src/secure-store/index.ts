import type * as Keytar from 'keytar';
import type { Logger } from '@sap-ux/logger';
import { isAppStudio, errorString } from '../utils';
import { DummyStore } from './dummy-store';
import { KeytarStore } from './keytar-store';
import type { SecureStore } from './types';
import { spawn } from 'child_process';
import os from 'os';

function getKeytar(log: Logger): typeof Keytar | undefined {
    try {
        return require('keytar');
    } catch (err) {
        log.warn(errorString(err));
        log.warn(`Could not "require('keytar')". Trying VSCode's copy`);
        let vscode;
        let appModExtVersion = getAppModVersion();
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
            return require(`${vscode?.env?.root}/extensions/sapse.sap-ux-application-modeler-extension-${appModExtVersion}/node_modules/keytar`);
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


/**
 * Reads the list of extensions installed in vscode.
 *
 * @returns the version of sap-ux-application-modeler-extension
 */
async function getAppModVersion(log?: Logger): Promise<string> {
    let extensionVersions = await getExtensionsVSCode();    
    let appModExtVersion = extensionVersions['sap-ux-application-modeler-extension'].version;
    return appModExtVersion
}

/**
 * Reads the list of extensions installed in vscode.
 *
 * @returns list of extension ids and versions
 */
async function getExtensionsVSCode(): Promise<{ [id: string]: { version: string } }> {
    const isInsiders = await checkIsInsiders();
    const output = await spawnCommand(isInsiders ? 'code-insiders' : 'code', ['--list-extensions', '--show-versions']);
    const versions = output
        .split('\n')
        .filter((ext) => ext.startsWith('SAP'))
        .reduce((returnObject, current) => {
            const index = current.indexOf('.');
            const idVersion = current.slice(index + 1);
            const [id, version] = idVersion.split('@');
            returnObject[id] = {
                version
            };
            return returnObject;
        }, {});
    return versions;
}

/**
 * Platform specific config for spawn to execute commands
 */
const spawnOptions = /^win/.test(process.platform)
    ? { windowsVerbatimArguments: true, shell: true, cwd: os.homedir() }
    : { cwd: os.homedir() };

/**
 * Execute a command with arguments.
 *
 * @param command - command
 * @param commandArgs - command arguments, like --global
 * @returns output
 */
export function spawnCommand(command: string, commandArgs: string[]): Promise<string> {
    return new Promise((resolve, reject) => {
        let output = '';
        const spawnProcess = spawn(command, commandArgs, spawnOptions);
        spawnProcess.stdout.on('data', (data) => {
            const newData = data.toString();
            output += newData;
        });
        spawnProcess.stderr.on('data', (data) => {
            const newData = data.toString();
            output += newData;
        });
        spawnProcess.on('exit', () => {
            resolve(output);
        });
        spawnProcess.on('error', (error) => {
            reject(error);
        });
    });
}

/**
 * Internal function to check if the module is being ran in VSCode Insiders.
 *
 * @returns boolean - if ran in insiders
 */
async function checkIsInsiders(): Promise<boolean> {
    let isInsiders = false;
    const processEnvProp = process.env['VSCODE_IPC_HOOK'] ?? process.env['TERM_PROGRAM_VERSION'];
    if (processEnvProp?.includes('insider')) {
        isInsiders = true;
    }
    return isInsiders;
}