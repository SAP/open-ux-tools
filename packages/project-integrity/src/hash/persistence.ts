import { mkdir, readFile, writeFile } from 'fs/promises';
import { existsSync } from 'fs';
import { dirname, join, relative } from 'path';
import type { FileHash } from '../types';

const defaultHashDataPath = join('.fiori-ai/hash-map.json');

/**
 * Read hashes from a previously stored hash file.
 * Throws an error if the file does not exist.
 *
 * @param projectRoot - root folder of the project
 * @param [relativeHashPath] - optional path to the hash file, default is '.fiori-ai/hash-map.json'
 * @returns - promise that resolves to an array of FileHash objects
 */
export async function readHashes(
    projectRoot: string,
    relativeHashPath: string = defaultHashDataPath
): Promise<FileHash[]> {
    const hashPath = join(projectRoot, relativeHashPath);
    if (!existsSync(hashPath)) {
        throw new Error(`Hash file not found at ${hashPath}`);
    }
    const fileHashes = JSON.parse(await readFile(hashPath, { encoding: 'utf-8' })) as FileHash[];
    const hashDir = dirname(hashPath);
    const absoluteFileHashes = fileHashes.map((fileHash) => ({
        filePath: join(hashDir, fileHash.filePath),
        hash: fileHash.hash
    }));
    return absoluteFileHashes;
}

/**
 * Write hashes to a hash file. When storing, use relative paths to the hash file
 * so the project as whole can be moved without breaking integrity.
 *
 * @param projectRoot - root folder of the project
 * @param fileHashes - array of FileHash objects
 * @param [relativeHashPath] - optional path to the hash file, default is '.fiori-ai/hash-map.json'
 */
export async function writeHashes(
    projectRoot: string,
    fileHashes: FileHash[],
    relativeHashPath: string = defaultHashDataPath
): Promise<void> {
    const hashPath = join(projectRoot, relativeHashPath);
    const hashDir = dirname(hashPath);
    if (!existsSync(hashDir)) {
        await mkdir(hashDir, { recursive: true });
    }

    const relativeFileHashes = fileHashes.map((fileHash) => ({
        filePath: relative(hashDir, fileHash.filePath),
        hash: fileHash.hash
    }));
    await writeFile(hashPath, JSON.stringify(relativeFileHashes), { encoding: 'utf-8' });
}
