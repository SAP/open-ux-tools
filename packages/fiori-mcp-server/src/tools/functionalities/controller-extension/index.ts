import { CustomExtensionType, DirName } from '@sap/ux-specification/dist/types/src';
import type { ControllerExtensionPageType } from '@sap/ux-specification/dist/types/src';
import { SapuxFtfsFileIO } from '../../../page-editor-api';
import type {
    ExecuteFunctionalityInput,
    ExecuteFunctionalityOutput,
    FunctionalityHandlers,
    GetFunctionalityDetailsInput,
    GetFunctionalityDetailsOutput
} from '../../../types';
import { convertToSchema, getDefaultExtensionFolder, resolveApplication, validateWithSchema } from '../../utils';
import { join } from 'path';
import { CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY_ID } from '../../../constant';
import { buildControllerExtensionSchema, ControllerExtensionCreationSchema } from './schema';

export const CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY: GetFunctionalityDetailsOutput = {
    functionalityId: CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY_ID,
    name: 'Add new controller extension by creating javascript or typescript file and updates manifest.json with entry',
    description:
        'Add new controller extension by creating javascript or typescript file and updates manifest.json with entry. Controller extensions allow users to extensiate default behaviour with custom controllers code.',
    parameters: convertToSchema(ControllerExtensionCreationSchema)
};

/**
 * Retrieves the details of the create controller extension functionality.
 *
 * @param input - The input parameters for getting functionality details.
 * @returns A promise that resolves to the functionality details output.
 */
async function getFunctionalityDetails(input: GetFunctionalityDetailsInput): Promise<GetFunctionalityDetailsOutput> {
    // Populate options for pageId
    const project = await resolveApplication(input.appPath);
    if (!project?.applicationAccess) {
        throw new Error('Invalid Project Root or Application Path');
    }
    const ftfsFileIo = new SapuxFtfsFileIO(project.applicationAccess);

    return {
        ...CREATE_CONTROLLER_EXTENSION_FUNCTIONALITY,
        parameters: convertToSchema(await buildControllerExtensionSchema(ftfsFileIo))
    };
}

/**
 * Executes the create controller extension functionality.
 *
 * @param input - The input parameters for executing the functionality.
 * @returns A promise that resolves to the execution output.
 */
async function executeFunctionality(input: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    const { parameters, appPath } = input;
    const project = await resolveApplication(appPath);
    let changes: string[] = [];
    if (project?.applicationAccess) {
        const { appId, root } = project;
        const ftfsFileIo = new SapuxFtfsFileIO(project.applicationAccess);
        const parametersSchema = await buildControllerExtensionSchema(ftfsFileIo);

        const creationParameters = validateWithSchema(parametersSchema, parameters);
        const { pageId, controllerName, pageType } = creationParameters;

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
    if (pageId && typeof pageId === 'string') {
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
