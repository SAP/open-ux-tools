import { PageEditorApi, SapuxFtfsFileIO, type TreeNode, type TreeNodeProperty } from '../page-editor-api';
import type { Functionality, ListFunctionalitiesInput, ListFunctionalitiesOutput } from '../types';
import { FUNCTIONALITIES_DETAILS } from './functionalities';
import { resolveApplication } from '../utils';
import type { ApplicationAccess } from '@sap-ux/project-access';
import type { Parser } from '@sap/ux-specification/dist/types/src';

/**
 * Lists all functionalities for a given application.
 *
 * @param params - The input parameters for listing functionalities.
 * @param params.appPath - The path to the application.
 * @returns A promise that resolves to either a ListFunctionalitiesOutput object or an error message string.
 */
export async function listFunctionalities(
    params: ListFunctionalitiesInput
): Promise<ListFunctionalitiesOutput | string> {
    const { appPath } = params;
    let functionalities: Functionality[] = [];
    try {
        // If we need dynamic handlers then we can add additional method in interface of FUNCTIONALITIES_HANDLERS
        for (const functionality of FUNCTIONALITIES_DETAILS) {
            functionalities.push({
                functionalityId: functionality.functionalityId,
                description: functionality.description
            });
        }
        const project = await resolveApplication(appPath);
        const apps = project?.applicationAccess?.project.apps ?? {};
        if (project?.applicationAccess && Object.keys(apps).length) {
            const { applicationAccess } = project;
            const ftfsFileIo = new SapuxFtfsFileIO(applicationAccess);
            const application = await ftfsFileIo.getApplicationModel();
            if (application) {
                functionalities = functionalities.concat(await getAppFunctionalities(applicationAccess, application));
                const pages = Object.keys(application?.pages ?? {});
                for (const pageId of pages) {
                    functionalities = functionalities.concat(
                        await getPageFunctionalities(applicationAccess, application, pageId)
                    );
                }
            }
        }
    } catch (error) {
        return `Error while trying to list functionalities: ${error.message}`;
    }
    return {
        applicationPath: appPath,
        functionalities
    };
}

/**
 * Retrieves functionalities for the application settings.
 *
 * @param appAccess - The ApplicationAccess object for accessing the application.
 * @param application - Application model from specification.
 * @returns A promise that resolves to an array of Functionality objects.
 */
async function getAppFunctionalities(
    appAccess: ApplicationAccess,
    application: Parser.ApplicationModel
): Promise<Functionality[]> {
    const pageEditorApi = new PageEditorApi(appAccess, application);
    const tree = await pageEditorApi.getPageTree();

    const settingsNode = tree.children.find((node) => node.path[node.path.length - 1] === 'settings');
    if (!settingsNode) {
        return [];
    }

    // Ignore 'minVersion', 'lazy' properties
    settingsNode.properties = settingsNode.properties.filter(
        (setting) => !['minVersion', 'lazy', 'dependencies'].includes(setting.name)
    );

    return getFunctionalitiesFromPageTree(settingsNode);
}

/**
 * Retrieves functionalities for a specific page in the application.
 *
 * @param appAccess - The ApplicationAccess object for accessing the application.
 * @param application - Application model from specification.
 * @param pageId - Optional. The ID of the page to retrieve functionalities for.
 * @returns A promise that resolves to an array of Functionality objects.
 */
async function getPageFunctionalities(
    appAccess: ApplicationAccess,
    application: Parser.ApplicationModel,
    pageId?: string
): Promise<Functionality[]> {
    const pageEditorApi = new PageEditorApi(appAccess, application, pageId);
    const pageTree = await pageEditorApi.getPageTree();
    return getFunctionalitiesFromPageTree(pageTree, undefined, pageId);
}

/**
 * Extracts functionalities from a page tree structure.
 *
 * @param pageTree - The TreeNode representing the page structure.
 * @param parentId - Optional. The parent ID array for nested functionalities.
 * @param pageName - Optional. The name of the page being processed.
 * @returns An array of Functionality objects extracted from the page tree.
 */
function getFunctionalitiesFromPageTree(
    pageTree: TreeNode,
    parentId: string[] = [],
    pageName?: string
): Functionality[] {
    const functionalities: Functionality[] = [];

    // Process properties of the current node
    if (pageTree.properties) {
        for (const property of pageTree.properties) {
            // Create functionality from property with schemaPath as id
            const functionality = getPropertyFunctionality(property, pageName);
            functionalities.push(functionality);

            // Recursively process nested properties
            if (property.properties) {
                const nestedFunctionalities = processNestedProperties(property.properties);
                functionalities.push(...nestedFunctionalities);
            }
        }
    }

    // Recursively process child nodes
    if (pageTree.children) {
        for (const child of pageTree.children) {
            const childFunctionalities = getFunctionalitiesFromPageTree(
                child,
                [...parentId, ...pageTree.path.map(String)],
                pageName
            );
            functionalities.push(...childFunctionalities);
        }
    }

    return functionalities;
}

/**
 * Processes nested properties to extract functionalities.
 *
 * @param properties - An array of TreeNodeProperty objects to process.
 * @param pageName - Optional. The name of the page being processed.
 * @returns An array of Functionality objects extracted from the nested properties.
 */
function processNestedProperties(properties: TreeNodeProperty[], pageName?: string): Functionality[] {
    const functionalities: Functionality[] = [];

    for (const property of properties) {
        const functionality = getPropertyFunctionality(property, pageName);
        functionalities.push(functionality);

        // Recursively process further nested properties
        if (property.properties) {
            const nestedFunctionalities = processNestedProperties(property.properties);
            functionalities.push(...nestedFunctionalities);
        }
    }

    return functionalities;
}

/**
 * Creates a Functionality object from a TreeNodeProperty.
 *
 * @param property - The TreeNodeProperty to convert into a Functionality.
 * @param pageName - Optional. The name of the page the property belongs to.
 * @returns A Functionality object representing the property.
 */
function getPropertyFunctionality(property: TreeNodeProperty, pageName?: string): Functionality {
    const path: Array<string | number> = [];
    if (pageName) {
        path.push(pageName);
    }
    path.push(...property.schemaPath);
    return {
        functionalityId: path,
        description: property.description || property.displayName || property.name || 'No description available'
    };
}
