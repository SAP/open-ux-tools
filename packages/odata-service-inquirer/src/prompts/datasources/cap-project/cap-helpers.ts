import type { CSN, ServiceInfo, CdsVersionInfo } from '@sap-ux/project-access';
import {
    findCapProjects,
    getCapCustomPaths,
    getCapModelAndServices,
    getCdsRoots,
    readCapServiceMetadataEdmx
} from '@sap-ux/project-access';
import { basename, isAbsolute, relative, resolve } from 'node:path';
import { t } from '../../../i18n';
import type { CapServiceChoice } from '../../../types';
import type { CapService } from '@sap-ux/cap-config-writer';
import LoggerHelper from '../../logger-helper';
import { errorHandler } from '../../prompt-helpers';
import type { CapProjectChoice, CapProjectPaths, CapProjectRootPath } from './types';
import { ERROR_TYPE } from '@sap-ux/inquirer-common';
import { realpath } from 'node:fs/promises';
import { getHostEnvironment, hostEnvironment } from '@sap-ux/fiori-generator-shared';

export const enterCapPathChoiceValue = 'enterCapPath';

/**
 * Resolve relative paths to absolute paths for CLI environment.
 *
 * @param projectPath - The path to resolve
 * @returns The resolved absolute path, or the original path if already absolute or not in CLI
 */
export function resolveRelativeCliPath(projectPath: string): string {
    const isCli = getHostEnvironment() === hostEnvironment.cli;
    if (isCli && !isAbsolute(projectPath)) {
        return resolve(process.cwd(), projectPath.trim());
    }
    return projectPath;
}

/**
 * Search for CAP projects in the specified paths.
 * Resolves relative paths to absolute paths before searching.
 *
 * @param paths - The paths used to search for CAP projects (can be relative or absolute)
 * @returns The CAP project paths and the number of folders with the same name
 */
async function getCapProjectPaths(
    paths: string[]
): Promise<{ capProjectPaths: CapProjectRootPath[]; folderCounts: Map<string, number> }> {
    // Resolve relative paths to absolute paths
    const absolutePaths = paths.map((path) => (isAbsolute(path) ? path : resolveRelativeCliPath(path)));
    const capProjectRoots = await findCapProjects({ wsFolders: absolutePaths });
    const capRootPaths: CapProjectRootPath[] = [];
    // Keep track of duplicate folder names to append the path to the name when displaying the choices
    const folderNameCount = new Map<string, number>();

    for (const root of capProjectRoots) {
        const folderName = basename(root);
        // On Windows the path may have been returned with a different casing.
        // Use `realPath` to generate the same casing as used by cds compiler facade.
        capRootPaths.push({ folderName, path: process.platform === 'win32' ? await realpath(root) : root });
        folderNameCount.set(folderName, (folderNameCount.get(folderName) ?? 0) + 1);
    }
    capRootPaths.sort((a, b) => a.folderName.localeCompare(b.folderName));
    return {
        capProjectPaths: capRootPaths,
        folderCounts: folderNameCount
    };
}

/**
 * Search for CAP projects in the specified paths and create prompt choices from the results.
 * The resulting choices will include an additional entry to enter a custom path.
 *
 * @param paths - The paths used to search for CAP projects
 * @param workspaceContext - Optional workspace context for auto-detection
 * @returns The CAP project prompt choices
 */
