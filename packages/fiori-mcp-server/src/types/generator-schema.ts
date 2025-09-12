import * as z from 'zod';

const projectPath = z.optional(z.string());
const version = z.string();
const floorplan = z.literal(['FE_FPM', 'FE_LROP', 'FE_OVP', 'FE_ALP', 'FE_FEOP', 'FE_WORKLIST', 'FF_SIMPLE']);

const project = z.object({
    name: z.string(),
    targetFolder: z.string(),
    namespace: z.optional(z.string()),
    title: z.optional(z.string()),
    description: z.string(),
    ui5Theme: z.optional(z.string()),
    ui5Version: z.string(),
    localUI5Version: z.optional(z.string()),
    sapux: z.boolean(),
    skipAnnotations: z.optional(z.boolean()),
    enableCodeAssist: z.optional(z.boolean()),
    enableEslint: z.optional(z.boolean()),
    enableTypeScript: z.optional(z.boolean())
});

const entityConfig = z.object({
    mainEntity: z.object({
        entityName: z.string()
    }),
    generateFormAnnotations: z.boolean(),
    generateLROPAnnotations: z.boolean()
});

const serviceCAP = z.object({
    servicePath: z.string(),
    capService: z.object({
        projectPath: z.string(),
        serviceName: z.string(),
        serviceCdsPath: z.string(),
        capType: z.optional(z.literal(['Node.js', 'Java']))
    })
});

const serviceNonCAP = z.object({
    servicePath: z.string(),
    host: z.url(),
    edmx: z.string(),
    serviceName: z.string(),
    serviceCdsPath: z.string(),
    capType: z.optional(z.literal(['Node.js', 'Java']))
});

const telemetryData = z.object({
    generationSourceName: z.string(),
    generationSourceVersion: z.string()
});

//
//
//
// EXPORTS
//
export const GeneratorConfigSchemaCAP = z.object({
    projectPath,
    appGenConfig: z.object({
        version,
        floorplan,
        project,
        service: serviceCAP,
        entityConfig,
        telemetryData
    })
});

export const GeneratorConfigSchemaNonCAP = z.object({
    projectPath,
    appGenConfig: z.object({
        version,
        floorplan,
        project,
        service: serviceNonCAP,
        entityConfig,
        telemetryData
    })
});
