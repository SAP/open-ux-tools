import * as zod from 'zod';
import { FioriAppSchema, FunctionalityIdSchema, FunctionalitySchema, ParameterSchema } from './basic';

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
        'Identifier to pass as the `functionalityId` parameter when calling `get-functionality-details` or `execute-functionality`'
    ),
    /** Name of the functionality */
    name: zod.string(),
    /** Description of the functionality */
    description: zod.string(),
    /** Technical description of the functionality */
    technicalDescription: zod.string().optional(),
    /** Array of parameters for the functionality */
    parameters: zod.array(ParameterSchema),
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
 * Output interface for the 'execute_functionality' functionality
 */
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
