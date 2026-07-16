import * as zod from 'zod';
import { FunctionalityIdSchema } from './basic.js';

/**
 * Input interface for the 'list_fiori_apps' functionality
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
 * Input interface for the 'list_functionality' functionality
 */
export const ListFunctionalitiesInputSchema = zod.object({
    /** Path to the Fiori application */
    appPath: zod
        .string()
        .describe(
            'Path to the root folder of the Fiori application (where package.json and ui5.yaml reside) if one exists or to the current directory. Path should be an absolute path.'
        )
});

/**
 * Input interface for the 'get_functionality_details' functionality
 */
export const GetFunctionalityDetailsInputSchema = zod.object({
    /** Path to the Fiori application */
    appPath: zod
        .string()
        .describe(
            'Path to the Fiori application if one exists or to the current directory. Path should be an absolute path.'
        ),
    /** ID or array of IDs of the functionality(ies) */
    functionalityId: FunctionalityIdSchema.describe('The ID of the functionality to get details for')
});

/**
 * Input interface for the 'execute_functionality' functionality
 */
export const ExecuteFunctionalityInputSchema = zod
    .object({
        /** ID or array of IDs of the functionality(ies) to execute */
        functionalityId: FunctionalityIdSchema.describe('The ID of the functionality to execute'),
        /** Parameters for the functionality execution */
        parameters: zod.record(zod.string(), zod.unknown()).describe('Parameters for the functionality execution'),
        /** Path to the Fiori application */
        appPath: zod
            .string()
            .describe(
                'Path to the Fiori application if one exists or to the current directory. Path should be an absolute path.'
            )
    })
    .describe(
        'Input object for executing a functionality. ' +
            'Only three top-level properties are allowed: "functionalityId", "parameters", and "appPath". ' +
            'All other dynamic or functionality-specific inputs must be included inside the "parameters" object. ' +
            'Do not place any additional fields at the root level.'
    );

export const DownloadODataServiceMetadataInputSchema = zod.object({
    sapSystemQuery: zod
        .string()
        .optional()
        .describe('The name, host or a URL of the SAP system to fetch service metadata from.'),
    servicePath: zod
        .string()
        .optional()
        .describe(
            'The path to the SAP service to fetch metadata for. ' +
                'ONLY use this if the user provides an EXACT path (e.g., "/sap/opu/odata/sap/ZUI_TRAVEL_O4/"). ' +
                'DO NOT construct paths from service names. This parameter is required.'
        ),
    /* serviceName: zod
        .string()
        .optional()
        .describe(
            '✅ USE THIS for service names! ' +
                'The technical name of the OData service.' +
                'If the user provides just a service name (not a full path containing forward slashes), pass it here. ' +
                'A catalog lookup will be performed to resolve the service path automatically. ' +
                'DO NOT try to construct servicePath yourself - let the tool do the lookup.'
        ), */
    appPath: zod
        .string()
        .describe('Absolute path to the folder where metadata.xml will be saved. Typically the project target folder.')
});

export const DocSearchInputSchema = zod.object({
    query: zod
        .string()
        .min(2)
        .describe('The search query for fiori elements, annotations, sapui5, fiori tools documentation')
});
