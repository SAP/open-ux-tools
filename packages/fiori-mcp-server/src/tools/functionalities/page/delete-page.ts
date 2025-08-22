import type {
    ExecuteFunctionalitiesInput,
    ExecuteFunctionalityOutput,
    FunctionalityHandlers,
    GetFunctionalityDetailsInput,
    GetFunctionalityDetailsOutput
} from '../../../types';
import { Application } from './application';
import { SapuxFtfsFileIO, getServiceName } from '../../../page-editor-api';
import { resolveApplication } from '../../utils';
import { DELETE_PAGE } from '../../../constant';

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
            id: DELETE_PAGE,
            name: 'Invalid Project Root or Application Path',
            description: `To delete a page, provide a valid project root or application path. "${appPath}" is not valid`,
            parameters: []
        };
    }
    const { appId, applicationAccess } = appDetails;
    const ftfsFileIo = new SapuxFtfsFileIO(applicationAccess);
    const appData = await ftfsFileIo.readApp();
    const serviceName = await getServiceName(applicationAccess);
    const application = new Application({ params, applicationAccess, serviceName, appId, appData });
    return application.getDeleteOptions();
}

/**
 * Executes the Delete Page functionality.
 *
 * @param params - The input parameters for executing the functionality.
 * @returns A promise resolving to the execution output.
 */
async function executeFunctionality(params: ExecuteFunctionalitiesInput): Promise<ExecuteFunctionalityOutput> {
    const { appPath, parameters } = params;
    const { pageId } = parameters;
    if (!pageId || pageId !== 'string') {
        throw new Error('Missing or invalid parameter "pageId"');
    }
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
    const appData = await ftfsFileIo.readApp();
    const serviceName = await getServiceName(applicationAccess);
    const application = new Application({ params, applicationAccess, serviceName, appId, appData });
    return application.deletePage({
        pageId
    });
}

export const deletePageHandlers: FunctionalityHandlers = {
    getFunctionalityDetails,
    executeFunctionality
};

export { DELETE_PAGE_FUNCTIONALITY } from './application';
