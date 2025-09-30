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
        'Identifier to pass as the `functionalityId` parameter when calling `get_functionality_details` or `execute_functionality`'
    ),
    description: zod.string()
});

/**
 * Schema for a Parameters
 */
const JsonTypeEnum = zod.enum(['object', 'array', 'string', 'number', 'boolean', 'null', 'integer', 'any']);

const ValueSchema = zod
    .object({
        type: zod.union([JsonTypeEnum, zod.array(JsonTypeEnum)]).optional(),
        description: zod.string().optional(),
        properties: zod.any().optional()
    })
    .catchall(zod.any());

export const ParameterSchema = ValueSchema.extend({
    properties: zod.record(zod.string(), zod.union([ValueSchema, zod.boolean()])).optional()
});
