import { readdirSync, statSync } from 'fs';
import { checkFileHashes, computeFileHashes, readHashes, writeHashes } from '../hash';
import type { CheckFileHashResult, ProjectSettings } from '../types';
import { basename, join } from 'path';

/**
 * Get the list of files to protect the integrity of.
 *
 * @param projectRoot - root folder of the project
 * @param [excludeFileNames] - optional list of file names to exclude
 * @returns - list of file paths
 */
function getFileList(projectRoot: string, excludeFileNames = new Set(['.DS_Store'])): string[] {
    const fileList: string[] = [];

    // TODO: Implement logic to select files from project, for now get all files.
    const traverseDirectory = (dir: string): void => {
        const stats = statSync(dir);

        if (stats.isFile()) {
            if (!excludeFileNames.has(basename(dir))) {
                fileList.push(dir);
            }
        } else if (stats.isDirectory()) {
            const files = readdirSync(dir);
            files.forEach((file) => {
                const filePath = join(dir, file);
                traverseDirectory(filePath);
            });
        }
    };
    traverseDirectory(projectRoot);
    return fileList;
}

/**
 * Initialize a project by creating hashes for all selected files in the project.
 *
 * @param projectRoot - root folder of the project
 * @param settings - optional settings for the project
 */
export async function initProject(projectRoot: string, settings?: ProjectSettings): Promise<void> {
    const fileList = settings?.fileList ?? (await getFileList(projectRoot));

    const hashData = await computeFileHashes(fileList);
    await writeHashes(projectRoot, hashData);
}

/**
 * Check the integrity of a project by comparing the stored file hashes with the current state of the files.
 * Throws an error if the project is not initialized (no hash file found).
 *
 * @param projectRoot - root folder of the project
 * @returns - results of the check
 */
export async function checkProjectIntegrity(projectRoot: string): Promise<CheckFileHashResult> {
    const storedHashes = await readHashes(projectRoot);
    return await checkFileHashes(storedHashes);
}
