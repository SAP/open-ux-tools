import { getVariant, readUi5Config } from '@sap-ux/adp-tooling';
import type { AdpPreviewConfig } from '@sap-ux/adp-tooling';
import { getWebappPath, type Manifest } from '@sap-ux/project-access';
import { createReader, createWorkspace } from '@ui5/fs/resourceFactory';
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
    let configuration =
        ui5Config.findCustomTask<Record<string, unknown>>('app-variant-bundler-build')?.configuration ?? {};

    if (Object.keys(configuration).length === 0) {
        const adpConfiguration = ui5Config.findCustomMiddleware<{ adp?: AdpPreviewConfig }>('fiori-tools-preview')
            ?.configuration?.adp;
        if (!adpConfiguration) {
            throw new Error('Adaptation project has no fiori-tools-preview ADP configuration');
        }
        configuration = { ...adpConfiguration, type: 'abap' };
    }

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
