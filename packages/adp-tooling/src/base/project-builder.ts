import * as fs from 'fs';
import * as path from 'path';

import { CommandRunner } from '@sap-ux/nodejs-utils';

/**
 * Recursively deletes all `.js.map` files within the specified directory and its subdirectories.
 *
 * @param {string} directory - The directory to search for `.js.map` files.
 * @throws {Error} If any filesystem operation (e.g., reading or deleting files) fails.
 */
function deleteJsMapFiles(directory: string): void {
    const files = fs.readdirSync(directory, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(directory, file.name);

        if (file.isDirectory()) {
            // Recursively handle subdirectories
            deleteJsMapFiles(fullPath);
        } else if (file.isFile() && file.name.endsWith('.js.map')) {
            // Delete the .js.map file
            fs.unlinkSync(fullPath);
            console.log(`Deleted: ${fullPath}`);
        }
    }
}

/**
 * Executes a build command in the specified project directory and cleans up `.js.map` files
 * in the provided target directory.
 *
 * This function uses the `CommandRunner` to run the build process via the command
 * `npm run build`. After the build completes, it deletes any `.js.map` files in the
 * specified `dirToClean`. If the directory does not exist, a warning is logged.
 *
 * @param {string} projectPath - The absolute path to the project directory where the build command will be executed.
 * @param {string} dirToClean - The absolute path to the directory to clean up after the build process.
 * @returns {Promise<void>} Resolves when the build process and cleanup are completed successfully.
 * @throws {Error} If the build process fails or if an error occurs during cleanup.
 */
export async function runBuildAndClean(projectPath: string, dirToClean: string): Promise<void> {
    const commandRunner = new CommandRunner();

    try {
        await commandRunner.run('npm', ['run', 'build'], { cwd: projectPath });

        if (fs.existsSync(dirToClean)) {
            deleteJsMapFiles(dirToClean);
        } else {
            console.warn(`No directory found at ${dirToClean}`);
        }
    } catch (e) {
        console.error(`Error during build and clean: ${e.message}`);
        throw e;
    }
}
