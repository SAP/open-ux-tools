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
import { PageTypeV4 } from '@sap/ux-specification/dist/types/src';

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
            functionalityId: ADD_PAGE,
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
    const pageType = isValidPageTypeV4(parameters.pageType) ? parameters.pageType : undefined;
    const parentPage = typeof parameters.parentPage === 'string' ? parameters.parentPage : undefined;
    const entitySet = typeof parameters.entitySet === 'string' ? parameters.entitySet : undefined;
    const pageNavigation = typeof parameters.pageNavigation === 'string' ? parameters.pageNavigation : undefined;
    const viewName = typeof parameters.pageViewName === 'string' ? parameters.pageViewName : '';
    if (!pageType) {
        throw new Error('Missing or invalid parameter "pageType"');
    }
    if (!viewName) {
        throw new Error('Missing or invalid parameter "viewName"');
    }
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
        pageType: pageType,
        parent: parentPage,
        navigation: pageNavigation,
        entitySet: entitySet,
        viewName: viewName
    });
}

/**
 * Type guard to check whether a given value is a valid PageTypeV4 for new pages.
 *
 * @param value - The value to check.
 * @returns True if the value is one of the valid `PageTypeV4` literals.
 */
function isValidPageTypeV4(
    value: unknown
): value is PageTypeV4.ObjectPage | PageTypeV4.ListReport | PageTypeV4.CustomPage {
    return (
        typeof value === 'string' &&
        [PageTypeV4.ObjectPage, PageTypeV4.ListReport, PageTypeV4.CustomPage].includes(value as PageTypeV4)
    );
}

export const addPageHandlers: FunctionalityHandlers = {
    getFunctionalityDetails,
    executeFunctionality
};

export { ADD_PAGE_FUNCTIONALITY };
