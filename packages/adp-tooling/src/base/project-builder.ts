import { CommandRunner } from '@sap-ux/nodejs-utils';

/**
 * Executes a build command in the specified project directory.
 *
 * This function uses the `CommandRunner` to run the build process via the command `npm run build`.
 *
 * @param {string} projectPath - The absolute path to the project directory where the build command will be executed.
 * @returns {Promise<void>} Resolves when the build process has completed successfully.
 * @throws {Error} If the build process fails or if an error occurs during cleanup.
 */
export async function runBuild(projectPath: string): Promise<void> {
    const commandRunner = new CommandRunner();

    try {
        await commandRunner.run('npm', ['run', 'build'], { cwd: projectPath });
    } catch (e) {
        console.error(`Error during build and clean: ${e.message}`);
        throw e;
    }
}
