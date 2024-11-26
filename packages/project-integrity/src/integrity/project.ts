import { existsSync } from 'fs';
import type { CheckIntegrityResult, Content, ProjectSettings } from '../types';
import { getContentIntegrity, getFileIntegrity } from './hash';
import { readIntegrityData, writeIntegrityData } from './persistence';
import { checkIntegrity } from './check';

/**
 * Initialize a project by creating hashes for all selected files in the project.
 *
 * @param settings - settings for the project
 * @param settings.integrityFilePath - path to file where integrity data will be stored
 * @param settings.fileList - list of file paths for files to create integrity data for
 * @param [settings.additionalStringContent] - optional key/string map to add to integrity data
 */
export async function initProject(settings: ProjectSettings): Promise<void> {
    const fileIntegrity = await getFileIntegrity(settings.fileList);
    const contentIntegrity = await getContentIntegrity(settings.additionalStringContent);
    await writeIntegrityData(settings.integrityFilePath, { fileIntegrity, contentIntegrity });
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
    const existingContentKeys = integrityData.contentIntegrity.map((content) => content.contentKey).sort();
    const newContentKeys = Object.keys(additionalStringContent ?? {}).sort();
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
    await writeIntegrityData(integrityFilePath, { fileIntegrity, contentIntegrity });
}
