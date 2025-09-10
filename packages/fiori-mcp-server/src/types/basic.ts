import * as zod from 'zod';

/**
 * Interface representing a Fiori application
 */
export const FioriAppSchema = zod.object({
    /** Name of the Fiori application */
    name: zod
        .string()
        .describe(
            "Name of the Fiori application. Usually derived from the `sap.app/id` field in the application's manifest.json."
        ),
    /** Path to the Fiori application */
    appPath: zod.string().describe("Absolute path to the Fiori application's root directory."),
    /** Path to project */
    projectPath: zod
        .string()
        .describe(
            'Absolute path to the root directory of the project containing this Fiori application. For EDMXBackend (standalone) projects, this is the same as `appPath`. For CAP projects, this points to the CAP project root, which may contain multiple Fiori applications.'
        ),
    /** Type of the Fiori project */
    projectType: zod
        .enum(['EDMXBackend', 'CAPJava', 'CAPNodejs'])
        .describe('Type of project the application belongs to.'),
    /** OData version of the Fiori application */
    odataVersion: zod.string().describe("OData protocol version used by the application's main service.")
});

/**
 * Type for functionality id
 */
export const FunctionalityIdSchema = zod.union([zod.string(), zod.array(zod.union([zod.string(), zod.number()]))]);

export type Test = zod.infer<typeof FunctionalityIdSchema>;

/**
 * Schema representing a functionality
 */
export const FunctionalitySchema = zod.object({
    functionalityId: FunctionalityIdSchema.describe(
        'Identifier to pass as the `functionalityId` parameter when calling `get-functionality-details` or `execute-functionality`'
    ),
    description: zod.string()
});

/**
 * Schema for a Parameter
 */
const BaseParameterSchema = zod.object({
    /** ID of the parameter */
    id: zod.string(),
    /** Name of the parameter */
    name: zod.string().optional(),
    /** Type of the parameter */
    type: zod.enum(['string', 'number', 'boolean', 'array', 'object']),
    /** Whether the parameter is required */
    required: zod.boolean().optional(),
    /** Description of the parameter */
    description: zod.string().optional(),
    /** Default value of the parameter */
    defaultValue: zod.unknown().optional(),
    /** Possible options for the parameter */
    options: zod.array(zod.union([zod.string(), zod.number(), zod.boolean(), zod.null()])).optional(),
    /** Current value of the parameter */
    currentValue: zod.unknown().optional(),
    /** Examples for the parameter */
    examples: zod.array(zod.string()).optional(),
    /** Regex pattern to validate the value of this parameter */
    pattern: zod.string().optional()
});

/**
 * Parameters with nesting
 */
const NestedParameterSchema = BaseParameterSchema.extend({
    parameters: zod
        .array(
            BaseParameterSchema.extend({
                parameters: zod.array(BaseParameterSchema).optional()
            })
        )
        .optional()
});

export const ParameterSchema = BaseParameterSchema.extend({
    parameters: zod.array(NestedParameterSchema).optional()
});

export type Parameter = zod.infer<typeof BaseParameterSchema>;
