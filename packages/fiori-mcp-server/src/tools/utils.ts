import { findProjectRoot, createApplicationAccess, getProject, DirName } from '@sap-ux/project-access';
import { join } from 'path';
import * as zod from 'zod';
import type { Appdetails } from '../types';

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
            console.log(`Application was not found by given path. Error: ${e}`);
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
        console.log(`Project was not found by given path. Error: ${e}`);
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
