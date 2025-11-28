import type {
    ExecuteFunctionalityInput,
    ExecuteFunctionalityOutput,
    FunctionalityHandlers,
    GetFunctionalityDetailsInput,
    GetFunctionalityDetailsOutput
} from '../../../types';
import { Application } from './application';
import { convertToSchema, resolveApplication, validateWithSchema } from '../../../utils';
import { ADD_PAGE } from '../../../constant';
import { SapuxFtfsFileIO, getServiceName } from '../../../page-editor-api';
import { buildPageCreationSchema } from './schema';
import { PageTypeV4 } from '@sap/ux-specification/dist/types/src';
import { getFioriElementsVersion } from './utils';

export const ADD_PAGE_FUNCTIONALITY: GetFunctionalityDetailsOutput = {
    functionalityId: ADD_PAGE,
    name: 'Add new page to application by updating manifest.json',
    description: 'Create new fiori elements page like ListReport, ObjectPage, CustomPage',
    parameters: convertToSchema(buildPageCreationSchema({}))
};

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
            ...ADD_PAGE_FUNCTIONALITY,
            parameters: {},
            name: 'Invalid Project Root or Application Path',
            description: `To add a new page, provide a valid project root or application path. "${appPath}" is not valid`
        };
    }
    const { appId, applicationAccess } = appDetails;
    const ftfsFileIo = new SapuxFtfsFileIO(applicationAccess);
    const appData = await ftfsFileIo.readApp();
    const serviceName = await getServiceName(applicationAccess);
    const application = new Application({ params, applicationAccess, serviceName, appId, appData });
    const navigationOptions = await application.getCreationNavigationOptions();
    return {
        ...ADD_PAGE_FUNCTIONALITY,
        parameters: convertToSchema(
            buildPageCreationSchema(
                navigationOptions.navigations,
                navigationOptions.entities,
                getFioriElementsVersion(appData)
            )
        )
    };
}

/**
 * Executes the Add Page functionality.
 *
 * @param params - The input parameters for executing the functionality.
 * @returns A promise that resolves to the execution output.
 */
async function executeFunctionality(params: ExecuteFunctionalityInput): Promise<ExecuteFunctionalityOutput> {
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
    // Parse page creation parameters
    const navigationOptions = await application.getCreationNavigationOptions();
    const schema = buildPageCreationSchema(
        navigationOptions.navigations,
        navigationOptions.entities,
        getFioriElementsVersion(appData)
    );
    const addPageParameters = validateWithSchema(schema, parameters);
    const pageType = addPageParameters.pageType ?? PageTypeV4.ObjectPage;
    const parentPage = 'parentPage' in addPageParameters ? addPageParameters.parentPage : undefined;
    const entitySet = 'entitySet' in addPageParameters ? addPageParameters.entitySet?.toString() : undefined;
    const pageNavigation =
        'pageNavigation' in addPageParameters ? addPageParameters.pageNavigation.toString() : undefined;
    const viewName =
        'pageViewName' in addPageParameters &&
        addPageParameters.pageViewName &&
        typeof addPageParameters.pageViewName === 'string'
            ? addPageParameters.pageViewName
            : '';
    return application.createPage({
        pageType: pageType,
        parent: parentPage,
        navigation: pageNavigation,
        entitySet: entitySet,
        viewName: viewName
    });
}

export const addPageHandlers: FunctionalityHandlers = {
    getFunctionalityDetails,
    executeFunctionality
};
