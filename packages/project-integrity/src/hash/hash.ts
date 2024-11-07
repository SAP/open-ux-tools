import { createReadStream, existsSync } from 'fs';
import { createHash } from 'crypto';
import type { CheckFileHashResult, FileHash } from '../types';

/**
 * Create a md5 hash for a given file.
 *
 * @param filePath - path to file
 * @returns - promise that resolves to a FileHash object
 */
async function computeHash(filePath: string): Promise<FileHash> {
    return new Promise((resolve, reject) => {
        const hash = createHash('md5');
        const fileStream = createReadStream(filePath);
        fileStream.on('data', (chunk: Buffer) => hash.update(chunk));
        fileStream.on('end', () => resolve({ filePath, hash: hash.digest('hex') }));
        fileStream.on('error', (err) => reject(err));
    });
}

/**
 * Create file hashes for a given list of files.
 *
 * @param files - list of files to
 * @returns - promise that resolves to an array of FileHash objects
 */
export async function computeFileHashes(files: string[]): Promise<FileHash[]> {
    const existingFiles = files.filter((file) => existsSync(file));
    const promises = existingFiles.map(computeHash);
    const results = await Promise.all(promises);
    return results;
}

/**
 * Check an array of file hashes against the current state of the files.
 *
 * @param fileHashes - array of FileHash objects
 * @returns - results of the check
 */
export async function checkFileHashes(fileHashes: FileHash[]): Promise<CheckFileHashResult> {
    const differentFiles: string[] = [];
    const equalFiles: string[] = [];
    const checkFiles = [];

    for (const fileHash of fileHashes) {
        if (!existsSync(fileHash.filePath)) {
            differentFiles.push(fileHash.filePath);
        } else {
            checkFiles.push(fileHash);
        }
    }
    const newHashes = await computeFileHashes(checkFiles.map((fileHash) => fileHash.filePath));
    for (const newHash of newHashes) {
        const oldHash = checkFiles.find((fileHash) => fileHash.filePath === newHash.filePath);
        if (oldHash && oldHash.hash === newHash.hash) {
            equalFiles.push(oldHash.filePath);
        } else {
            differentFiles.push(newHash.filePath);
        }
    }
    return { differentFiles, equalFiles };
}
