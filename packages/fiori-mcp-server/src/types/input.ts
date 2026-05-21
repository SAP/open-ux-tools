import * as zod from 'zod';
import { FunctionalityIdSchema } from './basic.js';
import { STEPS } from '../tools/run-rta-workflow-step/types.js';

/**
 * Input interface for the 'list_fiori_apps' functionality
 */
export const ListFioriAppsInputSchema = zod.object({
    /** Array of paths to search for Fiori applications */
    searchPath: zod
        .array(zod.string())
        .describe(
            'Path to search for Fiori applications (defaults to current directory). If VSCode - list of VS Code workspace folder paths(`workspace.workspaceFolders`)'
        )
});

/**
 * Input interface for the 'list_functionality' functionality
 */
export const ListFunctionalitiesInputSchema = zod.object({
    /** Path to the Fiori application */
    appPath: zod
        .string()
        .describe(
            'Path to the root folder of the Fiori application (where package.json and ui5.yaml reside) if one exists or to the current directory. Path should be an absolute path.'
        )
});

/**
 * Input interface for the 'get_functionality_details' functionality
 */
export const GetFunctionalityDetailsInputSchema = zod.object({
    /** Path to the Fiori application */
    appPath: zod
        .string()
        .describe(
            'Path to the Fiori application if one exists or to the current directory. Path should be an absolute path.'
        ),
    /** ID or array of IDs of the functionality(ies) */
    functionalityId: FunctionalityIdSchema.describe('The ID of the functionality to get details for')
});

/**
 * Input interface for the 'execute_functionality' functionality
 */
export const ExecuteFunctionalityInputSchema = zod
    .object({
        /** ID or array of IDs of the functionality(ies) to execute */
        functionalityId: FunctionalityIdSchema.describe('The ID of the functionality to execute'),
        /** Parameters for the functionality execution */
        parameters: zod.record(zod.string(), zod.unknown()).describe('Parameters for the functionality execution'),
        /** Path to the Fiori application */
        appPath: zod
            .string()
            .describe(
                'Path to the Fiori application if one exists or to the current directory. Path should be an absolute path.'
            )
    })
    .describe(
        'Input object for executing a functionality. ' +
            'Only three top-level properties are allowed: "functionalityId", "parameters", and "appPath". ' +
            'All other dynamic or functionality-specific inputs must be included inside the "parameters" object. ' +
            'Do not place any additional fields at the root level.'
    );

export const DownloadODataServiceMetadataInputSchema = zod.object({
    sapSystemQuery: zod
        .string()
        .optional()
        .describe('The name, host or a URL of the SAP system to fetch service metadata from.'),
    servicePath: zod.string().describe('The path to the SAP service to fetch metadata for.'),
    appPath: zod
        .string()
        .describe('Absolute path to the folder where metadata.xml will be saved. Typically the project target folder.')
});

export const DocSearchInputSchema = zod.object({
    query: zod
        .string()
        .min(2)
        .describe('The search query for fiori elements, annotations, sapui5, fiori tools documentation')
});

export const GenerateAdaptationProjectInputSchema = zod.object({
    system: zod.string().describe('The name of the SAP system (obtained from list_sap_systems)'),
    application: zod.string().describe('The application ID to adapt (e.g., sap.ui.demoapps.rta.fe)'),
    appPath: zod
        .string()
        .describe(
            'Absolute path to the current working directory or target location. Used as fallback if targetFolder is not provided.'
        ),
    targetFolder: zod
        .string()
        .optional()
        .describe(
            'Optional absolute path to the target folder where the project will be generated. Defaults to appPath if not provided.'
        ),
    projectName: zod
        .string()
        .optional()
        .describe('Optional name of the project. Defaults to app.variant if not provided.'),
    namespace: zod.string().optional().describe('Optional namespace for the project'),
    applicationTitle: zod.string().optional().describe('Optional title for the application'),
    client: zod.string().optional().describe('Optional SAP client number'),
    username: zod.string().optional().describe('Optional username for authentication'),
    password: zod.string().optional().describe('Optional password for authentication')
});

