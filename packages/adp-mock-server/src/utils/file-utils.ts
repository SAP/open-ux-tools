import AdmZip from 'adm-zip';
import { createHash } from 'crypto';
import fs from 'fs/promises';
import { MOCK_DATA_FOLDER_PATH } from '../constants';

interface FileInfo {
    name: string;
    hash: string;
}

const SHA256_ALGORITHM = 'sha256';
const alphabeticalOrder = (fileA: FileInfo, fileB: FileInfo) => fileA.name.localeCompare(fileB.name);

export function createMockDataFolderIfNeeded(): Promise<string | undefined> {
    return fs.mkdir(MOCK_DATA_FOLDER_PATH, { recursive: true });
}

export function normalizeZipBody(buffer: Buffer): string {
    const zip = new AdmZip(buffer);
    const entries = zip.getEntries();

    // Create a deterministic stable representation.
    const fileInfos = entries.map((entry) => {
        const fileData = Uint8Array.from(entry.getData());
        return {
            name: entry.entryName,
            // Use a stable hash of file content. We use Uint8Array since Buffer inherits Uint8Array.
            hash: createHash(SHA256_ALGORITHM).update(fileData).digest('hex')
        };
    });

    // Sort so order doesn’t matter.
    fileInfos.sort(alphabeticalOrder);

    return JSON.stringify(fileInfos);
}

function getFileContentStableHash(fileDataBuffer: Buffer): string {
    const fileDataArray = Uint8Array.from(fileDataBuffer);
    return createHash(SHA256_ALGORITHM).update(fileDataArray).digest('hex');
}
