import { createReadStream, existsSync } from 'fs';
import { createHash } from 'crypto';
import type { Content, ContentIntegrity, FileIntegrity } from '../types';
import { join, dirname } from 'path';
import { getCapModelAndServices } from '@sap-ux/project-access';

/**
 * Create a md5 hash for a given file.
 *
 * @param filePath - path to file
 * @returns - promise that resolves to a FileHash object
 */
async function computeFileIntegrityData(filePath: string): Promise<FileIntegrity> {
    return new Promise((resolve, reject) => {
        let content = '';
        const hash = createHash('md5');
        const fileStream = createReadStream(filePath);
        fileStream.on('data', (chunk: Buffer) => {
            content += chunk.toString();
            hash.update(chunk);
        });
        fileStream.on('end', () => resolve({ filePath, hash: hash.digest('hex'), content }));
        fileStream.on('error', (err) => reject(err));
    });
}

/**
 * Returns integrity data for a list of given files.
 *
 * @param files - list of files to
 * @returns - promise that resolves to an array of FileHash objects
 */
export async function getFileIntegrity(files: string[]): Promise<FileIntegrity[]> {
    const nonExistingFiles = files.filter((file) => !existsSync(file));
    if (nonExistingFiles.length > 0) {
        throw new Error(`The following files do not exist: ${nonExistingFiles.join(', ')}`);
    }
    const promises = files.map(computeFileIntegrityData);
    return await Promise.all(promises);
}

/**
 * Returns content integrity data for a map of key/value (string).
 *
 * @param additionalStringContent - key value map of additional content to write as integrity data
 * @returns - array of
 */
export function getContentIntegrity(additionalStringContent?: Content): ContentIntegrity[] {
    const contentIntegrity: ContentIntegrity[] = [];
    if (additionalStringContent) {
        for (const contentKey in additionalStringContent) {
            const content = additionalStringContent[contentKey];
            contentIntegrity.push({
                contentKey,
                hash: createHash('md5').update(content).digest('hex'),
                content
            });
        }
    }
    return contentIntegrity;
}


/**
 * Finds the root of the project by locating the nearest package.json file.
 *
 * @param startPath - The starting directory to begin the search.
 * @returns The path to the project root directory, or null if not found.
 */
export function findProjectRoot(startPath: string): string | null {
    let currentDir = startPath;

    while (currentDir !== dirname(currentDir)) {
        const fioriAiPath = join(currentDir, '.fiori-ai');

        // Check for .fiori-ai directory
        if (existsSync(fioriAiPath)) {
            return currentDir;
        }
        currentDir = dirname(currentDir);
    }

    return null; // Return null if no package.json is found
}

/**
 * Get the model files for the project.
 *
 * @returns {{ srv: string; db: string }} An object containing the paths to the service and database schema files.
 */
export function getModelFiles(): { srv: string; db: string } {
    const schemaFileName = join('db', 'schema.cds');
    const serviceFileName = join('srv', 'service.cds');
    return { srv: serviceFileName, db: schemaFileName };
}

export async function getCsnIntegrity(projectRoot: string): Promise<string> {
    const modelFiles = getModelFiles();
    const pathSelection = new Set(Object.keys(modelFiles) as Array<'db' | 'srv'>);
    const result = await getCapModelAndServices({ projectRoot, pathSelection });
    const csn = result.model;
    const data = { namespace: csn.namespace, definitions: structuredClone(csn.definitions) }; // todo Sort definitions
    const hash = createHash('md5');
    hash.update(JSON.stringify(data));
    return hash.digest('hex');
}