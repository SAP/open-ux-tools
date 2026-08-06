import { CommandRunner } from '@sap-ux/nodejs-utils';
import { previewManifest } from '@ui5/task-adaptation';
import type { Manifest } from '@sap-ux/project-access';
import { readUi5Config } from '../base/helper.js';

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
 * Produces the merged manifest.json for a CF ADP project using the cached base app
 * files from the last full build. Much faster than a full rebuild — no HTML5 Repo
 * fetch, just descriptor variant application on top of the cached base app.
 *
 * Precondition: a full build must have run at least once so the base app files are
 * in the local cache. Throws if the cache is empty.
 *
 * @param {string} projectPath - Absolute path to the project root (where ui5.yaml lives).
 * @returns {Promise<Manifest>} The merged manifest.
 */
export async function getPreviewManifest(projectPath: string): Promise<Manifest> {
    const ui5Config = await readUi5Config(projectPath, 'ui5.yaml');
    const buildTask = ui5Config.findCustomTask<{ module: string; [key: string]: unknown }>(
        'app-variant-bundler-build'
    )?.configuration;

    if (!buildTask) {
        throw new Error('No app-variant-bundler-build task found in ui5.yaml');
    }

    const { module: projectNamespace, ...configuration } = buildTask;

    return previewManifest({
        options: {
            configuration,
            projectNamespace
        }
    } as any) as Promise<Manifest>;
}
