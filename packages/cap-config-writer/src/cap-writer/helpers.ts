import { DisableCacheParam, MIN_CDS_SCRIPT_VERSION, CapType } from '../types/capTypes';
import { platform } from 'os';
import path from 'path';
import { existsSync } from 'fs';
/*** temporary use - please remove export from  '@sap-ux/environment-check'*/
import { spawnCommand } from '@sap-ux/environment-check';
import { isAppStudio } from '@sap-ux/btp-utils';
import type { Logger } from '@sap-ux/logger';
import { t } from '../i18n';

/**
 * Generates launch text for a CAP project.
 *
 * @param {CapType} capType - The type of CAP project (JAVA or NODE_JS).
 * @param {any} projectName - The name of the project.
 * @param {string} appId - The ID of the application.
 * @param {boolean} [useNPMWorkspaces] - Indicates whether NPM workspaces are used.
 * @returns {string} The generated launch text.
 */
export function generateCapLaunchText(
    capType: CapType,
    projectName: any,
    appId: string,
    useNPMWorkspaces: boolean = false
): string {
    let capUrl;
    let mvnCommand = '';
    if (capType === CapType.JAVA) {
        mvnCommand = ' (```mvn spring-boot:run```)';
        capUrl = `http://localhost:8080/${projectName}/webapp/index.html`;
    } else if (capType === undefined || capType === CapType.NODE_JS) {
        capUrl = `http://localhost:4004/${getCAPAppUriPath(projectName, appId, useNPMWorkspaces)}/index.html`;
    }
    return `${t('TEXT_LAUNCH_CAP', { mvnCommand, capUrl })}`;
}

/**
 * Returns the URI path for the CAP app.
 *
 * @param {string} projectName - The name of the project.
 * @param {string} appId - The ID of the app.
 * @param {boolean} [useNPMWorkspaces] - Whether to use npm workspaces.
 * @returns {string} The URI path for the CAP app.
 */
function getCAPAppUriPath(projectName: string, appId: string, useNPMWorkspaces: boolean = false): string {
    // projects by default are served base on the folder name in the app/ folder
    // If the project uses npm workspaces (and specifically cds-plugin-ui5 ) then the project is served using the appId including namespace
    return useNPMWorkspaces ? appId : projectName + '/webapp';
}

/**
 * Retrieves the CDS task for the CAP app.
 *
 * @param {string} projectName - The name of the project.
 * @param {string} appId - The ID of the app.
 * @param {boolean} [useNPMWorkspaces] - Whether to use npm workspaces.
 * @returns {{ [x: string]: string }} The CDS task for the CAP app.
 */
export function getCDSTask(
    projectName: string,
    appId: string,
    useNPMWorkspaces: boolean = false
): { [x: string]: string } {
    return {
        [`watch-${projectName}`]: `cds watch --open ${getCAPAppUriPath(
            projectName,
            appId,
            useNPMWorkspaces
        )}/index.html?${DisableCacheParam}${useNPMWorkspaces ? ' --livereload false' : ''}`
    };
}

/**
 * Retrieves the globally installed version of @sap/cds-dk.
 * If a mock environment variable is set, it returns a predefined version.
 *
 * @param {Logger} [log] - The logger instance for logging messages.
 * @returns {Promise<string | void>} A Promise resolving to the installed version of @sap/cds-dk, or void if not found.
 */
export async function getGlobalInstalledCDSVersion(log?: Logger): Promise<string | void> {
    if (process.env.MOCK_CDS_DK_INSTALLED) {
        return MIN_CDS_SCRIPT_VERSION;
    }
    const npm = platform() === 'win32' ? 'npm.cmd' : 'npm';
    const cdsPackageName = '@sap/cds-dk';
    let cdsVersion;
    try {
        /*** temporary use - please remove spawnCommand export from  '@sap-ux/environment-check'*/
        cdsVersion = await spawnCommand(npm, ['ls', '-g', cdsPackageName, '--depth=0']);
    } catch (err) {
        // dont block the flow
    }
    if (!cdsVersion && isAppStudio() && process.env.NODE_PATH) {
        try {
            const foundCdsPath = process.env.NODE_PATH.split(':')
                .filter((nodModPath) => nodModPath.endsWith('node_modules'))
                .find((nodModPath) => existsSync(path.join(nodModPath, cdsPackageName)));

            if (foundCdsPath) {
                /*** temporary use - please remove spawnCommand export from  '@sap-ux/environment-check'*/
                cdsVersion = await spawnCommand(npm, ['ls', cdsPackageName, '--depth=0']);
                const logInfo = `OS checkCDSInstalled cdsVersion: ,
                    ${cdsVersion},
                    ${foundCdsPath},
                    'isAppStudio()',
                    ${isAppStudio()}`;
                log?.info(logInfo);
            }
        } catch (err) {
            // cds not found in known locations
        }
    }
    // Referenced regex express https://stackoverflow.com/questions/64880479/a-regex-for-npm-or-any-other-package-both-for-name-and-any-version-number
    return (cdsVersion as string)?.match(/@[~^]?([\dvx*]+(?:[-.](?:[\dx*]+|alpha|beta))*)/)?.[1];
}

/**
 * Converts a directory path to a POSIX-style path.
 * This function is temporary and should be removed once a common utility library package is available.
 *
 * @param {string} dirPath - The directory path to be converted.
 * @returns {string} The converted POSIX-style path.
 */
export function toPosixPath(dirPath: string): string {
    return path.normalize(dirPath).split(/[\\/]/g).join(path.posix.sep);
}
