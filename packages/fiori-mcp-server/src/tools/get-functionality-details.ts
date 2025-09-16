import type { FunctionalityId, GetFunctionalityDetailsInput, GetFunctionalityDetailsOutput, Parameter } from '../types';
import { PageEditorApi, findByPath } from '../page-editor-api';
import type { TreeNode, PropertyPath, TreeNodeProperty } from '../page-editor-api';
import { FUNCTIONALITIES_HANDLERS } from './functionalities';
import { resolveApplication } from './utils';

/**
 * Retrieves functionality details based on the provided input parameters.
 *
 * @param params - The input parameters for getting functionality details.
 * @param params.appPath - The path to the application.
 * @param params.functionalityId - The ID of the functionality to retrieve details for.
 * @returns A promise that resolves to the functionality details output.
 * @throws Error if appPath or functionalityId is not provided.
 */
export async function getFunctionalityDetails(
    params: GetFunctionalityDetailsInput
): Promise<GetFunctionalityDetailsOutput> {
    const { appPath, functionalityId } = params;
    if (!appPath) {
        throw new Error('appPath parameter is required');
    }
    if (!functionalityId) {
        throw new Error('functionalityId parameter is required');
    }
    const externalFunctionality =
        typeof functionalityId === 'string' ? FUNCTIONALITIES_HANDLERS.get(functionalityId) : undefined;
    if (externalFunctionality) {
        return externalFunctionality.getFunctionalityDetails(params);
    }
    const { pageName, propertyPath } = resolveFunctionality(functionalityId);
    const page = await getDetails(appPath, pageName);
    const details = page ? getPropertyDetails(page, propertyPath) : undefined;
    if (!details) {
        throw new Error('functionalityId was not resolved');
    }

    if (pageName) {
        details.pageName = pageName;
    }

    return details;
}

/**
 * Converts TreeNodeProperty objects to Parameter objects.
 *
 * @param properties - An array of TreeNodeProperty objects to convert.
 * @returns An array of Parameter objects.
 */
function getParameters(properties: TreeNodeProperty[]): Parameter[] {
    const parameters: Parameter[] = [];
    for (const property of properties) {
        const parameter: Parameter = {
            id: property.name,
            name: property.displayName,
            description: property.description,
            type: property.type,
            currentValue: property.value
        };
        if (property.options) {
            parameter.options = property.options.map((option) => option.key ?? null);
        }
        if (property.properties) {
            parameter.parameters = getParameters(property.properties);
        }
        parameters.push(parameter);
    }
    return parameters;
}

/**
 * Retrieves property details from a page tree node based on the provided property path.
 *
 * @param page - The root TreeNode of the page.
 * @param propertyPath - The path to the desired property.
 * @returns The functionality details output for the specified property, or undefined if not found.
 */
function getPropertyDetails(page: TreeNode, propertyPath: PropertyPath): GetFunctionalityDetailsOutput | undefined {
    const { property, node } = findByPath([page], propertyPath) ?? {};
    let details: GetFunctionalityDetailsOutput | undefined;
    if (property) {
        // Property was found by path
        const parameters = getParameters([property]);
        details = {
            functionalityId: 'change-property',
            name: 'Change property',
            // There is issue in cline by applying values with undefined - throws error "Invalid JSON argument".
            // As workaround - I am using approach with null as currently there is no use case where null is real value.
            description: `Change a property. To reset, remove, or restore it to its default value, set the value to null. If the property's description does not specify how to disable the related feature, setting it to null is typically the appropriate way to disable or clear it.`,
            parameters
        };
    } else if (node?.path.length) {
        // Node was found by path - list node properties
        let parameters: Parameter[] = [];
        for (const property of node.properties) {
            parameters = parameters.concat(getParameters([property]));
        }
        details = {
            functionalityId: 'change-property',
            name: 'Change property',
            // There is issue in cline by applying values with undefined - throws error "Invalid JSON argument".
            // As workaround - I am using approach with null as currently there is no use case where null is real value.
            description: `Change a property. To reset, remove, or restore it to its default value, set the value to null. If the property's description does not specify how to disable the related feature, setting it to null is typically the appropriate way to disable or clear it.`,
            parameters
        };
    }
    return details;
}

/**
 * Retrieves the page tree for a given application and page.
 *
 * @param appPath - The path to the application.
 * @param pageName - Optional. The name of the page to retrieve details for.
 * @returns A promise that resolves to the page TreeNode, or undefined if not found.
 */
async function getDetails(appPath: string, pageName?: string): Promise<TreeNode | undefined> {
    const project = await resolveApplication(appPath);
    if (project?.applicationAccess) {
        const pageEditorApi = new PageEditorApi(project.applicationAccess, pageName);
        return pageEditorApi.getPageTree();
    }
}

/**
 * Resolves a functionality ID into a page name and property path.
 *
 * @param functionalityId - The ID of the functionality to resolve, either as a string or an array of strings.
 * @returns An object containing the resolved page name (if applicable) and property path.
 * @throws Error if the functionalityId parameter has an invalid format.
 */
export function resolveFunctionality(functionalityId: FunctionalityId): {
    pageName?: string;
    propertyPath: PropertyPath;
} {
    let propertyPath: PropertyPath;
    try {
        propertyPath = typeof functionalityId === 'string' ? JSON.parse(functionalityId) : [...functionalityId];
    } catch (e) {
        // The functionalityId is expected to be either a string array (e.g. "['Id1', 'Id2']") or an array of strings (e.g. ['Id1', 'Id2']).
        throw new Error(`Invalid format of functionalityId parameter, error: ${e}`);
    }
    let pageName: string | undefined;
    if (propertyPath[0] !== 'settings') {
        // Currently all application paths starts with settings and it is simple to detect pagename from path
        pageName = propertyPath.shift()?.toString();
    }

    return { pageName, propertyPath };
}
