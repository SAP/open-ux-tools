import { existsSync, promises } from 'fs';
import { t } from '../i18n';
import { join } from 'path';
import { spawnCommand, npmCommand } from '../command';

/**
 * Reads the list of extensions installed in vscode.
 *
 * @returns list of extension ids
 */
export const getInstalledExtensions = async (): Promise<{ [id: string]: { version: string } }> => {
    const output = await spawnCommand('code', ['--list-extensions', '--show-versions']);
    const versions = output
        .split('\n')
        .filter((ext) => ext.startsWith('SAP'))
        .reduce((returnObject, current) => {
            const [id, version] = current.split('@');
            returnObject[id] = {
                version
            };
            return returnObject;
        }, {});
    return versions;
};

/**
 * Read the version of the cloud foundry CLI.
 *
 * @param module - module id
 * @returns version
 */
export const getCFCliToolVersion = async (module: string): Promise<string> => {
    let cfVersion: string;
    try {
        const ouput = await spawnCommand(module, ['-v']);
        cfVersion = ouput.replace(/\s/g, '').split('version')[1].slice(0, 5);
    } catch (error) {
        return t('info.notInstalled');
    }
    return cfVersion;
};

/**
 * Read the version of the fiori generator.
 *
 * @param module - module id
 * @returns version
 */
export const getFioriGenVersion = async (module: string): Promise<string> => {
    let fioriGenVersion: string;
    try {
        let globalNpmPath = await spawnCommand(npmCommand, ['root', '-g']);
        globalNpmPath = globalNpmPath.trim();
        const pathToPackageJson = join(globalNpmPath, module, 'package.json');
        if (existsSync(pathToPackageJson)) {
            fioriGenVersion = JSON.parse(await promises.readFile(pathToPackageJson, 'utf-8')).version;
        } else {
            fioriGenVersion = t('info.notInstalled');
        }
    } catch {
        return t('info.notInstalled');
    }
    return fioriGenVersion;
};
