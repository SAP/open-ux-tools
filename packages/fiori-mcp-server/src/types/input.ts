import * as zod from 'zod';
import { FunctionalityIdSchema } from './basic';

/**
 * Input interface for the 'list-fiori-apps' functionality
 */
export const ListFioriAppsInputSchema = zod.object({
    /** Array of paths to search for Fiori applications */
    searchPath: zod
        .array(zod.string())
        .describe(
            'Path to search for Fiori applications (defaults to current directory). If VSCode - list of VS Code workspace folder paths(`workspace.workspaceFolders`)'
        )
});

/**
 * Input interface for the 'list-functionality' functionality
 */
export const ListFunctionalitiesInputSchema = zod.object({
    /** Path to the Fiori application */
    appPath: zod
        .string()
        .describe(
            'Path to the root folder of the Fiori application (where package.json and ui5.yaml reside). Path should be an absolute path.'
        )
});

/**
 * Input interface for the 'get-functionality-details' functionality
 */
export const GetFunctionalityDetailsInputSchema = zod.object({
    /** Path to the Fiori application */
    appPath: zod.string().describe('Path to the Fiori application. Path should be an absolute path.'),
    /** ID or array of IDs of the functionality(ies) */
    functionalityId: FunctionalityIdSchema.describe('The ID of the functionality to get details for')
});

/**
 * Input interface for the 'execute-functionality' functionality
 */
export const ExecuteFunctionalityInputSchema = zod.object({
    /** ID or array of IDs of the functionality(ies) to execute */
    functionalityId: FunctionalityIdSchema.describe('The ID of the functionality to execute'),
    /** Parameters for the functionality execution */
    parameters: zod.record(zod.string(), zod.unknown()).describe('Parameters for the functionality execution'),
    /** Path to the Fiori application */
    appPath: zod.string().describe('Path to the Fiori application. Path should be an absolute path.')
});

export const DocSearchInputSchema = zod.object({
    query: zod
        .string()
        .min(2)
        .describe('The search query for fiori elements, annotations, sapui5, fiori tools documentation')
});
