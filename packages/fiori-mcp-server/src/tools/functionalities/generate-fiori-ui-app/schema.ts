import { LATEST_UI5_VERSION } from '../../../constant';
import * as z from 'zod';

export const GeneratorConfigSchemaCAP = z.object({
    floorplan: z
        .literal(['FE_LROP', 'FE_FEOP', 'FE_FPM', 'FE_OVP', 'FE_ALP', 'FE_WORKLIST', 'FF_SIMPLE'])
        .describe('SAP Fiori Elements floor plan type.'),
    project: z.object({
        name: z
            .string()
            .describe("Must be lowercase with dashes, e.g., 'sales-order-management'.")
            .regex(/^[a-z0-9-]+$/),
        targetFolder: z.string().describe('Absolute path to the CAP project folder (projectPath).'),
        namespace: z.optional(z.string()),
        title: z.optional(z.string()),
        description: z.string(),
        ui5Theme: z.optional(z.string()),
        ui5Version: z.string().default(LATEST_UI5_VERSION),
        localUI5Version: z.optional(z.string()).default(LATEST_UI5_VERSION)
    }),
    service: z.object({
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
    }),
    entityConfig: z.object({
        mainEntity: z.object({
            entityName: z
                .string()
                .describe("The name of the main entity, e.g. 'SalesOrder'")
                .meta({
                    examples: ["'SalesOrder'", "'PurchaseOrderHeader'", "'MyEntity'"]
                })
        }),
        generateFormAnnotations: z.boolean(),
        generateLROPAnnotations: z.boolean()
    })
});

// Input type for generator config
export type GeneratorConfigCAP = z.infer<typeof GeneratorConfigSchemaCAP>;
