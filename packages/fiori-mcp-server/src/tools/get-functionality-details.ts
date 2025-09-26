import type { FunctionalityId, GetFunctionalityDetailsInput, GetFunctionalityDetailsOutput } from '../types';
import { PageEditorApi, findByPath } from '../page-editor-api';
import type { TreeNode, PropertyPath } from '../page-editor-api';
import { FUNCTIONALITIES_HANDLERS } from './functionalities';
import { resolveApplication } from './utils';
import type { JSONSchema4 } from 'json-schema';

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
 * Retrieves property details from a page tree node based on the provided property path.
 *
 * @param page - The root TreeNode of the page.
 * @param propertyPath - The path to the desired property.
 * @returns The functionality details output for the specified property, or undefined if not found.
 */
function getPropertyDetails(page: TreeNode, propertyPath: PropertyPath): GetFunctionalityDetailsOutput | undefined {
    const { property, node } = findByPath([page], propertyPath) ?? {};
    const rootSchema = page?.schema ?? {};
    let details: GetFunctionalityDetailsOutput | undefined;
    if (property) {
        // Property was found by path
        const schema = property.schema ?? {};
        const parameters = resolveRefs(schema, rootSchema);
        details = {
            functionalityId: 'change-property',
            name: 'Change property',
            // There is issue in cline by applying values with undefined - throws error "Invalid JSON argument".
            // As workaround - I am using approach with null as currently there is no use case where null is real value.
            description: `Change a property. To reset, remove, or restore it to its default value, set the value to null. If the property's description does not specify how to disable the related feature, setting it to null is typically the appropriate way to disable or clear it.`,
            parameters: {
                ...parameters,
                name: property.name
            }
        };
    } else if (node?.path.length) {
        // Node was found by path - list node properties
        const schema = node.schema ?? {};
        const parameters = resolveRefs(schema, rootSchema);
        details = {
            functionalityId: 'change-property',
            name: 'Change property',
            // There is issue in cline by applying values with undefined - throws error "Invalid JSON argument".
            // As workaround - I am using approach with null as currently there is no use case where null is real value.
            description: `Change a property. To reset, remove, or restore it to its default value, set the value to null. If the property's description does not specify how to disable the related feature, setting it to null is typically the appropriate way to disable or clear it.`,
            parameters: {
                ...parameters,
                name: node.path[node.path.length - 1]
            }
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

// We should prepare schema which merges references into passed schema fragment/segment
function resolveRefs(schema: JSONSchema4, fullSchema: JSONSchema4, seen = new Set()): JSONSchema4 {
    if (!schema || typeof schema !== 'object') {
        return schema;
    }

    // If schema has $ref, resolve it
    if (schema.$ref) {
        const ref = schema.$ref;

        if (!ref.startsWith('#/definitions/')) {
            throw new Error(`Only local definitions are supported, got: ${ref}`);
        }

        const defName = ref.replace('#/definitions/', '');
        const defSchema = (fullSchema.definitions?.[defName] ?? null) as JSONSchema4 | null;

        if (!defSchema) {
            throw new Error(`Definition '${defName}' not found in fullSchema`);
        }

        if (seen.has(ref)) {
            // Prevent infinite recursion (cyclic refs)
            return { ...defSchema };
        }
        seen.add(ref);

        // Merge the referenced schema with any extra props from the current schema (besides $ref)
        const schemaWithoutRef = { ...schema };
        delete schemaWithoutRef.$ref;
        return resolveRefs({ ...defSchema, ...schemaWithoutRef }, fullSchema, seen);
    }

    // Recursively resolve inside properties, items, etc.
    const resolved: JSONSchema4 = { ...schema };

    if (resolved.properties) {
        resolved.properties = Object.fromEntries(
            Object.entries(resolved.properties).map(([k, v]) => [k, resolveRefs(v as JSONSchema4, fullSchema, seen)])
        );
    }

    if (resolved.items) {
        if (Array.isArray(resolved.items)) {
            resolved.items = resolved.items.map((item) => resolveRefs(item as JSONSchema4, fullSchema, seen));
        } else {
            resolved.items = resolveRefs(resolved.items as JSONSchema4, fullSchema, seen);
        }
    }

    if (resolved.allOf) {
        resolved.allOf = resolved.allOf.map((s) => resolveRefs(s as JSONSchema4, fullSchema, seen));
    }

    if (resolved.anyOf) {
        resolved.anyOf = resolved.anyOf.map((s) => resolveRefs(s as JSONSchema4, fullSchema, seen));
    }

    if (resolved.oneOf) {
        resolved.oneOf = resolved.oneOf.map((s) => resolveRefs(s as JSONSchema4, fullSchema, seen));
    }

    return resolved;
}
