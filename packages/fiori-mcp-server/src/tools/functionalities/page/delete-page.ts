import type {
    ExecuteFunctionalityInput,
    ExecuteFunctionalityOutput,
    FunctionalityHandlers,
    GetFunctionalityDetailsInput,
    GetFunctionalityDetailsOutput
} from '../../../types';
import { Application } from './application';
import { SapuxFtfsFileIO, getServiceName } from '../../../page-editor-api';
import { convertToSchema, resolveApplication, validateWithSchema } from '../../../utils';
import { DELETE_PAGE } from '../../../constant';
import { buildPageDeletionSchema } from './schema';

export const DELETE_PAGE_FUNCTIONALITY: GetFunctionalityDetailsOutput = {
    functionalityId: DELETE_PAGE,
    name: 'Delete page from application by updating manifest.json',
    description: 'Remove existing fiori elements page from the application',
    parameters: convertToSchema(buildPageDeletionSchema())
};

/**
 * Retrieves the details of the Delete Page functionality.
 *
 * @param params - The input parameters for getting functionality details.
 * @returns A promise resolving to the functionality details output.
 */
async function getFunctionalityDetails(params: GetFunctionalityDetailsInput): Promise<GetFunctionalityDetailsOutput> {
    const { appPath } = params;
    const appDetails = await resolveApplication(appPath);
    if (!appDetails?.applicationAccess) {
        return {
            functionalityId: DELETE_PAGE,
            name: 'Invalid Project Root or Application Path',
            description: `To delete a page, provide a valid project root or application path. "${appPath}" is not valid`,
            parameters: {}
        };
    }
    const { appId, applicationAccess } = appDetails;
    const ftfsFileIo = new SapuxFtfsFileIO(applicationAccess);
    const appData = await ftfsFileIo.readAppData();
    const serviceName = await getServiceName(applicationAccess);
    const application = new Application({ params, applicationAccess, serviceName, appId, appData });
    return {
        ...DELETE_PAGE_FUNCTIONALITY,
        parameters: convertToSchema(buildPageDeletionSchema(application.getPages()))
    };
}

/**
 * Executes the Delete Page functionality.
 *
 * @param params - The input parameters for executing the functionality.
 * @returns A promise resolving to the execution output.
 */
async function executeFunctionality(params: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
    const { appPath, parameters } = params;
    const appDetails = await resolveApplication(appPath);
    if (!appDetails?.applicationAccess) {
        return {
            functionalityId: DELETE_PAGE,
            status: 'Failed',
            message: `Project root not found for app path: ${appPath}`,
            parameters: [],
            appPath: appPath,
            changes: [],
            timestamp: new Date().toISOString()
        };
    }
    const { appId, applicationAccess } = appDetails;
    const ftfsFileIo = new SapuxFtfsFileIO(applicationAccess);
    const appData = await ftfsFileIo.readAppData();
    const serviceName = await getServiceName(applicationAccess);
    const application = new Application({ params, applicationAccess, serviceName, appId, appData });
    const deleteSchema = buildPageDeletionSchema(application.getPages());
    const deletionParameters = validateWithSchema(deleteSchema, parameters);
    return application.deletePage({
        pageId: deletionParameters.pageId
    });
}

export const deletePageHandlers: FunctionalityHandlers = {
    getFunctionalityDetails,
    executeFunctionality
};
