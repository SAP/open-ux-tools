import { existsSync } from 'fs';
import type { CheckIntegrityResult, Content, ProjectSettings } from '../types';
import { getContentIntegrity, getFileIntegrity } from './hash';
import { readIntegrityData, writeIntegrityData } from './persistence';
import { checkIntegrity } from './check';

/**
 * Function to ensure correct sorting of strings.
 *
 * @param a - first value to compare
 * @param b - second value to compare
 * @returns - 1 if a is greater than b, -1 if a is less than b, 0 if a is equal to b
 */
const sortLocal = (a: string, b: string): number => a.localeCompare(b);

/**
 * Initialize a project by creating hashes for all selected files in the project. There is an option to add
 * additional key->string content to the integrity data.
 *
 * @param settings - settings for the project
 * @param settings.integrityFilePath - path to file where integrity data will be stored
 * @param settings.fileList - list of file paths for files to create integrity data for
 * @param [settings.additionalStringContent] - optional key/string map to add to integrity data
 */
export async function initProject(settings: ProjectSettings): Promise<void> {
    const enabled = true;
    const fileIntegrity = await getFileIntegrity(settings.fileList);
    const contentIntegrity = await getContentIntegrity(settings.additionalStringContent);
    await writeIntegrityData(settings.integrityFilePath, { enabled, fileIntegrity, contentIntegrity });
}

/**
 * Check the integrity of a project by comparing the stored integrity data with the current state
 * of the files and additional key->string. Throws an error if the project is not initialized,
 * which means no integrity data found at 'integrityFilePath'.
 *
 * @param integrityFilePath - path to file where integrity data is stored
 * @param [additionalStringContent] - optional key/string map to add to integrity data
 * @returns - results of the check
 */
export async function checkProjectIntegrity(
    integrityFilePath: string,
    additionalStringContent?: Content
): Promise<CheckIntegrityResult> {
    const integrityData = await readIntegrityData(integrityFilePath);
    if (!integrityData.enabled) {
        throw new Error(`Integrity is disabled for the project with integrity data ${integrityFilePath}`);
    }
    const checkResult = checkIntegrity(integrityData, additionalStringContent);
    return checkResult;
}

/**
 * Updates the integrity data of a project. Throws an error if a file or string content is missing
 * or new.
 *
 * @param integrityFilePath - path to file where integrity data is stored
 * @param additionalStringContent - optional key/string map to add to integrity data
 */
export async function updateProjectIntegrity(
    integrityFilePath: string,
    additionalStringContent?: Content
): Promise<void> {
    if (!existsSync(integrityFilePath)) {
        throw new Error(`Integrity data not found at ${integrityFilePath}`);
    }
    const integrityData = await readIntegrityData(integrityFilePath);
    if (!integrityData.enabled) {
        throw new Error(`Integrity is disabled for the project with integrity data ${integrityFilePath}`);
    }
    const existingContentKeys = integrityData.contentIntegrity.map((content) => content.contentKey).sort(sortLocal);
    const newContentKeys = Object.keys(additionalStringContent ?? {}).sort(sortLocal);
    if (
        existingContentKeys.length !== newContentKeys.length ||
        !existingContentKeys.every((key, index) => key === newContentKeys[index])
    ) {
        throw new Error(
            `There is a mismatch of additional content keys.
Stored content keys: ${existingContentKeys.join(', ')}
New content keys: ${newContentKeys.join(', ')}`
        );
    }
    const fileIntegrity = await getFileIntegrity(integrityData.fileIntegrity.map((file) => file.filePath));
    const contentIntegrity = getContentIntegrity(additionalStringContent);
    await writeIntegrityData(integrityFilePath, { enabled: integrityData.enabled, fileIntegrity, contentIntegrity });
}

/**
 * Return whether integrity is enabled for a project.
 *
 * @param integrityFilePath - path to file where integrity data is stored
 * @returns - true if integrity is enabled, false otherwise
 */
export async function isProjectIntegrityEnabled(integrityFilePath: string): Promise<boolean> {
    if (!existsSync(integrityFilePath)) {
        throw new Error(`Integrity data not found at ${integrityFilePath}`);
    }
    const { enabled } = await readIntegrityData(integrityFilePath);
    return enabled;
}

/**
 * Enable integrity for a project. The project has to be initialized before enabling integrity. After initialization,
 * the project integrity is enabled by default.
 *
 * @param integrityFilePath - path to file where integrity data is stored
 */
export async function enableProjectIntegrity(integrityFilePath: string): Promise<void> {
    if (!existsSync(integrityFilePath)) {
        throw new Error(`Integrity data not found at ${integrityFilePath}`);
    }
    const integrityData = await readIntegrityData(integrityFilePath);
    if (!integrityData.enabled) {
        integrityData.enabled = true;
        await writeIntegrityData(integrityFilePath, integrityData);
    }
}

/**
 * Disable integrity for a project. The project has to be initialized before disabling integrity.
 *
 * @param integrityFilePath - path to file where integrity data is stored
 */
export async function disableProjectIntegrity(integrityFilePath: string): Promise<void> {
    if (!existsSync(integrityFilePath)) {
        throw new Error(`Integrity data not found at ${integrityFilePath}`);
    }
    const integrityData = await readIntegrityData(integrityFilePath);
    if (integrityData.enabled) {
        integrityData.enabled = false;
        await writeIntegrityData(integrityFilePath, integrityData);
    }
}
