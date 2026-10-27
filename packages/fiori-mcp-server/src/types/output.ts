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

export const LookupUi5DocumentationOutputSchema = zod
    .object({
        lookupType: zod.enum(['aggregation', 'property', 'event']),
        library: zod.string(),
        control: zod.string(),
        definedIn: zod.string(),
        inherited: zod.boolean(),
        since: zod.string().nullable(),
        description: zod.string().nullable()
    })
    .catchall(zod.unknown());

export const ODataMetadataEntrySchema = zod.object({
    id: zod.string(),
    url: zod.string(),
    metadata: zod.string(),
    model: zod.record(zod.string(), zod.unknown()).optional()
});

export const ReadODataMetadataOutputSchema = zod.object({
    entries: zod.array(ODataMetadataEntrySchema)
});

export const OpenAdaptationEditorOutputSchema = zod.object({
    status: zod.string(),
    message: zod.string(),
    editorUrl: zod.string().optional(),
    processId: zod.number().optional(),
    port: zod.number().optional()
});

export const GenerateAdaptationProjectOutputSchema = zod.object({
    status: zod.string(),
    message: zod.string(),
    projectPath: zod.string().optional()
});

export const AdpControllerExtensionOutputSchema = zod.object({
    status: zod.string(),
    message: zod.string(),
    appPath: zod.string(),
    changes: zod.array(zod.string())
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

/**
 * Output schema for the 'add_building_block' tool
 */
export const AddBuildingBlockOutputSchema = zod.object({
    /** Outcome: success, error, or needs_input (discovery — caller must supply more input) */
    status: zod
        .enum(['success', 'error', 'needs_input'])
        .describe(
            'Outcome of the operation. "needs_input" means viewOrFragmentPath or aggregationPath was omitted and the discovered candidates are returned in insertionPoints — pick one and call again.'
        ),
    /** Relative paths of files written to disk */
    modifiedFiles: zod.array(zod.string()).describe('Relative paths of files modified by the operation.'),
    /** Human-readable result or error description */
    message: zod.string().describe('Human-readable description of the result or error.'),
    /** Discovered insertion points, returned when status is 'needs_input' */
    insertionPoints: zod
        .array(
            zod.object({
                file: zod.string().describe('Relative path to a view or fragment XML file.'),
                aggregationPaths: zod
                    .array(zod.string())
                    .describe('Valid aggregationPath XPath values for this file. Empty when only the file is known.')
            })
        )
        .optional()
        .describe(
            'Candidate insertion points for a follow-up call. Present only when status is "needs_input": lists views/fragments and, once a view is chosen, the valid aggregationPaths within it.'
        ),
    /** Non-fatal warning about annotation-shell writing */
    annotationWarning: zod
        .string()
        .optional()
        .describe(
            'Set when the building block was inserted but its UI annotation shell could not be written. The building block still succeeded; the annotation may need to be added manually.'
        )
});