export async function getCapProjectChoices(paths: string[], searchSubFolders?: boolean): Promise<CapProjectChoice[]> {
    const { capProjectPaths, folderCounts } = await getCapProjectPaths(paths);
    const capChoices: CapProjectChoice[] = [];

    for (const capProjectPath of capProjectPaths) {
        const customCapPaths = await getCapCustomPaths(capProjectPath.path);
        const folderCount = folderCounts.get(capProjectPath.folderName) ?? 1;

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
 * Create a cap service choice from the service info.
 *
 * @param capModel - The cap model
 * @param serviceInfo - The service info
 * @param projectPath - The project path
 * @param appPath - The app path
 * @param cdsVersionInfo - The cds version info
 * @returns a cap service choice
 */
function createCapServiceChoice(
    capModel: CSN,
    serviceInfo: ServiceInfo,
    projectPath: string,
    appPath: string,
    cdsVersionInfo: CdsVersionInfo
): CapServiceChoice | undefined {
    const srvDef = capModel.definitions?.[serviceInfo.name];

    const serviceFilePath = (srvDef as any)?.$location?.file;
    LoggerHelper.logger.debug(`Cap service def: ${JSON.stringify(srvDef)}`);
    LoggerHelper.logger.debug(`Cap service def $location.file: ${JSON.stringify(serviceFilePath)}`);

    // Find the source path for the service definition file, we cannot resolve '../' path segments as
    // we have no idea where the cwd was when the cds compiler was run. Remove the '../' or '..\\' path segments so the relative path can
    // be resolved against the project root. This is a workaround until cds provides the correct path in the service info.
    const absServicePath = capModel.$sources?.find(
        (source) => source.indexOf(serviceFilePath.replace(/\.\.\\\\|\.\.\\|\.\.\//g, '')) > -1
    );
    LoggerHelper.logger.debug(`Source file path for service: ${serviceInfo.name}: ${absServicePath}`);

    if (absServicePath && isAbsolute(absServicePath)) {
        let serviceCdsFilePath = relative(projectPath, absServicePath);
        // remove the file extension
        serviceCdsFilePath = serviceCdsFilePath.substring(0, serviceCdsFilePath.lastIndexOf('.cds'));
        LoggerHelper.logger.debug(`serviceCdsFilePath: ${serviceCdsFilePath}`);

        const capService: CapService = {
            serviceName: serviceInfo.name,
            urlPath: !serviceInfo.urlPath.startsWith('/') ? `/${serviceInfo.urlPath}` : serviceInfo.urlPath,
            serviceCdsPath: serviceCdsFilePath,
            projectPath,
            appPath,
            // Assume Node.js if not defined
            capType: serviceInfo.runtime ? (serviceInfo.runtime as 'Node.js' | 'Java') : 'Node.js',
            cdsVersionInfo
        };
        return {
            name: capService.capType
                ? capService.serviceName + ' (' + capService.capType + ')'
                : capService.serviceName,
            value: capService
        };
    }
    LoggerHelper.logger.error(
        `Path for cds service file : ${serviceInfo.name} not found in cds model, $sources, or is not an absolute path`
    );
    return undefined;
}

/**
 * Gets the CAP service choices for the specified CAP project paths.
 *
 * @param capProjectPaths - The CAP project paths
 * @returns The CAP project service choices
 */
export async function getCapServiceChoices(capProjectPaths: CapProjectPaths): Promise<CapServiceChoice[]> {
    LoggerHelper.logger.debug(`getCapServiceChoices: ${JSON.stringify(capProjectPaths)}`);

    if (!capProjectPaths) {
        return [];
    }

    try {
        let capServices = [];
        let capModel: CSN;
        let capCdsVersionInfo: CdsVersionInfo;

        try {
            // Workaround for missing clear cache functionality in `getCapModelAnsdServices`, this resets the cds.resolve.cache.
            // If this is not done then errors can be thrown where out-of-processs changes to the files system have occurred
            await getCdsRoots(capProjectPaths.path, true);
            // Load the CAP model and services
            const { model, services, cdsVersionInfo } = await getCapModelAndServices({
                projectRoot: capProjectPaths.path,
                logger: LoggerHelper.logger
            });
            capServices = services;
            capModel = model;
            capCdsVersionInfo = cdsVersionInfo;
        } catch (error) {
            const capLoadErrorMsg = t('errors.capModelAndServicesLoadError', { error: error?.message });
            errorHandler.logErrorMsgs(ERROR_TYPE.UNKNOWN, capLoadErrorMsg);
            LoggerHelper.logger.error(capLoadErrorMsg);
            return [];
        }
        // We need the relative service definitions file paths (.cds) for the generated annotation file
        const projectPath = capProjectPaths.path;
        const appPath = capProjectPaths.app;

        LoggerHelper.logger.debug(`CDS model source paths: ${JSON.stringify(capModel.$sources)}`);
        const serviceChoices = capServices
            .map((service) => {
                return createCapServiceChoice(capModel, service, projectPath, appPath, capCdsVersionInfo);
            })
            .filter((service) => !!service) as CapServiceChoice[]; // filter undefined entries
        return serviceChoices ?? [];
    } catch (err) {
        errorHandler.logErrorMsgs(err);
    }
    return [];
}

/**
 * Get the edmx metadata for the CAP service.
 *
 * @param capService - The CAP service
 * @returns The edmx metadata for the CAP service
 */
export async function getCapEdmx(capService: CapService): Promise<string | undefined> {
    if (!capService.urlPath) {
        const errorMsg = t('errors.capServiceUrlPathNotDefined', { serviceName: capService.serviceName });
        errorHandler.logErrorMsgs(errorMsg);
        return undefined;
    }
    try {
        return await readCapServiceMetadataEdmx(capService.projectPath, capService.urlPath, 'v4');
    } catch (error) {
        errorHandler.logErrorMsgs(t('errors.cannotReadCapServiceMetadata', { serviceName: capService.serviceName }));
        LoggerHelper.logger.error(error);
    }
}
