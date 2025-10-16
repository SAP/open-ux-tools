import * as z from 'zod';
import { LATEST_UI5_VERSION } from '../../../constant';
import { convertToSchema } from '../../utils';

const projectPath = z
    .string()
    .describe('The path to the non-CAP project folder. By default the currently opened project folder should be used.');

const version = z.string().default('0.2').describe('Config schema version.');

const floorplan = z
    .literal(['FE_FPM', 'FE_LROP', 'FE_OVP', 'FE_ALP', 'FE_FEOP', 'FE_WORKLIST', 'FF_SIMPLE'])
    .describe('SAP Fiori Elements floor plan type.');

const projectType = z
    .literal(['LIST_REPORT_OBJECT_PAGE', 'FORM_ENTRY_OBJECT_PAGE', 'FLEXIBLE_PROGRAMMING_MODEL'])
    .describe('SAP Fiori Elements project type. Corresponds to the SAP Fiori Elements floor plan.');

const project = z.object({
    name: z
        .string()
        .describe("Must be lowercase with dashes, e.g., 'sales-order-management'.")
        .regex(/^[a-z0-9-]+$/),
    title: z.optional(z.string()),
    description: z.string(),
    targetFolder: z.string().describe('Absolute path to the non-CAP project folder (projectPath).'),
    ui5Version: z.string().default(LATEST_UI5_VERSION),
    sapux: z.boolean().default(true)
});

const service = z.object({
    servicePath: z
        .string()
        .describe(
            'The odata endpoint as provided by the cds mcp. If the parameter is not provided, ' +
                'the agent should ask the user for it. Some service endpoints require authentication ' +
                '- in that case, the agent should ask the user for the necessary credentials.'
        )
        .meta({
            examples: [
                'odata/v4/<servicename>/',
                'odata/v4/MyRiskService/',
                'odata/v2/MyOdataV2Service/',
                'odata/v4/MyOdataV4Service/',
                "odata/v4/<relative '@path' annotation from service cds file>/",
                "<absolute '@path' annotation from service cds file>/",
                'myAbsolutePathFromServiceCdsFile/'
            ]
        }),
    host: z
        .url()
        .describe(
            'The host of the OData service. Must be an HTTPS endpoint. If the parameter is not provided, the agent should ask the user for it.'
        ),
    client: z.optional(z.string().describe('The client to be used for the OData service.')),
    edmx: z.string().describe('The service metadata in the stringified XML format.')
});

const entityConfig = z.object({
    mainEntity: z.object({
        entityName: z
            .string()
            .describe('The name of the main entity. EntitySet Name attribute in OData Metadata')
            .meta({ examples: ["'SalesOrder'", "'PurchaseOrderHeader'", "'MyEntity'"] })
    }),
    generateFormAnnotations: z.boolean(),
    generateLROPAnnotations: z.boolean()
});

const telemetryData = z.object({
    generationSourceName: z.string().default('AI Headless MCP'),
    generationSourceVersion: z.string().default('1.0.0')
});

const appGenConfig = z.object({
    version,
    floorplan,
    projectType,
    project,
    service,
    entityConfig,
    telemetryData
}).describe(`The configuration that will be used for the Application UI generation.
            The configuration **MUST** be a valid JSON object corresponding to the inputSchema of the tool.
            The configuration **MUST** be based on the project files in the projectPath (if a project exists).`);

export const GeneratorConfigSchemaNonCAP = z.object({ projectPath, appGenConfig });

export const generatorConfigSchemaNonCAPJson = convertToSchema(GeneratorConfigSchemaNonCAP);

export type NonCAPSchema = z.infer<typeof GeneratorConfigSchemaNonCAP>;
export type GeneratorConfigNonCAP = z.infer<typeof appGenConfig>;
