import { readdirSync, statSync } from 'fs';
import { join } from 'path';
import type { ZipFile } from 'yazl';

/**
 * Helper function to recursively get a list of all files in a given folder and its sub folders.
 *
 * @param path - path to the folder that is to be searched
 * @returns list of files names
 */
export function getFileNames(path: string): string[] {
    const names: string[] = [];

    const files = readdirSync(path);
    for (const file of files) {
        const filePath = join(path, file);
        if (statSync(filePath).isDirectory()) {
            names.push(...getFileNames(filePath));
        } else {
            names.push(filePath);
        }
    }
    return names;
}

/**
 * Create a zip file based on the given object.
 *
 * @param zip zip file as object
 * @returns the zip file as buffer
 */
export async function createBuffer(zip: ZipFile): Promise<Buffer> {
    await new Promise<void>((resolve) => {
        zip.end({ forceZip64Format: false }, () => {
            resolve();
        });
    });

    const chunks: Buffer[] = [];
    for await (const chunk of zip.outputStream) {
        chunks.push(chunk as Buffer);
    }

    return Buffer.concat(chunks);
}