export const OpenAdaptationEditorInputSchema = zod.object({
    appPath: zod
        .string()
        .describe('Absolute path to the adaptation project root directory (where package.json resides).')
});

export const AdpControllerExtensionInputSchema = zod.object({
    appPath: zod
        .string()
        .describe(
            'Absolute path to the adaptation project root directory (where webapp/manifest.appdescr_variant resides).'
        ),
    prompt: zod
        .string()
        .optional()
        .describe('Natural language prompt describing what controller extension or fragment to create'),
    aiResponse: zod
        .string()
        .optional()
        .describe(
            'AI-generated response containing code blocks with **Path:** markers preceding each code block. Omit to receive generation rules and project context.'
        ),
    controllerName: zod.string().optional().describe('Desired controller extension name (without .js/.ts extension)'),
    viewId: zod.string().optional().describe('Optional target view identifier for the controller extension')
});

export const AdpMetadataInputSchema = zod.object({
    appPath: zod
        .string()
        .describe(
            'Absolute path to the adaptation project root directory (where webapp/manifest.appdescr_variant resides).'
        ),
    saveLocal: zod
        .boolean()
        .optional()
        .describe(
            'Whether to save fetched metadata locally in the project under the "context" folder. Defaults to false.'
        )
});

export const BuildAdaptationProjectInputSchema = zod.object({
    appPath: zod
        .string()
        .describe(
            'Absolute path to the adaptation project root directory (where webapp/manifest.appdescr_variant resides).'
        ),
    excludeTasks: zod
        .array(zod.string())
        .optional()
        .describe(
            'UI5 builder tasks to exclude. Defaults to ["generateFlexChangesBundle", "generateComponentPreload", "minify"] (matching the project script).'
        ),
    includeTasks: zod
        .array(zod.string())
        .optional()
        .describe('UI5 builder tasks to include in addition to the defaults.'),
    destPath: zod
        .string()
        .optional()
        .describe('Output directory passed to `ui5 build --dest`. Resolved relative to appPath. Defaults to "dist".'),
    clean: zod.boolean().optional().describe('Whether to pass --clean-dest to ui5 build. Defaults to true.'),
    fixYaml: zod
        .boolean()
        .optional()
        .describe(
            'When true and ui5.yaml does not declare app-variant-bundler-build, append a commented configuration template to ui5.yaml so the user can fill in appName, target, and credentials. The build will not be attempted in that run. Defaults to false (return an error containing the template).'
        )
});

export const GetMergedManifestInputSchema = zod.object({
    appPath: zod
        .string()
        .describe(
            'Absolute path to the adaptation project root directory (where webapp/manifest.appdescr_variant resides).'
        )
});

export const DonwloadBaseAppResourcesInputSchema = zod.object({
    appPath: zod
        .string()
        .describe(
            'Absolute path to the adaptation project root directory (where webapp/manifest.appdescr_variant resides).'
        )
});

export const RunRtaWorkflowStepInputSchema = zod.object({
    step: zod
        .enum(STEPS)
        .describe(
            'Which RTA workflow step to run. Each step maps to one Joule frontend action ' +
                'on the adaptation editor page.'
        ),
    sessionId: zod
        .string()
        .optional()
        .describe('Session identifier returned by the "start" step. Required for every step except "start" itself.'),
    payload: zod
        .record(zod.string(), zod.unknown())
        .optional()
        .describe(
            'Step-specific arguments. ' +
                'start: { site: string, frameId?: string }. ' +
                'get_actions: { controlId: string }. ' +
                'get_context: { controlId: string, actionId: string }. ' +
                'call_action: { controlId: string, actionId: string, actionPayload: object }. ' +
                'get_overlays / save / stop: omit.'
        )
});
export type AdpMetadataInput = zod.infer<typeof AdpMetadataInputSchema>;
