import { existsSync } from 'fs';
import { join } from 'path';
import { getCapCustomPaths, getCapModelAndServices } from '@sap-ux/project-access';
import {
    checkProjectIntegrity,
    disableProjectIntegrity,
    enableProjectIntegrity,
    initProject,
    isProjectIntegrityEnabled,
    updateProjectIntegrity
} from '../integrity';
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
 * Retrieves the Core Schema Notation (CSN) content for a given project root.
 *
 * This function generates a JSON string containing the namespace and definitions
 * from the CSN model of the specified project root.
 *
 * @param projectRoot - The root directory of the project.
 * @returns A promise that resolves to a JSON string containing the CSN content,
 *          including the namespace and structured clone of the definitions.
 */
async function getCsnContent(projectRoot: string): Promise<string> {
    const modelFiles = { srv: join('srv', 'service.cds'), db: join('db', 'schema.cds') };
    const pathSelection = new Set(Object.keys(modelFiles) as Array<'db' | 'srv'>);
    const result = await getCapModelAndServices({ projectRoot, pathSelection });
    const csn = result.model;
    const data = { namespace: csn.namespace, definitions: structuredClone(csn.definitions) };
    return JSON.stringify(data);
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
    const csnContent = await getCsnContent(projectRoot);
    await initProject({ integrityFilePath, fileList, additionalStringContent, csnContent });
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
    const csnContent = await getCsnContent(projectRoot);
    return checkProjectIntegrity(integrityFilePath, csnContent, additionalStringContent);
}

/**
 * Updates the integrity data of a Fiori project.
 *
 * @param projectRoot - root folder of the project
 */
export async function updateFioriProjectIntegrity(projectRoot: string): Promise<void> {
    const integrityFilePath = join(projectRoot, fioriIntegrityDataPath);
    const additionalStringContent = await getAdditionalStringContent(projectRoot);
    const csnContent = await getCsnContent(projectRoot);
    await updateProjectIntegrity(integrityFilePath, csnContent, additionalStringContent);
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

/**
 * Check if the Fiori project integrity is initialized for given root path of a project.
 * This is also true if the Fiori project is disabled, but the integrity data is present.
 *
 * @param projectRoot - root folder of the project
 * @returns - true if the Fiori project integrity is initialized, false otherwise
 */
export function isFioriProjectIntegrityInitialized(projectRoot: string): boolean {
    return existsSync(join(projectRoot, fioriIntegrityDataPath));
}
