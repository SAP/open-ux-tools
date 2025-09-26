import { findProjectRoot, createApplicationAccess, getProject, DirName } from '@sap-ux/project-access';
import { join } from 'path';
import * as zod from 'zod';
import type { Appdetails } from '../types';
import { logger } from '../utils/logger';
import type { JSONSchema4 } from 'json-schema';

/**
 * Resolves the application details from a given path.
 *
 * @param path - The file system path to resolve the application from.
 * @returns A promise that resolves to an Appdetails object if the application is found, or undefined otherwise.
 */
export async function resolveApplication(path: string): Promise<Appdetails | undefined> {
    try {
        // normalize app path
        path = join(path);
        try {
            const applicationAccess = await createApplicationAccess(path);
            return {
                root: applicationAccess.project.root,
                appId: applicationAccess.getAppId(),
                // projectProvider,
                applicationAccess
            };
        } catch (e) {
            logger.warn(`Application was not found by given path. Error: ${e}`);
            // Fallback - project without app
            const root = await findProjectRoot(path);
            const project = await getProject(root);
            if (project) {
                return {
                    root: project.root,
                    appId: ''
                };
            }
        }
    } catch (e) {
        logger.warn(`Project was not found by given path. Error: ${e}`);
        return undefined;
    }

    return undefined;
}

/**
 * Returns the folder path for new extension creation using the FPM writer approach.
 *
 * @param directory - Target file type (fragment, view, controller) or a custom subfolder.
 * @returns The relative path for the extension folder, or undefined if the directory type is not recognized.
 */
export const getDefaultExtensionFolder = (directory: string): string | undefined => {
    let subFolder: string | undefined;
    switch (directory) {
        case DirName.View: {
            subFolder = join(DirName.Ext, DirName.View);
            break;
        }
        case DirName.Fragment: {
            subFolder = join(DirName.Ext, DirName.Fragment);
            break;
        }
        case DirName.Controller: {
            subFolder = join(DirName.Ext, DirName.Controller);
            break;
        }
        default: {
            // Subfolder is passed
            subFolder = directory;
        }
    }
    return subFolder;
};

/**
 * Recursively resolves `$ref` references in a JSON Schem.
 * When a `$ref` is found, the referenced definition is merged with the current schema fragment (with `$ref` removed).
 *
 * @param schema The schema fragment/segment to resolve. May contain `$ref`.
 * @param fullSchema The full schema object containing `definitions` used for resolving references.
 * @param seen A set of `$ref` strings that have already been processed (used internally).
 * @returns A new schema object with `$ref`s resolved and merged into the fragment.
 */
export const resolveRefs = (schema: JSONSchema4 | null, fullSchema: JSONSchema4, seen = new Set()): JSONSchema4 => {
    if (!schema || typeof schema !== 'object') {
        return {};
    }

    // If schema has $ref - resolve it
    if (schema.$ref?.startsWith('#/definitions/')) {
        const ref = schema.$ref;
        const defName = ref.replace('#/definitions/', '');
        const defSchema = fullSchema.definitions?.[defName] ?? null;
        if (seen.has(ref)) {
            // Prevent infinite recursion (cyclic refs)
            return { ...defSchema };
        }
        seen.add(ref);
        if (defSchema) {
            // Merge the referenced schema with any extra props from the current schema (besides $ref)
            const schemaWithoutRef = { ...schema };
            delete schemaWithoutRef.$ref;
            return resolveRefs({ ...defSchema, ...schemaWithoutRef }, fullSchema, seen);
        }
    }

    // Recursively resolve inside properties, items, etc.
    const resolved: JSONSchema4 = { ...schema };

    if (resolved.properties) {
        resolved.properties = Object.fromEntries(
            Object.entries(resolved.properties).map(([k, v]) => [k, resolveRefs(v, fullSchema, seen)])
        );
    }

    if (resolved.items) {
        if (Array.isArray(resolved.items)) {
            resolved.items = resolved.items.map((item) => resolveRefs(item, fullSchema, seen));
        } else {
            resolved.items = resolveRefs(resolved.items, fullSchema, seen);
        }
    }

    if (resolved.allOf) {
        resolved.allOf = resolved.allOf.map((s) => resolveRefs(s, fullSchema, seen));
    }

    if (resolved.anyOf) {
        resolved.anyOf = resolved.anyOf.map((s) => resolveRefs(s, fullSchema, seen));
    }

    if (resolved.oneOf) {
        resolved.oneOf = resolved.oneOf.map((s) => resolveRefs(s, fullSchema, seen));
    }

    if (typeof resolved.additionalProperties === 'object') {
        resolved.additionalProperties = resolveRefs(resolved.additionalProperties, fullSchema, seen);
    }

    return resolved;
};

/**
 * Prepares a JSON Schema object with a single named property.
 *
 * @param {string} name - The name of the property to include in the schema.
 * @param {JSONSchema4} propertySchema - The JSON Schema definition for the property.
 * @returns {JSONSchema4} A JSON Schema object of type "object" containing the given property.
 */
export const prepatePropertySchema = (name: string, propertySchema: JSONSchema4): JSONSchema4 => {
    return {
        type: 'object',
        properties: {
            [name]: propertySchema
        }
    };
};

/**
 * Converts a Zod schema into a JSON Schema object.
 * Additionally function removes the `$schema` property (if present),
 * since it is unnecessary for mcp server.
 *
 * @param schema - A Zod schema instance to be converted.
 * @returns A JSON Schema object representing the given Zod schema.
 */
export const convertToSchema = (schema: zod.ZodType): zod.core.JSONSchema.JSONSchema => {
    const jsonSchema = zod.toJSONSchema(schema);
    delete jsonSchema.$schema;
    return jsonSchema;
};

/**
 * Validates input data against a given Zod schema.
 *
 * @param schema - The Zod schema used to validate the input data.
 * @param data - The input data to be validated.
 * @returns The validated data.
 */
export const validateWithSchema = <T extends zod.ZodTypeAny>(schema: T, data: unknown): zod.infer<T> => {
    try {
        return schema.parse(data);
    } catch (error) {
        if (error instanceof zod.ZodError) {
            throw new Error(`Missing required fields in parameters. ${JSON.stringify(error.issues, null, 4)}`);
        }
        throw new Error('Unknown error. Recheck input parameters.');
    }
};
