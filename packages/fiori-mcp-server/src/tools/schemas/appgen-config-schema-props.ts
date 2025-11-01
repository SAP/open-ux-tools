import * as z from 'zod';
import { LATEST_UI5_VERSION } from '../../constant';
import packageJson from '../../../package.json';

export const version = z.string().default('0.2').describe('Config schema version.');

export const floorplan = z
    .literal(['FE_FPM', 'FE_LROP', 'FE_OVP', 'FE_ALP', 'FE_FEOP', 'FE_WORKLIST', 'FF_SIMPLE'])
    .describe('SAP Fiori Elements floor plan type.');

export const projectType = z
    .literal(['LIST_REPORT_OBJECT_PAGE', 'FORM_ENTRY_OBJECT_PAGE', 'FLEXIBLE_PROGRAMMING_MODEL'])
    .describe('SAP Fiori Elements project type. Corresponds to the SAP Fiori Elements floor plan.');

export const project = z.object({
    name: z
        .string()
        .describe("Must be lowercase with dashes, e.g., 'sales-order-management'.")
        .regex(/^[a-z0-9-]+$/),
    title: z.optional(z.string()),
    description: z.string(),
    targetFolder: z.string().describe('Absolute path to the project folder (projectPath).'),
    ui5Version: z.string().default(LATEST_UI5_VERSION),
    sapux: z.boolean().default(true)
});

export const serviceOdata = z.object({
    servicePath: z
        .string()
        .describe('The odata endpoint. If the parameter is not provided, the agent should ask the user for it.')
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

export const serviceCap = z.object({
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
            .describe('The name of the main entity. EntitySet Name attribute in OData Metadata')
            .meta({ examples: ["'SalesOrder'", "'PurchaseOrderHeader'", "'MyEntity'"] })
    }),
    generateFormAnnotations: z.boolean(),
    generateLROPAnnotations: z.boolean()
});

export const telemetryData = z.object({
    generationSourceName: z.string().default(packageJson.name),
    generationSourceVersion: z.string().default(packageJson.version)
});
