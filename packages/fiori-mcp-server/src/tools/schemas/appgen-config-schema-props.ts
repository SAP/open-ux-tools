import * as z from 'zod';
import { LATEST_UI5_VERSION } from '../../constant.js';
import { PACKAGE_NAME, PACKAGE_VERSION } from '../../package-info.js';

// Extended type generators API use
export const PREDEFINED_GENERATOR_VALUES = {
    // Config schema version
    version: '0.2',
    telemetryData: {
        generationSourceName: PACKAGE_NAME,
        generationSourceVersion: PACKAGE_VERSION
    },
    project: {
        sapux: true
    }
};

export const floorplan = z.union([
    z.literal('FE_LROP').describe('List Report Object Page (OData V2/V4).'),
    z.literal('FE_ALP').describe('Analytical List Page (OData V2/V4).'),
    z.literal('FE_OVP').describe('Overview Page (OData V2/V4).'),
    z.literal('FE_WORKLIST').describe('Worklist (OData V2/V4).'),
    z.literal('FE_FEOP').describe('Form Entry Object Page (OData V4 only).'),
    z.literal('FE_FPM').describe('Flexible Programming Model / Custom Page (OData V4 only).'),
    z
        .literal('FF_SIMPLE')
        .describe('Basic (SAPUI5 Freestyle template) — data source is optional for this template, supports "None".')
]);

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
        .describe(
            '🚨 DO NOT CONSTRUCT - This is provided by download_odata_service_metadata tool! ' +
                'The odata endpoint path returned from the metadata download tool. ' +
                'NEVER construct this yourself - always get it from download_odata_service_metadata output. ' +
                'Required for all floorplans except FF_SIMPLE.'
        ),
    host: z
        .url()
        .describe(
            'The host of the OData service. Must be an HTTPS endpoint. If the parameter is not provided, the agent should ask the user for it.'
        ),
    client: z.optional(z.string().describe('The client to be used for the OData service.')),
    destination: z.optional(
        z
            .string()
            .describe(
                'The BTP destination name to be used for the OData service. This must be provided on SAP Business Application Studio.'
            )
    ),
    metadataFilePath: z.optional(z.string().describe('Path to a local metadata.xml file.'))
});

export const serviceCap = z.object({
    servicePath: z
        .string()
        .describe(
            'The odata endpoint as provided by the cds mcp or as fallback in case that tool is not available from the service cds file.'
        )
        .meta({
            examples: [
                '/odata/v4/<servicename>/',
                '/odata/v4/MyRiskService/',
                '/odata/v2/MyOdataV2Service/',
                '/odata/v4/MyOdataV4Service/',
                "/odata/v4/<relative '@path' annotation from service cds file>/",
                "<absolute '@path' annotation from service cds file>/",
                '/myAbsolutePathFromServiceCdsFile/'
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
            .describe(
                'The name of the main entity. EntitySet Name attribute in OData Metadata. Required for all floorplans except FF_SIMPLE.'
            )
            .meta({ examples: ['SalesOrder', 'PurchaseOrderHeader', 'MyEntity'] })
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
