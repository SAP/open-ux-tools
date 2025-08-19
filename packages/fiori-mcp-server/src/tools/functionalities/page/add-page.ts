import type {
    ExecuteFunctionalitiesInput,
    ExecuteFunctionalityOutput,
    FunctionalityHandlers,
    GetFunctionalityDetailsInput,
    GetFunctionalityDetailsOutput
} from '../../../types';
import { Application, ADD_PAGE_FUNCTIONALITY } from './application';
import { resolveApplication } from '../../utils';
import { ADD_PAGE } from '../../../constant';
import { SapuxFtfsFileIO, getServiceName } from '../../../page-editor-api';

/**
 * Retrieves the details of the Add Page functionality.
 *
 * @param params - The input parameters for getting functionality details.
 * @returns A promise that resolves to the functionality details output.
 */
async function getFunctionalityDetails(params: GetFunctionalityDetailsInput): Promise<GetFunctionalityDetailsOutput> {
    const { appPath } = params;
    const appDetails = await resolveApplication(appPath);
    if (!appDetails?.applicationAccess) {
        return {
            id: ADD_PAGE,
            name: 'Invalid Project Root or Application Path',
            description: `To add a new page, provide a valid project root or application path. "${appPath}" is not valid`,
            parameters: []
        };
    }
    const { appId, applicationAccess } = appDetails;
    const ftfsFileIo = new SapuxFtfsFileIO(applicationAccess);
    const appData = await ftfsFileIo.readApp();
    const serviceName = await getServiceName(applicationAccess);
    const application = new Application({ params, applicationAccess, serviceName, appId, appData });
    return application.getCreationOptions();
}

/**
 * Executes the Add Page functionality.
 *
 * @param params - The input parameters for executing the functionality.
 * @returns A promise that resolves to the execution output.
 */
async function executeFunctionality(params: ExecuteFunctionalitiesInput): Promise<ExecuteFunctionalityOutput> {
    const { appPath, parameters } = params;
    const appDetails = await resolveApplication(appPath);
    if (!appDetails?.applicationAccess) {
        return {
            functionalityId: ADD_PAGE,
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
    return application.createPage({
        pageType: parameters.pageType,
        parent: parameters.parentPage,
        navigation: parameters.pageNavigation,
        entitySet: parameters.entitySet
    });
}

export const addPageHandlers: FunctionalityHandlers = {
    getFunctionalityDetails,
    executeFunctionality
};

export { ADD_PAGE_FUNCTIONALITY };
