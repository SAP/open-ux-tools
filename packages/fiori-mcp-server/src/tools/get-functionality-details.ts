import type { GetFunctionalityDetailsInput, GetFunctionalityDetailsOutput, Parameter } from '../types';
import { PageEditorApi, findByPath } from '../page-editor-api';
import type { TreeNode, PropertyPath, TreeNodeProperty } from '../page-editor-api';
import { FUNCTIONALITIES_HANDLERS } from './functionalities';
import { resolveApplication } from './utils';

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
            parameter.options = property.options.map((option) => option.key);
        }
        if (property.properties) {
            parameter.parameters = getParameters(property.properties);
        }
        parameters.push(parameter);
    }
    return parameters;
}

function getPropertyDetails(page: TreeNode, propertyPath: PropertyPath): GetFunctionalityDetailsOutput | undefined {
    const { property, node } = findByPath([page], propertyPath) ?? {};
    let details: GetFunctionalityDetailsOutput | undefined;
    if (property) {
        // Property was found by path
        const parameters = getParameters([property]);
        details = {
            id: 'change-property',
            name: 'Change property',
            // description: `Change a property. To reset or remove it, set the value to undefined. If the property's description does not specify how to disable the related feature, setting it to undefined can typically be used to disable or clear it.`,
            // There is issue in cline by applying values with undefined - throws error "Invalid JSON argument".
            // As workaround - I am using approach with null as currently there is no use case where null is real value.
            description: `Change a property. To reset, remove, or restore it to its default value, set the value to null. If the property's description does not specify how to disable the related feature, setting it to null is typically the appropriate way to disable or clear it.`,
            parameters
        };
    } else if (node && node.path.length) {
        // Node was found by path - list node properties
        let parameters: Parameter[] = [];
        for (const property of node.properties) {
            parameters = parameters.concat(getParameters([property]));
        }
        details = {
            id: 'change-property',
            name: 'Change property',
            // description: `Change a property. To reset or remove it, set the value to undefined. If the property's description does not specify how to disable the related feature, setting it to undefined can typically be used to disable or clear it.`,
            // There is issue in cline by applying values with undefined - throws error "Invalid JSON argument".
            // As workaround - I am using approach with null as currently there is no use case where null is real value.
            description: `Change a property. To reset, remove, or restore it to its default value, set the value to null. If the property's description does not specify how to disable the related feature, setting it to null is typically the appropriate way to disable or clear it.`,
            parameters
        };
    }
    return details;
}

async function getDetails(appPath: string, pageName?: string): Promise<TreeNode | undefined> {
    const project = await resolveApplication(appPath);
    if (project?.applicationAccess) {
        const pageEditorApi = new PageEditorApi(project.applicationAccess, pageName);
        return pageEditorApi.getPageTree();
    }
}

export function resolveFunctionality(functionalityId: string | string[]): {
    pageName?: string;
    propertyPath: PropertyPath;
} {
    let propertyPath: PropertyPath;
    try {
        propertyPath = typeof functionalityId === 'string' ? JSON.parse(functionalityId) : [...functionalityId];
    } catch (e) {
        throw new Error('Invalid format of functionalityId parameter');
    }
    let pageName: string | undefined = undefined;
    if (propertyPath[0] !== 'settings') {
        // Currently all application paths starts with settings and it is simple to detect pagename from path
        pageName = propertyPath.shift()?.toString();
    }

    return { pageName, propertyPath };
}
