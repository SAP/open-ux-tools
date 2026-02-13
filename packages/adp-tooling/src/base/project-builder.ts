import { CommandRunner } from '@sap-ux/nodejs-utils';

/**
 * Executes a build command in the specified project directory.
 *
 * This function uses the `CommandRunner` to run the build process via the command `npm run build`.
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
