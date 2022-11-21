import { existsSync, promises, readdirSync } from 'fs';
import { t } from '../i18n';
import { join } from 'path';
import { spawnCommand, npmCommand } from '../command';
import { Extensions, NpmModules } from '../types';
import type { ILogger } from '../types';
import { isAppStudio } from '@sap-ux/btp-utils';

const pluginsDirBAS = join('/extbin/plugins');
const globalNodeModulesBAS = join('/extbin/npm/globals/lib/node_modules');

/**
 * Checks if vsix/extension is required for results.
 *
 * @param vsixFile - file to be checked
 * @returns boolean if file is required
 */
function isExtensionRequired(vsixFile: string): boolean {
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
async function getExtensionsBAS(): Promise<{ [id: string]: { version: string } }> {
    const files = readdirSync(pluginsDirBAS);
    const versions = files
        .filter((vsixFile) => isExtensionRequired(vsixFile))
        .reduce((returnObject, current) => {
            const idVersion = current.split('.vsix')[0];
            const firstNumeric = idVersion.search(/-\d/);
            const [id, version] = [idVersion.slice(0, firstNumeric), idVersion.slice(firstNumeric + 1)];
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
async function getExtensionsVSCode(): Promise<{ [id: string]: { version: string } }> {
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
 * @param logger - logger to report errors
 * @returns list of extension ids and versions
 */
export async function getInstalledExtensions(logger?: ILogger): Promise<{ [id: string]: { version: string } }> {
    let versions;
    try {
        if (isAppStudio()) {
            versions = await getExtensionsBAS();
        } else {
            versions = await getExtensionsVSCode();
        }
    } catch (e) {
        logger?.error(t('error.retrievingExtensions', { error: e.message }));
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
 * Get the path of the fiori generator.
 *
 * @returns version
 */
async function getFioriGenGlobalPath(): Promise<string> {
    let fioriGenPath;
    let globalNpmPath = await spawnCommand(npmCommand, ['root', '-g']);

    // default version of npm on BAS (8.11.0) has a bug https://github.com/npm/cli/issues/5228
    // can be removed when default npm version is upgraded
    if (globalNpmPath.includes('WARN') && globalNpmPath.includes('--location=global')) {
        globalNpmPath = await spawnCommand(npmCommand, ['root', '--location=global']);
    }

    globalNpmPath = globalNpmPath.trim();
    if (globalNpmPath) {
        fioriGenPath = join(globalNpmPath, NpmModules.FioriGenerator);
    }
    return fioriGenPath;
}

/**
 * Read the version of the fiori generator.
 *
 * @returns version
 */
export async function getFioriGenVersion(): Promise<string> {
    let fioriGenVersion = t('info.notInstalledOrNotFound');
    const genSearchPaths = [];
    try {
        const fioriGenPath = await getFioriGenGlobalPath();
        genSearchPaths.push(fioriGenPath);

        if (isAppStudio()) {
            const fioriGenPathBAS = join(globalNodeModulesBAS, NpmModules.FioriGenerator);
            genSearchPaths.push(fioriGenPathBAS);
        }

        for (const genPath of genSearchPaths) {
            const fioriGenPkgJson = join(genPath, 'package.json');
            if (existsSync(fioriGenPkgJson)) {
                const version = JSON.parse(await promises.readFile(fioriGenPkgJson, 'utf-8')).version;
                if (version) {
                    fioriGenVersion = version;
                    break;
                }
            }
        }
    } catch {
        return t('info.notInstalledOrNotFound');
    }
    return fioriGenVersion;
}

/**
 * Returns the versions of node.js modules.
 *
 * @param logger - logger to report errors
 * @returns modules and versions
 */
export async function getProcessVersions(logger?: ILogger): Promise<NodeJS.ProcessVersions> {
    try {
        const output = await spawnCommand('node', ['-p', 'JSON.stringify(process.versions)']);
        return JSON.parse(output);
    } catch (e) {
        logger?.error(t('error.retrievingProcessVersions', { error: e.message }));
        return {} as NodeJS.ProcessVersions;
    }
}
