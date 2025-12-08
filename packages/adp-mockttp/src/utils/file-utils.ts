import AdmZip from 'adm-zip';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import { MOCK_DATA_FOLDER_PATH } from '../server-constants';
import { logger } from './logger';

const SHA256_ALGORITHM = 'sha256';

interface FileInfo {
    name: string;
    hash: string;
}

const alphabeticalOrder = (fileA: FileInfo, fileB: FileInfo): number => fileA.name.localeCompare(fileB.name);

export function createMockDataFolderIfNeeded(): Promise<string | undefined> {
    return fs.mkdir(MOCK_DATA_FOLDER_PATH, { recursive: true });
}

export function normalizeZipFileContent(buffer: Buffer): string {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();
    logger.info('zip ' + zip.toBuffer().length / (1024 * 1024));

    // Create a deterministic stable representation.
    const fileInfos = entries.map((entry) => ({
        name: entry.entryName,
        // Use a stable hash of file content.
        hash: getFileContentStableHash(entry.getData())
    }));

    // Sort so order doesn’t matter.
    fileInfos.sort(alphabeticalOrder);

    return JSON.stringify(fileInfos);
}

function getFileContentStableHash(fileDataBuffer: Buffer): string {
    // We use Uint8Array since Buffer inherits Uint8Array.
    const fileDataBufferToArray = Uint8Array.from(fileDataBuffer);
    return createHash(SHA256_ALGORITHM).update(fileDataBufferToArray).digest('hex');
}
