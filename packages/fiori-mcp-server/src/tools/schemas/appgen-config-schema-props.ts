import * as z from 'zod';
import { LATEST_UI5_VERSION } from '../../constant';
import packageJson from '../../../package.json';

// Extended type generators API use
export const PREDEFINED_GENERATOR_VALUES = {
    // Config schema version
    version: '0.2',
    telemetryData: {
        generationSourceName: packageJson.name,
        generationSourceVersion: packageJson.version
    },
    project: {
        sapux: true
    }
};

export const floorplan = z
    .literal(['FE_FPM', 'FE_LROP', 'FE_OVP', 'FE_ALP', 'FE_FEOP', 'FE_WORKLIST', 'FF_SIMPLE'])
    .describe('SAP Fiori Elements floor plan type.');

export const project = z.object({
    name: z
        .string()
        .describe("Must be lowercase with dashes, e.g., 'sales-order-management'.")
        .regex(/^[a-z0-9-]+$/),
    title: z.optional(z.string()),
    description: z.string(),
    targetFolder: z.string().describe('Absolute path to the project folder (projectPath).'),
    ui5Version: z.string().default(LATEST_UI5_VERSION)
});

export const serviceOdata = z.object({
    servicePath: z
        .string()
        .describe('The odata endpoint. If the parameter is not provided, the agent should ask the user for it.')
        .meta({
            examples: [
                'odata/v4/<servicename>/',
                'odata/v4/MyRiskService/',
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
    metadataFilePath: z.optional(z.string().describe('Path to a local metadata.xml file.'))
});

export const serviceCap = z.object({
    servicePath: z
        .string()
        .describe('The odata endpoint. If the parameter is not provided, the agent should ask the user for it.')
        .meta({
            examples: [
                'odata/v4/<servicename>/',
                'odata/v4/MyRiskService/',
                'odata/v4/MyOdataV4Service/',
                "odata/v4/<relative '@path' annotation from service cds file>/",
                "<absolute '@path' annotation from service cds file>/",
                'myAbsolutePathFromServiceCdsFile/'
            ]
        }),
    capService: z.object({
        projectPath: z.string(),
        serviceName: z.string(),
        serviceCdsPath: z
            .string()
            .describe('The path to the service cds file')
            .meta({
                examples: [
                    'srv/service.cds',
                    'srv/my-service.cds',
                    'path/to/srv/service.cds',
                    'path/to/srv/my-service.cds'
                ]
            }),
        capType: z.optional(z.literal(['Node.js', 'Java']))
    })
});

export const entityConfig = z.object({
    mainEntity: z.object({
        entityName: z
            .string()
            .describe('The name of the main entity. EntitySet Name attribute in OData Metadata.')
            .meta({ examples: ["'SalesOrder'", "'PurchaseOrderHeader'", "'MyEntity'"] })
    }),
    generateFormAnnotations: z
        .boolean()
        .describe('Whether to generate form annotations for the main entity if none exist.')
        .default(true),
    generateLROPAnnotations: z
        .boolean()
        .describe('Whether to generate LROP annotations for the main entity if none exist.')
        .default(true)
});
