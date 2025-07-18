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
import { getContentIntegrity, getFileIntegrity } from '../integrity/hash';
import { readIntegrityData, writeIntegrityData } from '../integrity/persistence';

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
 * Returns additional string content, like the CAP environment.
 * This content will be stored in the integrity data.
 *
 * @param projectRoot - root folder of the project
 * @returns - additional content to store in the integrity data
 */
async function getAdditionalStringContent(projectRoot: string): Promise<Content> {
    const capCustomPaths = await getCapCustomPaths(projectRoot);
    const cnsContent = await getCsnContent(projectRoot);
    return { capPaths: JSON.stringify(capCustomPaths), csn: cnsContent };
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
    const checkResult = await checkProjectIntegrity(integrityFilePath, additionalStringContent);
    const integrityData = await readIntegrityData(integrityFilePath);
    /**
     * 1. if csn integrity is the same, but file integrity is different, then is compatible changes (e.g empty spaces, new lines or comments). Add them to equal files, update integrity and remove cds files from different files,
     * 2. if csn integrity is different, but file integrity is same, then CDS compiler might have produced different CSN. Remove csnPath from different content and add it to equal content. Update integrity.
     * 3. if csn integrity is different and file integrity is different, then it is un-compatible changes. Report them.
     */
    const csnDiff = checkResult.additionalStringContent?.differentContent.some((content) => content.key === 'csn');
    const fileDiff = checkResult.files.differentFiles.some((file) => file.filePath.endsWith('.cds'));
    if (csnDiff === false && fileDiff === true) {
        // case 1
        checkResult.files.equalFiles.push(...checkResult.files.differentFiles.map((file) => file.filePath));
        // also update integrity.json file
        const cdsDiffFiles = checkResult.files.differentFiles.filter((file) => file.filePath.endsWith('.cds'));
        const diffFileIntegrity = await getFileIntegrity(cdsDiffFiles.map((file) => file.filePath));

        const fileIntegrity = integrityData.fileIntegrity.map((file) => {
            const diffFile = diffFileIntegrity.find((diff) => diff.filePath === file.filePath);
            if (diffFile) {
                return { ...file, hash: diffFile.hash, content: diffFile.content };
            }
            return file;
        });
        await writeIntegrityData(integrityFilePath, {
            enabled: integrityData.enabled,
            fileIntegrity,
            contentIntegrity: integrityData.contentIntegrity
        });
        // remove cds files from different files
        checkResult.files.differentFiles = checkResult.files.differentFiles.filter(
            (file) => !file.filePath.endsWith('.cds')
        );
    }
    if (csnDiff === true && fileDiff === false) {
        // case 2
        const csnIndex = checkResult.additionalStringContent.differentContent.findIndex(
            (content) => content.key === 'csn'
        );
        const [csnContent] = checkResult.additionalStringContent.differentContent.splice(csnIndex, 1);
        checkResult.additionalStringContent.equalContent.push(csnContent.key);
        // update csn content
        const contentIntegrity = getContentIntegrity(additionalStringContent);
        await writeIntegrityData(integrityFilePath, {
            enabled: integrityData.enabled,
            fileIntegrity: integrityData.fileIntegrity,
            contentIntegrity
        });
    }
    // case 3 or return checkResult of case 1 or 2
    return checkResult;
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
