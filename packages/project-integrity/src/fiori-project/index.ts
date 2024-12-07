import { existsSync } from 'fs';
import { join } from 'path';
import { getCapCustomPaths } from '@sap-ux/project-access';
import {
    checkProjectIntegrity,
    disableProjectIntegrity,
    enableProjectIntegrity,
    initProject,
    isProjectIntegrityEnabled,
    updateProjectIntegrity
} from '../integrity';
import { findFilesByExtension } from '@sap-ux/project-access/dist/file';
import type { CheckIntegrityResult, Content } from '../types';

export const fioriIntegrityDataPath = join('.fiori-ai/ai-integrity.json');

/**
 * Get the list of files to protect the integrity of.
 *
 * @param projectRoot - root folder of the project
 * @returns - list of file paths
 */
async function getFileList(projectRoot: string): Promise<string[]> {
    const fileList: string[] = [];

    const schemaCds = join(projectRoot, 'db/schema.cds');
    if (existsSync(schemaCds)) {
        fileList.push(schemaCds);
    } else {
        throw new Error(`File ${schemaCds} does not exist.`);
    }
    const servicesCds = join(projectRoot, 'srv/service.cds');
    if (existsSync(servicesCds)) {
        fileList.push(servicesCds);
    } else {
        throw new Error(`File ${servicesCds} does not exist.`);
    }

    const csvFiles = await findFilesByExtension('.csv', projectRoot, ['node_modules']);
    fileList.push(...csvFiles);

    return fileList;
}

/**
 * Returns additional string content, like the CAP environment.
 * This content will be stored in the integrity data.
 *
 * @param projectRoot - root folder of the project
 * @returns - additional content to store in the integrity data
 */
async function getAdditionalStringContent(projectRoot: string): Promise<Content> {
    const capCustomPaths = await getCapCustomPaths(projectRoot);
    return { capPaths: JSON.stringify(capCustomPaths) };
}

/**
 * Initialize a Fiori project for integrity protection.
 *
 * @param projectRoot - root folder of the project
 */
export async function initFioriProject(projectRoot: string): Promise<void> {
    const integrityFilePath = join(projectRoot, fioriIntegrityDataPath);
    const fileList = await getFileList(projectRoot);
    const additionalStringContent = await getAdditionalStringContent(projectRoot);
    await initProject({ integrityFilePath, fileList, additionalStringContent });
}

/**
 * Check the integrity of a Fiori project.
 *
 * @param projectRoot - root folder of the project
 * @returns - results of the check
 */
export async function checkFioriProjectIntegrity(projectRoot: string): Promise<CheckIntegrityResult> {
    const integrityFilePath = join(projectRoot, fioriIntegrityDataPath);
    const additionalStringContent = await getAdditionalStringContent(projectRoot);
    return checkProjectIntegrity(integrityFilePath, additionalStringContent);
}

/**
 * Updates the integrity data of a Fiori project.
 *
 * @param projectRoot - root folder of the project
 */
export async function updateFioriProjectIntegrity(projectRoot: string): Promise<void> {
    const integrityFilePath = join(projectRoot, fioriIntegrityDataPath);
    const additionalStringContent = await getAdditionalStringContent(projectRoot);
    await updateProjectIntegrity(integrityFilePath, additionalStringContent);
}

/**
 * Return whether integrity is enabled for a Fiori project.
 *
 * @param projectRoot - root folder of the project
 * @returns true if integrity is enabled, false otherwise
 */
export async function isFioriProjectIntegrityEnabled(projectRoot: string): Promise<boolean> {
    const integrityFilePath = join(projectRoot, fioriIntegrityDataPath);
    return isProjectIntegrityEnabled(integrityFilePath);
}

/**
 * Enable integrity protection for a Fiori project. The Fiori project must be initialized first.
 * After initialization, Fiori project integrity is enabled by default.
 *
 * @param projectRoot - root folder of the project
 */
export async function enableFioriProjectIntegrity(projectRoot: string): Promise<void> {
    const integrityFilePath = join(projectRoot, fioriIntegrityDataPath);
    await enableProjectIntegrity(integrityFilePath);
}

/**
 * Disable integrity protection for a Fiori project. The Fiori project must be initialized first.
 *
 * @param projectRoot - root folder of the project
 */
export async function disableFioriProjectIntegrity(projectRoot: string): Promise<void> {
    const integrityFilePath = join(projectRoot, fioriIntegrityDataPath);
    await disableProjectIntegrity(integrityFilePath);
}
