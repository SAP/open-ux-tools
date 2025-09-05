import { CustomExtensionType, DirName } from '@sap/ux-specification/dist/types/src';
import type { ControllerExtensionPageType } from '@sap/ux-specification/dist/types/src';
import { SapuxFtfsFileIO } from '../../../page-editor-api';
import type {
    ExecuteFunctionalitiesInput,
    ExecuteFunctionalityOutput,
    FunctionalityHandlers,
    GetFunctionalityDetailsInput,
    GetFunctionalityDetailsOutput,
    Parameter
} from '../../../types';
import { getDefaultExtensionFolder, resolveApplication } from '../../utils';
import { join } from 'path';
import { CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY_ID } from '../../../constant';

/**
 * Retrieves the parameter definitions for creating a controller extension.
 *
 * @returns An object containing parameter definitions for pageType, pageId, and controllerName.
 */
function getParameters(): { pageType: Parameter; pageId: Parameter; controllerName: Parameter } {
    return {
        pageType: {
            id: 'pageType',
            type: 'string',
            description: 'Type of page',
            options: ['ListReport', 'ObjectPage'],
            defaultValue: 'ListReport',
            required: true
        },
        pageId: {
            id: 'pageId',
            type: 'string',
            description: 'If controller extenison should be assigned for specific page, then pageId should be provided'
        },
        controllerName: {
            id: 'controllerName',
            type: 'string',
            description: 'Name of new controller extension file',
            required: true
        }
    };
}

export const CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY: GetFunctionalityDetailsOutput = {
    functionalityId: CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY_ID,
    name: 'Add new controller extension by creating javascript or typescript file and updates manifest.json with entry',
    description:
        'Add new controller extension by creating javascript or typescript file and updates manifest.json with entry. Controller extensions allow users to extensiate default behaviour with custom controllers code.',
    parameters: Object.values(getParameters())
};

/**
 * Retrieves the details of the create controller extension functionality.
 *
 * @param input - The input parameters for getting functionality details.
 * @returns A promise that resolves to the functionality details output.
 */
async function getFunctionalityDetails(input: GetFunctionalityDetailsInput): Promise<GetFunctionalityDetailsOutput> {
    const defaultParameters = getParameters();
    // Populate options for pageId
    const project = await resolveApplication(input.appPath);
    let pageIds: string[] = [];
    if (project?.applicationAccess) {
        const ftfsFileIo = new SapuxFtfsFileIO(project.applicationAccess);
        const appData = await ftfsFileIo.readApp();
        pageIds = Object.keys(appData.config.pages ?? {});
    }
    const parameters: Parameter[] = [defaultParameters.pageType, defaultParameters.controllerName];
    if (pageIds.length) {
        parameters.push({
            ...defaultParameters.pageId,
            options: pageIds
        });
    }

    return {
        ...CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY,
        parameters
    };
}

/**
 * Executes the create controller extension functionality.
 *
 * @param input - The input parameters for executing the functionality.
 * @returns A promise that resolves to the execution output.
 */
async function executeFunctionality(input: ExecuteFunctionalitiesInput): Promise<ExecuteFunctionalityOutput> {
    const { parameters, appPath } = input;
    const { pageId, controllerName, pageType } = parameters;
    const project = await resolveApplication(appPath);
    let changes: string[] = [];
    if (!controllerName || typeof controllerName !== 'string') {
        throw new Error('Missing or invalid parameter "controllerName"');
    }
    if (project?.applicationAccess) {
        const { appId, root } = project;
        const ftfsFileIo = new SapuxFtfsFileIO(project.applicationAccess);
        const exensionPageType = await retrieveControllerExtensionPageType(ftfsFileIo, pageType, pageId);

        if (exensionPageType && typeof exensionPageType === 'string') {
            const extension = {
                pageId: typeof pageId === 'string' ? pageId : undefined,
                pageType: exensionPageType
            };

            changes = await ftfsFileIo.writeFPM({
                customExtension: CustomExtensionType.ControllerExtension,
                basePath: join(root, appId),
                data: {
                    extension,
                    folder: getDefaultExtensionFolder(DirName.Controller),
                    name: controllerName
                }
            });
        }
    }

    return {
        functionalityId: input.functionalityId,
        status: changes.length ? 'success' : 'skipped',
        message: changes.length ? 'Controller extension is created' : 'Controller extension is not created',
        parameters: parameters,
        appPath: appPath,
        changes,
        timestamp: new Date().toISOString()
    };
}

/**
 * Retrieves the controller extension page type for a given page or pageType.
 *
 * @param appReader - File I/O handler used to read the SAP Fiori application data.
 * @param pageType - Optional page type value..
 * @param pageId - Optional page identifier used to look up the page type if `pageType` is not explicitly provided.
 * @returns A promise resolving to the controller extension page type, or `undefined` if it cannot be determined.
 */
async function retrieveControllerExtensionPageType(
    appReader: SapuxFtfsFileIO,
    pageType?: unknown,
    pageId?: unknown
): Promise<ControllerExtensionPageType | undefined> {
    if (!pageType && typeof pageId === 'string') {
        // Find pageType for passed page id
        const appData = await appReader.readApp();
        pageType = appData.config.pages?.[pageId]?.pageType as string;
    }
    if (pageType && typeof pageType === 'string') {
        return pageType as ControllerExtensionPageType;
    }
}

export const createControllerExtensionHandlers: FunctionalityHandlers = {
    getFunctionalityDetails,
    executeFunctionality
};
