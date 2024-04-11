import type { CSN, CapCustomPaths, Package } from '@sap-ux/project-access';
import {
    findCapProjects,
    getCapCustomPaths,
    getCapModelAndServices,
    isCapJavaProject,
    isCapNodeJsProject,
    readCapServiceMetadataEdmx
} from '@sap-ux/project-access';
import { readFile } from 'fs/promises';
import { basename, isAbsolute, join, relative } from 'path';
import { coerce, lt } from 'semver';
import { t } from '../../../i18n';
import type {
    CapProjectChoice,
    CapProjectPaths,
    CapProjectRootPath,
    CapService,
    CapServiceChoice
} from '../../../types';
import LoggerHelper from '../../logger-helper';
import { errorHandler } from '../../prompt-helpers';

export const enterCapPathChoiceValue = 'enterCapPath';

/**
 * Temporary function to check the package.json for the cds version and determine if it is pre v7.
 * Should be removed when `getCapModelAndServices` returns the correct relative service path for the specific cds version in use by the project.
 *
 * @param projectRoot
 * @param capCustomPaths
 * @returns
 */
async function _checkIfCDSPreV7(projectRoot: string, capCustomPaths: CapCustomPaths): Promise<boolean> {
    try {
        const packageJsonPath = join(projectRoot, 'package.json');
        const packageJson: Package = JSON.parse(await readFile(packageJsonPath, 'utf-8')) ?? {};
        const isCAPNodeJS =
            (await isCapNodeJsProject(packageJson)) && !(await isCapJavaProject(projectRoot, capCustomPaths));
        const cdsV7 = '7.0.0';
        return lt(coerce(packageJson?.dependencies?.['@sap/cds']) ?? cdsV7, cdsV7) && isCAPNodeJS;
    } catch {
        return false;
    }
}

/**
 * Search for CAP projects in the specified paths.
 *
 * @param paths - The paths used to search for CAP projects
 * @returns The CAP project paths and the number of folders with the same name
 */
async function getCapWorkspaceFolders(
    paths: string[]
): Promise<{ capProjectPaths: CapProjectRootPath[]; folderCounts: Map<string, number> }> {
    const capProjectRoots = await findCapProjects({ wsFolders: paths });
    const capRootPaths: CapProjectRootPath[] = [];
    // Keep track of duplicate folder names to append the path to the name when displaying the choices
    const folderNameCount = new Map<string, number>();

    for (const root of capProjectRoots) {
        const folderName = basename(root);
        capRootPaths.push({ folderName, path: root });
        folderNameCount.set(folderName, (folderNameCount.get(folderName) || 0) + 1);
    }
    return {
        capProjectPaths: capRootPaths.sort((a, b) => a.folderName.localeCompare(b.folderName)),
        folderCounts: folderNameCount
    };
}

/**
 * Search for CAP projects in the specified paths and create prompt choices from the results.
 * The resulting choices will include an additional entry to enter a custom path.
 *
 * @param paths - The paths used to search for CAP projects
 * @returns The CAP project prompt choices
 */
export async function getCapWorkspaceChoices(paths: string[]): Promise<CapProjectChoice[]> {
    const { capProjectPaths, folderCounts } = await getCapWorkspaceFolders(paths);

    const capChoices: CapProjectChoice[] = [];

    for await (const capProjectPath of capProjectPaths) {
        const customCapPaths = await getCapCustomPaths(capProjectPath.path);
        const folderCount = folderCounts.get(capProjectPath.folderName) || 1;

        capChoices.push({
            name: `${capProjectPath.folderName}${folderCount > 1 ? ' (' + capProjectPath.path + ')' : ''}`,
            value: Object.assign(capProjectPath, customCapPaths)
        });
    }

    return [
        ...capChoices,
        {
            name: t('prompts.capProject.enterCapPathChoiceName'),
            value: enterCapPathChoiceValue
        }
    ];
}

/**
 * Sanitize the URL path by ensuring it starts with a '/'.
 *
 * @param urlPath - The URL path to sanitize
 * @returns The sanitized URL path
 */
function sanitizeUrlPath(urlPath: string): string {
    if (!urlPath.startsWith('/')) {
        return `/${urlPath}`;
    }
    return urlPath;
}

/**
 * Gets the CAP service choices for the specified CAP project paths.
 *
 * @param capProjectPaths - The CAP project paths
 * @returns The CAP project service choices
 */
