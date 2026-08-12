import { CommandRunner } from '@sap-ux/nodejs-utils';
import { previewManifest } from '@ui5/task-adaptation';
import type { ReaderCollection } from '@ui5/fs'; // eslint-disable-line sonarjs/no-implicit-dependencies
import type { MergedAppDescriptor } from '@sap-ux/axios-extension';
import { readUi5Config, extractCfBuildTask } from './helper.js';

/**
 * Executes a build command in the specified project directory.
 *
 * @param {string} projectPath - The absolute path to the project directory where the build command will be executed.
 * @param {NodeJS.ProcessEnv} [env] - Optional environment variables to be used during the build process.
 * @returns {Promise<void>} Resolves when the build process has completed successfully.
 * @throws {Error} If the build process fails or if an error occurs during cleanup.
 */
export async function runBuild(projectPath: string, env?: NodeJS.ProcessEnv): Promise<void> {
    const commandRunner = new CommandRunner();

    try {
        const opts = {
            cwd: projectPath,
            ...(env && { env: { ...process.env, ...env } })
        };

        await commandRunner.run('npm', ['run', 'build'], opts);
    } catch (e) {
        console.error(`Error during build and clean: ${e.message}`);
        throw e;
    }
}

/**
 * Produces the merged manifest.json for a CF ADP project using the workspace
 * and cached base app files from the last full build.
 *
 * Precondition: a full build must have run at least once so the base app files are
 * in the local cache. Throws if the cache is empty.
 *
 * @param {string} projectPath - Absolute path to the project root (where ui5.yaml lives).
 * @param {ReaderCollection} workspace - The UI5 project workspace (this.project in AdpPreview).
 * @returns {Promise<MergedAppDescriptor['manifest']>} The merged manifest.
 */
export async function getPreviewManifest(
    projectPath: string,
    workspace: ReaderCollection
): Promise<MergedAppDescriptor['manifest']> {
    const ui5Config = await readUi5Config(projectPath, 'ui5.yaml');
    const buildTask = extractCfBuildTask(ui5Config);
    const { module: projectNamespace, ...configuration } = buildTask;
    const manifest = await previewManifest({
        workspace,
        options: {
            configuration,
            projectNamespace
        }
    } as any);
    return manifest as MergedAppDescriptor['manifest'];
}
