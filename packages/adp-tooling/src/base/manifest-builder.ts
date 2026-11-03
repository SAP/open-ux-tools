import { getVariant, readUi5Config } from './helper.js';
import { isCFEnvironment } from './cf.js';
import type { AdpPreviewConfig } from '../types.js';
import { getWebappPath, type Manifest } from '@sap-ux/project-access';
import { createReader, createWorkspace } from '@ui5/fs/resourceFactory';
import type { UI5Config } from '@sap-ux/ui5-config';
import path, { join } from 'node:path';
import { pathToFileURL } from 'node:url';

export type AppResources = { files: ReadonlyMap<string, Buffer> };

const AdaptationTaskFunctions = {
    PreviewManifest: 'previewManifest',
    DownloadAppResources: 'downloadAppResources'
} as const;

type AdaptationTask = (typeof AdaptationTaskFunctions)[keyof typeof AdaptationTaskFunctions];

interface BuilderOptions {
    workspace: ReturnType<typeof createWorkspace>;
    options: { configuration: Record<string, unknown>; projectNamespace: string };
}

interface TaskResults {
    [AdaptationTaskFunctions.PreviewManifest]: Manifest;
    [AdaptationTaskFunctions.DownloadAppResources]: AppResources;
}

type AdaptationTasks = {
    [Name in keyof TaskResults]?: (options: BuilderOptions, outputDir?: string) => Promise<TaskResults[Name]>;
};

// Task exports may be named exports or properties of the default full-build task.
type TaskAdaptationModule = AdaptationTasks & { default?: AdaptationTasks };

/**
 * Produces the merged manifest.json for an adaptation project using its UI5 workspace.
 * Base app caching is handled by the project's installed adaptation task.
 *
 * @param appPath - Absolute path to the project root (where ui5.yaml lives).
 * @returns The merged manifest.
 */
export async function getMergedManifest(appPath: string): Promise<Manifest> {
    return runAdaptationTask(appPath, AdaptationTaskFunctions.PreviewManifest);
}

/**
 * Downloads base app resources for an adaptation project.
 *
 * @param appPath - Absolute path to the project root (where ui5.yaml lives).
 * @returns Base app resources.
 */
export async function downloadAppResources(appPath: string): Promise<AppResources> {
    const outputDir = join(appPath, '.context');
    return runAdaptationTask(appPath, AdaptationTaskFunctions.DownloadAppResources, outputDir);
}

/**
 * Creates a workspace for adaptation sources with an in-memory writer.
 * Resource paths are namespaced as expected by the adaptation task.
 *
 * @param appPath - Absolute path to the project root.
 * @returns The workspace and namespace derived from the app descriptor variant.
 */
async function getAdaptationWorkspace(
    appPath: string
): Promise<{ workspace: ReturnType<typeof createWorkspace>; projectNamespace: string }> {
    const [webappPath, variant] = await Promise.all([getWebappPath(appPath), getVariant(appPath)]);
    if (typeof variant.id !== 'string' || !variant.id) {
        throw new Error('Adaptation project has no namespace');
    }
    const projectNamespace = variant.id.replaceAll('.', '/');
    const workspace = createWorkspace({
        reader: createReader({
            fsBasePath: webappPath,
            virBasePath: `/resources/${projectNamespace}/`
        })
    });
    return { workspace, projectNamespace };
}

/**
 * Resolves the `@ui5/task-adaptation` build configuration for a project, routed
 * by environment the same way the rest of the ADP flow routes it ({@link isCFEnvironment}):
 *
 * - CF: the `app-variant-bundler-build` task carries the build configuration
 *   (module/space/org/...). Use it as-is — never stamp `type: 'abap'`.
 * - ABAP with the bundler task (CloudReady / S/4 private): the task's own config
 *   already carries `type: 'abap'`. Use it as-is.
 * - ABAP without the bundler task (on-prem preview): derive the configuration from
 *   the `fiori-tools-preview` middleware and mark it `type: 'abap'`.
 *
 * @param appPath - Absolute path to the project root.
 * @param ui5Config - Parsed ui5.yaml for the project.
 * @returns The build configuration to pass to the adaptation task.
 */
async function resolveBuildConfiguration(appPath: string, ui5Config: UI5Config): Promise<Record<string, unknown>> {
    const buildTask = ui5Config.findCustomTask<Record<string, unknown>>('app-variant-bundler-build');

    if (await isCFEnvironment(appPath)) {
        return buildTask?.configuration ?? {};
    }
    if (buildTask) {
        // ABAP CloudReady: the bundler config already carries its own `type: 'abap'`.
        return buildTask.configuration ?? {};
    }
    // ABAP on-prem preview: no bundler task — fall back to the preview middleware.
    const adpConfiguration = ui5Config.findCustomMiddleware<{ adp?: AdpPreviewConfig }>('fiori-tools-preview')
        ?.configuration?.adp;
    if (!adpConfiguration) {
        throw new Error('Adaptation project has no fiori-tools-preview ADP configuration');
    }
    return { ...adpConfiguration, type: 'abap' };
}

/**
 * Runs an adaptation task with the project's build configuration and workspace.
 *
 * @param appPath - Absolute path to the project root.
 * @param taskName - The task export to invoke.
 * @param outputDir - Optional output directory for downloaded resources.
 * @returns The task's result.
 */
async function runAdaptationTask<Name extends AdaptationTask>(
    appPath: string,
    taskName: Name,
    outputDir?: string
): Promise<TaskResults[Name]> {
    const { workspace, projectNamespace } = await getAdaptationWorkspace(appPath);
    const ui5Config = await readUi5Config(appPath, 'ui5.yaml');
    const configuration = await resolveBuildConfiguration(appPath, ui5Config);

    const taskAdaptation = await getTaskAdaptation(appPath);
    const task = taskAdaptation[taskName] ?? taskAdaptation.default?.[taskName];
    if (typeof task !== 'function') {
        throw new Error(
            `@ui5/task-adaptation does not export ${taskName}, version 1.7.0 is required, please update the Adaptation Project`
        );
    }

    return task({ workspace, options: { configuration, projectNamespace } }, outputDir);
}

/**
 * Imports the adaptation task resolved from the project, including hoisted dependencies.
 *
 * @param appPath - Absolute path to the project root.
 * @returns The imported task-adaptation module.
 */
async function getTaskAdaptation(appPath: string): Promise<TaskAdaptationModule> {
    const entry = path.join(appPath, 'node_modules', '@ui5', 'task-adaptation', 'dist', 'index.js');
    return import(pathToFileURL(entry).href);
}
