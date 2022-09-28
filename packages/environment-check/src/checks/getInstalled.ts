import { existsSync, promises, readdirSync } from 'fs';
import { t } from '../i18n';
import { join } from 'path';
import { spawnCommand, npmCommand } from '../command';
import { Extensions, NpmModules } from '../types';
import { isAppStudio } from '@sap-ux/btp-utils';

const pluginsDirBAS = join('/extbin/plugins');
const globalNpmBAS = join('/extbin/npm/globals/lib');

/**
 * Checks if vsix/extension is required for results.
 *
 * @param vsixFile - file to be checked
 * @returns boolean if file is required
 */
function _isExtensionRequired(vsixFile: string): boolean {
    for (const reqExt of Object.values(Extensions)) {
        if (vsixFile.includes(reqExt)) {
            return true;
        }
    }
    return false;
}

/**
 * Reads the list of extensions installed in BAS.
 *
 * @returns list of extension ids and versions
 */
async function _getExtensionsBAS(): Promise<{ [id: string]: { version: string } }> {
    const files = readdirSync(pluginsDirBAS);
    const versions = files
        .filter((vsixFile) => _isExtensionRequired(vsixFile))
        .reduce((returnObject, current) => {
            const lastIndex = current.lastIndexOf('-');
            const id = current.slice(0, lastIndex);
            const version = current.slice(lastIndex + 1).split('.vsix')[0];
            returnObject[id] = {
                version
            };
            return returnObject;
        }, {});
    return versions;
}

/**
 * Reads the list of extensions installed in vscode.
 *
 * @returns list of extension ids and versions
 */
async function _getExtensionsVSCode(): Promise<{ [id: string]: { version: string } }> {
    const output = await spawnCommand('code', ['--list-extensions', '--show-versions']);
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
 * Reads the list of extensions installed and returns the id and version.
 *
 * @returns list of extension ids and versions
 */
export async function getInstalledExtensions(): Promise<{ [id: string]: { version: string } }> {
    let versions;
    try {
        if (isAppStudio()) {
            versions = await _getExtensionsBAS();
        } else {
            versions = await _getExtensionsVSCode();
        }
    } catch (e) {
        console.error(t('error.retrievingExtensions', { error: e.message }));
    }
    return versions;
}

/**
 * Read the version of the cloud foundry CLI.
 *
 * @returns version
 */
export async function getCFCliToolVersion(): Promise<string> {
    let cfVersion: string;
    try {
        const version = await spawnCommand(NpmModules.CloudCliTools, ['-v']);
        cfVersion = version.replace(/\s/g, '').split('version')[1].slice(0, 5);
    } catch (error) {
        return t('info.notInstalledOrNotFound');
    }
    return cfVersion;
}

/**
 * Read the version of the fiori generator in BAS.
 *
 * @returns version
 */
async function _getFioriGenBAS(): Promise<string> {
    let version;
    const pathToPackageJson = join(globalNpmBAS, 'package.json');
    if (existsSync(pathToPackageJson)) {
        const dependencies = JSON.parse(await promises.readFile(pathToPackageJson, 'utf-8')).dependencies;
        version = dependencies[NpmModules.FioriGenerator];
    } else {
        version = t('info.notInstalledOrNotFound');
    }
    return version;
}

/**
 * Read the version of the fiori generator in VSCode.
 *
 * @returns version
 */
async function _getFioriGenVSCode(): Promise<string> {
    let version;
    let globalNpmPath = await spawnCommand(npmCommand, ['root', '-g']);
    globalNpmPath = globalNpmPath.trim();
    const pathToPackageJson = join(globalNpmPath, NpmModules.FioriGenerator, 'package.json');
    if (existsSync(pathToPackageJson)) {
        version = JSON.parse(await promises.readFile(pathToPackageJson, 'utf-8')).version;
    } else {
        version = t('info.notInstalledOrNotFound');
    }
    return version;
}

/**
 * Read the version of the fiori generator.
 *
 * @returns version
 */
export async function getFioriGenVersion(): Promise<string> {
    let fioriGenVersion: string;
    try {
        if (isAppStudio()) {
            fioriGenVersion = await _getFioriGenBAS();
        } else {
            fioriGenVersion = await _getFioriGenVSCode();
        }
    } catch {
        return t('info.notInstalledOrNotFound');
    }
    return fioriGenVersion;
}