// todo: Memoize this function, if the same CAP project is selected multiple times, the same CAP choices will be returned.
export async function getCapServiceChoices(capProjectPaths: CapProjectPaths): Promise<CapServiceChoice[]> {
    LoggerHelper.logger.debug(`getCapServiceChoices: ${JSON.stringify(capProjectPaths)}`);

    if (!capProjectPaths) {
        return [];
    }

    try {
        let capServices = [];
        let capModel: CSN;

        try {
            const { model, services } = await getCapModelAndServices({
                projectRoot: capProjectPaths.path,
                logger: LoggerHelper.logger
            });
            capServices = services;
            capModel = model;
        } catch (error) {
            if (error.code === 'MODEL_NOT_FOUND') {
                errorHandler.logErrorMsgs(t('ERROR_USER_CDS_MODEL_NOT_FOUND'));
            } else {
                errorHandler.logErrorMsgs(t('ERROR_CDS_COMPILE', { error: error?.message }));
            }
            LoggerHelper.logger.error(t('ERROR_CDS_COMPILE', { error: error?.message }));
            return [];
        }
        // TODO: request cds to add relative service file location to the serviceinfo, this would avoid this effort
        // We need the relative service definitions file paths (.cds) for the generated annotation file
        const projectPath = capProjectPaths.path;
        const appPath = capProjectPaths.app;
        // todo: remove as `getCapModelAndServices` should return the correct relative path for the specific cds version in use by the project
        // const preCdsV7 = await checkIfCDSPreV7(capProjectPaths.path, capProjectPaths);
        LoggerHelper.logger.debug(`CDS model source paths: ${JSON.stringify(capModel.$sources)}`);
        const serviceChoices = capServices
            .map((service) => {
                const srvDef = capModel.definitions?.[service.name];
                /* eslint-disable-next-line  @typescript-eslint/no-explicit-any */
                const serviceFilePath = (srvDef as any)?.$location?.file;
                LoggerHelper.logger.debug(`Cap service def: ${JSON.stringify(srvDef)}`);
                LoggerHelper.logger.debug(`Cap service def $location.file: ${JSON.stringify(serviceFilePath)}`);

                // Find the source path for the service definition file, we cannot resolve '../' path segments as
                // we have no idea where the cwd was when the cds compiler was run. Remove the '../' or '..\\' path segments so the relative path can
                // be resolved against the project root. This is a workaround until cds provides the correct path in the service info.
                const absServicePath = capModel.$sources?.find(
                    (source) => source.indexOf(serviceFilePath.replace(/\.\.\\\\|\.\.\\|\.\.\//g, '')) > -1
                );
                LoggerHelper.logger.debug(`Source file path for service: ${service.name}: ${absServicePath}`);

                if (absServicePath && isAbsolute(absServicePath)) {
                    let serviceCdsFilePath = relative(projectPath, absServicePath);
                    // remove the file extension
                    serviceCdsFilePath = removeLastMatch(serviceCdsFilePath, '.cds');
                    LoggerHelper.logger.debug(`serviceCdsFilePath: ${serviceCdsFilePath}`);

                    const capService: CapService = {
                        serviceName: service.name,
                        urlPath: sanitizeUrlPath(service.urlPath),
                        serviceCdsPath: serviceCdsFilePath,
                        projectPath,
                        appPath,
                        // Assume Node.js if not defined
                        capType: service.runtime ? (service.runtime as 'Node.js' | 'Java') : 'Node.js'
                    };
                    return {
                        name: capService.capType
                            ? capService.serviceName + ' (' + capService.capType + ')'
                            : capService.serviceName,
                        value: capService
                    };
                }
                LoggerHelper.logger.error(
                    `Path for cds service file : ${service.name} not found in cds model, $sources, or is not an absolute path`
                );
                return undefined;
            })
            .filter((service) => !!service) as CapServiceChoice[];
        return serviceChoices ?? [];
    } catch (err) {
        errorHandler.logErrorMsgs(err);
    }
    return [];
}

/**
 * Remove the last found match from a string.
 *
 * @param value - The value to remove the last match from
 * @param match - The match to remove
 * @returns The value with the last match removed
 */
function removeLastMatch(value: string, match: string): string {
    if (match === undefined) {
        return value;
    }
    const index = value.lastIndexOf(match);
    if (index === -1) {
        return value;
    }
    return value.slice(0, index);
}

/**
 * Get the edmx metadata for the CAP service.
 *
 * @param capService - The CAP service
 * @returns The edmx metadata for the CAP service
 */
export async function getCapEdmx(capService: CapService): Promise<string | undefined> {
    if (!capService.urlPath) {
        LoggerHelper.logger.warn(t('errors.capServiceUrlPathNotDefined', { serviceName: capService.serviceName }));
        return undefined;
    }
    try {
        // const serviceUrlPath = this.capServiceSanitizeUrls?.[serviceName]?.urlPath ?? sanitizedUrlPath;
        return await readCapServiceMetadataEdmx(capService.projectPath, capService.urlPath, 'v4');
    } catch (err) {
        errorHandler.logErrorMsgs(err);
    }
}
