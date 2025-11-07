import { execSync } from 'child_process';
import { existsSync, lstatSync, readdirSync, rmSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';

/**
 * Installs npm dependencies for a given project if node_modules directory is empty or doesn't exist.
 * Automatically detects the platform and uses the appropriate npm command (npm.cmd on Windows, npm on others).
 *
 * @param {string} projectPath - The absolute path to the project directory where npm install should be executed
 * @throws {Error} Throws an error if the npm install command fails
 * @returns {void}
 */
export function npmInstall(projectPath: string): void {
    const isWindows = process.platform === 'win32';
    const npmCommand = isWindows ? 'npm.cmd' : 'npm';

    // Check if node_modules exists and is not empty
    const nodeModulesPath = join(projectPath, 'node_modules');
    if (existsSync(nodeModulesPath)) {
        const stat = lstatSync(nodeModulesPath);
        if (stat.isDirectory()) {
            const contents = readdirSync(nodeModulesPath);
            if (contents.length > 0) {
                return;
            }
        }
    }

    try {
        execSync(`${npmCommand} install`, {
            cwd: projectPath,
            stdio: 'inherit'
        });
        console.log('npm install completed successfully');
    } catch (error) {
        console.error('npm install failed:', error);
        throw error;
    }
}

/**
 * Recursively removes a directory and its contents with configurable options.
 *
 * @param {string} dirPath - The absolute path to the directory to remove
 * @param {Object} [options] - Configuration options for the removal operation
 * @param {boolean} [options.skipNodeModules] - If true, skips removal of node_modules directories
 * @param {boolean} [options.preserveRoot] - If true, removes only the contents of the root directory but preserves the directory itself
 * @throws {Error} Throws an error if the removal operation fails
 * @returns {void}
 */
export function removeDirectory(
    dirPath: string,
    options: { skipNodeModules?: boolean; preserveRoot?: boolean } = {}
): void {
    const { skipNodeModules = true, preserveRoot = true } = options;

    if (!existsSync(dirPath)) {
        return;
    }

    // Skip node_modules directories if skipNodeModules is true
    if (skipNodeModules && dirPath.endsWith('node_modules')) {
        return;
    }

    try {
        if (preserveRoot) {
            // Remove contents but preserve the root directory
            const files = readdirSync(dirPath);
            for (const file of files) {
                const filePath = join(dirPath, file);
                const fileStats = lstatSync(filePath);

                if (fileStats.isDirectory()) {
                    // For subdirectories, remove completely (don't preserve)
                    removeDirectory(filePath, { skipNodeModules, preserveRoot: false });
                } else {
                    unlinkSync(filePath);
                }
            }
        } else {
            // Remove the entire directory and its contents using modern rmSync
            rmSync(dirPath, { recursive: true, force: true });
        }
    } catch (error) {
        console.error(`Failed to remove directory ${dirPath}:`, error);
        throw error;
    }
}
