import * as zod from 'zod';
import { FioriAppSchema, FunctionalityIdSchema, FunctionalitySchema, ParameterSchema } from './basic.js';

/**
 * Output interface for the 'search_docs' functionality
 */
export const SearchDocsOutputSchema = zod.string().describe('Search results as formatted text');

/**
 * Output interface for the 'list_fiori_apps' functionality
 */
export const ListFioriAppsOutputSchema = zod.object({
    /** Array of found Fiori applications */
    applications: zod.array(FioriAppSchema)
});

/**
 * Output interface for the 'list_functionality' functionality
 */
export const ListFunctionalitiesOutputSchema = zod.object({
    /** Path to the Fiori application */
    applicationPath: zod.string(),
    /** Array of available functionalities */
    functionalities: zod.array(FunctionalitySchema)
});

/**
 * Output interface for the 'get_functionality_details' functionality
 */
export const GetFunctionalityDetailsOutputSchema = zod.object({
    /** ID of the functionality */
    functionalityId: FunctionalityIdSchema.describe(
        'Identifier to pass as the `functionalityId` parameter when calling `get_functionality_details` or `execute_functionality`'
    ),
    /** Name of the functionality */
    name: zod.string(),
    /** Description of the functionality */
    description: zod.string(),
    /** Technical description of the functionality */
    technicalDescription: zod.string().optional(),
    /** Schema of input parameters for functionality */
    parameters: ParameterSchema,
    /** Array of prerequisites for the functionality */
    prerequisites: zod.array(zod.string()).optional(),
    /** Impact of the functionality */
    impact: zod.string().optional(),
    /** Array of examples for the functionality */
    examples: zod.array(zod.string()).optional(),
    /** Name of the page associated with the functionality */
    pageName: zod.string().optional()
});

/**
 * Output schema for the 'list_sap_systems' tool
 */
export const ListSapSystemsOutputSchema = zod.object({
    systems: zod.array(
        zod.object({
            name: zod.string().describe('The display name of the SAP system or destination.'),
            url: zod.string().describe('The host URL of the SAP system.'),
            client: zod.string().optional().describe('The SAP client')
        })
    )
});

/**
 * Output interface for the 'download_odata_service_metadata' tool
 */
export const FetchServiceMetadataOutputSchema = zod.object({
    status: zod.string(),
    message: zod.string(),
    parameters: zod.object({
        host: zod
            .string()
            .describe('The host URL of the OData service. Pass as service.host to generate_fiori_app_odata.'),
        servicePath: zod
            .string()
            .describe('The OData endpoint path. Pass as service.servicePath to generate_fiori_app_odata.'),
        client: zod.string().optional().describe('The SAP client. Pass as service.client to generate_fiori_app_odata.'),
        destination: zod
            .string()
            .optional()
            .describe('The BTP destination name (BAS only). Pass as service.destination to generate_fiori_app_odata.'),
        metadataFilePath: zod
            .string()
            .describe('Path to the saved metadata.xml. Pass as service.metadataFilePath to generate_fiori_app_odata.')
    }),
    appPath: zod.string(),
    changes: zod.array(zod.string()),
    timestamp: zod.string()
});

/**
 * Output schema for the 'generate_fiori_app_odata' and 'generate_fiori_app_cap' tools
 */
export const GenerateAppOutputSchema = zod.object({
    status: zod.string(),
    message: zod.string(),
    parameters: zod.unknown(),
    appPath: zod.string(),
    changes: zod.array(zod.string()),
    timestamp: zod.string()
});

export const ExecuteFunctionalityOutputSchema = zod.object({
    /** ID or array of IDs of the executed functionality(ies) */
    functionalityId: FunctionalityIdSchema,
    /** Status of the execution */
    status: zod.string(),
    /** Message describing the execution result */
    message: zod.string(),
    /** Parameters used in the execution */
    parameters: zod.unknown(),
    /** Path to the Fiori application */
    appPath: zod.string(),
    /** Array of changes made during the execution */
    changes: zod.array(zod.string()),
    /** Timestamp of the execution */
    timestamp: zod.string()
});
