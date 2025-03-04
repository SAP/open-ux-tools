import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, relative } from 'path';
import { compressToBase64, decompressFromBase64 } from 'lz-string';
import type { ContentIntegrity, FileIntegrity, Integrity } from '../types';

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
        getifyContent(fileIntegrity);
    }
    for (const contentIntegrity of content.contentIntegrity) {
        getifyContent(contentIntegrity);
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
    const contentWithoutGetter: Integrity = {
        enabled: content.enabled,
        fileIntegrity: [],
        contentIntegrity: []
    };

    for (const fileIntegrity of content.fileIntegrity) {
        const filePath = relative(integrityDir, fileIntegrity.filePath);
        let content: string | undefined;
        if (typeof fileIntegrity.content === 'string') {
            content = compressToBase64(fileIntegrity.content);
        }
        contentWithoutGetter.fileIntegrity.push({ filePath, content, hash: fileIntegrity.hash });
    }

    for (const contentIntegrity of content.contentIntegrity) {
        if (typeof contentIntegrity.content === 'string') {
            const content = compressToBase64(contentIntegrity.content);
            contentWithoutGetter.contentIntegrity.push({
                contentKey: contentIntegrity.contentKey,
                content,
                hash: contentIntegrity.hash
            });
        }
    }

    await writeFile(integrityFilePath, JSON.stringify(contentWithoutGetter), { encoding: 'utf-8' });
}

/**
 * Wrap content with getter to decompress on first access. Do nothing if the content does not exist.
 *
 * @param integrityObject - file or content integrity data with compressed content
 */
function getifyContent(integrityObject: FileIntegrity | ContentIntegrity): void {
    if (typeof integrityObject?.content === 'string') {
        const compressedContent = integrityObject.content;
        let content: string | undefined;
        Object.defineProperty(integrityObject, 'content', {
            get: () => {
                if (!content) {
                    content = decompressFromBase64(compressedContent);
                }
                return content;
            },
            set: () => {
                // Read-only property, ignore content changes
            }
        });
    }
}
