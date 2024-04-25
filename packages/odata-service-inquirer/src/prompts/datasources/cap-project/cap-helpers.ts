import type { CSN } from '@sap-ux/project-access';
import {
    findCapProjects,
    getCapCustomPaths,
    getCapModelAndServices,
    getCdsRoots,
    readCapServiceMetadataEdmx
} from '@sap-ux/project-access';
import { basename, isAbsolute, relative } from 'path';
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
 * Search for CAP projects in the specified paths.
 *
 * @param paths - The paths used to search for CAP projects
 * @returns The CAP project paths and the number of folders with the same name
 */
async function getCapProjectPaths(
    paths: string[]
): Promise<{ capProjectPaths: CapProjectRootPath[]; folderCounts: Map<string, number> }> {
    const capProjectRoots = await findCapProjects({ wsFolders: paths });
    const capRootPaths: CapProjectRootPath[] = [];
    // Keep track of duplicate folder names to append the path to the name when displaying the choices
    const folderNameCount = new Map<string, number>();

    for (const root of capProjectRoots) {
        const folderName = basename(root);
        capRootPaths.push({ folderName, path: root });
        folderNameCount.set(folderName, (folderNameCount.get(folderName) ?? 0) + 1);
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
export async function getCapProjectChoices(paths: string[]): Promise<CapProjectChoice[]> {
    const { capProjectPaths, folderCounts } = await getCapProjectPaths(paths);

    const capChoices: CapProjectChoice[] = [];

    for await (const capProjectPath of capProjectPaths) {
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

// Remove when exported from `@sap-ux/project-access`
type ServiceInfo = Awaited<ReturnType<typeof getCapModelAndServices>>['services'][0];

/**
 * Create a cap service choice from the service info.
 *
 * @param capModel
 * @param serviceInfo
 * @param projectPath
 * @param appPath
 * @returns a cap service choice
 */
function createCapServiceChoice(
    capModel: CSN,
    serviceInfo: ServiceInfo,
    projectPath: string,
    appPath: string
): CapServiceChoice | undefined {
    const srvDef = capModel.definitions?.[serviceInfo.name];
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
            capType: serviceInfo.runtime ? (serviceInfo.runtime as 'Node.js' | 'Java') : 'Node.js'
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
    return;
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
            // Workaround for missing clear cache functionality in `getCapModelAnsdServices`, this resets the cds.resolve.cache.
            // If this is not done then errors can be thrown where out-of-processs changes to the files system have occurred
            await getCdsRoots(capProjectPaths.path, true);
            // Load the CAP model and services
            const { model, services } = await getCapModelAndServices({
                projectRoot: capProjectPaths.path,
                logger: LoggerHelper.logger
            });
            capServices = services;
            capModel = model;
        } catch (error) {
            errorHandler.logErrorMsgs(error);
            LoggerHelper.logger.error(t('errors.capModelAndServicesLoadError', { error: error?.message }));
            return [];
        }
        // We need the relative service definitions file paths (.cds) for the generated annotation file
        const projectPath = capProjectPaths.path;
        const appPath = capProjectPaths.app;

        LoggerHelper.logger.debug(`CDS model source paths: ${JSON.stringify(capModel.$sources)}`);
        const serviceChoices = capServices
            .map((service) => {
                return createCapServiceChoice(capModel, service, projectPath, appPath);
            })
            .filter((service) => !!service) as CapServiceChoice[]; // filter undefined entries
        return serviceChoices ?? [];
    } catch (err) {
        errorHandler.logErrorMsgs(err);
    }
    return [];
}

/**
 * Get the edmx metadata for the CAP service. Currently this will reload the model and services for each call.
 * It could be optimized if we cached the project cds, model and services from previous calls when populating the Cap service choices.
 *
 * @param capService - The CAP service
 * @returns The edmx metadata for the CAP service
 */
export async function getCapEdmx(capService: CapService): Promise<string | undefined> {
    try {
        return await readCapServiceMetadataEdmx(capService.projectPath, capService.urlPath, 'v4');
    } catch (error) {
        errorHandler.logErrorMsgs(t('errors.cannotReadCapServiceMetadata', { serviceName: capService.serviceName }));
        LoggerHelper.logger.error(error);
    }
}
