import * as fs from 'fs';
import * as path from 'path';
import { exec } from 'child_process';

/**
 * Deletes all `.js.map` files in the specified directory and its subdirectories.
 *
 * @param directory The directory to search for `.js.map` files.
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
 * Executes a command and waits for its completion.
 *
 * @param projectPath The path to the project directory.
 * @param command The command to execute.
 * @returns A promise that resolves when the command completes.
 */
function runCommand(projectPath: string, command: string): Promise<void> {
    return new Promise((resolve, reject) => {
        const buildProcess = exec(command, { cwd: projectPath });

        buildProcess.stdout?.on('data', (data) => console.log(data.toString()));
        buildProcess.stderr?.on('data', (data) => console.error(data.toString()));

        buildProcess.on('close', (code) => {
            if (code === 0) {
                resolve();
            } else {
                reject(new Error(`Command "${command}" exited with code ${code}`));
            }
        });
    });
}

/**
 * Executes the build process and deletes `.js.map` files from the specified directory.
 *
 * @param projectPath The path to the project directory.
 * @param dirToClean The directory to clean after the build.
 */
export async function runBuildAndClean(projectPath: string, dirToClean: string): Promise<void> {
    try {
        console.log('Running build command...');
        await runCommand(projectPath, 'npm run build');

        console.log('Build completed. Cleaning up .js.map files...');
        if (fs.existsSync(dirToClean)) {
            deleteJsMapFiles(dirToClean);
            console.log('Cleanup completed successfully!');
        } else {
            console.warn(`No directory found at ${dirToClean}`);
        }
    } catch (error) {
        console.error(`Error during build and clean: ${error.message}`);
        throw error;
    }
}
