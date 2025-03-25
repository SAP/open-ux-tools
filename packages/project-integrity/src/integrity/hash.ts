import { createReadStream, existsSync } from 'fs';
import { createHash } from 'crypto';
import type { Content, ContentIntegrity, FileIntegrity } from '../types';


/**
 * Sanitizes the input text by normalizing line endings, removing empty lines,
 * and trimming unnecessary spaces. This ensures consistent formatting.
 *
 * @param input - The input to sanitize, either as a `Buffer` or a `string`.
 * @returns The sanitized text as a `string`.
 */
function sanitizeText(input: Buffer | string): string {
    const inputString = Buffer.isBuffer(input) ? input.toString() : input;
    const normalizedString = inputString.replace(/\r\n|\r/g, '\n'); // Normalize all line endings to '\n'
    const sanitizedString = normalizedString
        .split(' ')
        .filter((i) => !!i)
        .join('')
        .split('\n')
        .filter((i) => !!i)
        .join('\n');
    return sanitizedString;
}

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
            const sanitizedChunk = sanitizeText(chunk);
            hash.update(Buffer.from(sanitizedChunk));
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
