import { existsSync } from 'fs';
import { join } from 'path';
import { initProject } from '../integrity';
import { getCapEnvironment } from '@sap-ux/project-access';
import type { Content } from '../types';

export const fioriIntegrityDataPath = join('.fiori-ai/hash-map.json');

/**
 * Get the list of files to protect the integrity of.
 *
 * @param projectRoot - root folder of the project
 * @returns - list of file paths
 */
function getFileList(projectRoot: string): string[] {
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
    const capEnv = await getCapEnvironment(projectRoot);
    return { capEnv: JSON.stringify(capEnv) };
}

/**
 * Initialize a Fiori project for integrity protection.
 *
 * @param projectRoot - root folder of the project
 */
export async function initFioriProject(projectRoot: string): Promise<void> {
    const integrityFilePath = join(projectRoot, fioriIntegrityDataPath);
    const fileList = getFileList(projectRoot);
    const additionalStringContent = await getAdditionalStringContent(projectRoot);
    await initProject({ integrityFilePath, fileList, additionalStringContent });
}
