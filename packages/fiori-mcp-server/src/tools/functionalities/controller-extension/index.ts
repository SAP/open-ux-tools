import { CustomExtensionType, DirName } from '@sap/ux-specification/dist/types/src';
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
    id: 'create-controller-extension',
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
    const project = await resolveApplication(appPath);
    let changes: string[] = [];
    if (project?.applicationAccess) {
        const { appId, root } = project;
        const { pageType, pageId, controllerName } = parameters;
        const extension = {
            pageId,
            pageType
        };
        const ftfsFileIo = new SapuxFtfsFileIO(project.applicationAccess);
        if (pageId && !pageType) {
            // Find pageType for passed page id
            const appData = await ftfsFileIo.readApp();
            extension.pageType = appData.config.pages?.[pageId]?.pageType;
        }

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

export const createControllerExtensionHandlers: FunctionalityHandlers = {
    getFunctionalityDetails,
    executeFunctionality
};
