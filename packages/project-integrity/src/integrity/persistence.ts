import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, relative } from 'path';
import type { Integrity } from '../types';

/**
 * Read hashes from a previously stored hash file.
 * Throws an error if the file does not exist.
 *
 * @param integrityFilePath - path to the integrity file
 * @returns - integrity data
 */
export async function readIntegrityData(integrityFilePath: string): Promise<Integrity> {
    if (!existsSync(integrityFilePath)) {
        throw new Error(`Integrity file not found at ${integrityFilePath}`);
    }
    const content = JSON.parse(await readFile(integrityFilePath, { encoding: 'utf-8' })) as Integrity;
    const integrityDir = dirname(integrityFilePath);
    for (const fileIntegrity of content.fileIntegrity) {
        fileIntegrity.filePath = join(integrityDir, fileIntegrity.filePath);
    }
    return content;
}

/**
 * Write file integrity information to file. When storing, use relative paths to the hash file
 * so the project as whole can be moved without breaking integrity.
 *
 * @param integrityFilePath - path to the integrity file
 * @param content - content to write to the integrity file
 */
export async function writeIntegrityData(integrityFilePath: string, content: Integrity): Promise<void> {
    const integrityDir = dirname(integrityFilePath);
    if (!existsSync(integrityDir)) {
        await mkdir(integrityDir, { recursive: true });
    }

    for (const fileIntegrity of content.fileIntegrity) {
        fileIntegrity.filePath = relative(integrityDir, fileIntegrity.filePath);
    }
    await writeFile(integrityFilePath, JSON.stringify(content, null, 4), { encoding: 'utf-8' });
}
