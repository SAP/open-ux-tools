import { ZipFile } from 'yazl';
import { readdirSync, readFile, statSync } from 'fs';
import { join, relative } from 'path';
import type { CliOptions } from '../types';
import { createBuffer } from '../base/archive';
import { t } from '../messages';
import type { ToolsLogger } from '@sap-ux/logger';

/**
 * Get/read zip file from the given path.
 *
 * @param path - path to the zip file
 * @returns Buffer containing the zip file
 */
function getArchiveFromPath(path: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        readFile(path, (err, data) => {
            if (err) {
                reject(err);
            } else {
                resolve(data);
            }
        });
    });
}

/**
 * Fetch/get zip file from the given url.
 *
 * @param url - url to the zip file
 * @returns Buffer containing the zip file
 */
async function fetchArchiveFromUrl(url: string): Promise<Buffer> {
    // TODO
    throw new Error(t('ACHIVE_FROM_EXTERNAL_URL_ERROR', url));
}

/**
 * Helper function to recursevely get a list of all files in a given folder and its sub folders.
 *
 * @param path - path to the folder that is to be searched
 * @returns list of files names
 */
function getFileNames(path: string): string[] {
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
 * Create a zipped file containing all files in the given folder.
 *
 * @param logger
 * @param path - path to the folder that is to be zipped
 * @returns Buffer containing the zip file
 */
function createArchiveFromFolder(logger: ToolsLogger, path: string): Promise<Buffer> {
    const files = getFileNames(path);
    const zip = new ZipFile();
    for (const filePath of files) {
        const relPath = relative(path, filePath);
        logger.debug(relPath);
        zip.addFile(filePath, relPath);
    }
    return createBuffer(zip);
}

/**
 * Get a zipped archived based on the given options.
 *
 * @param logger
 * @param options
 * @returns Buffer containing the zip file
 */
export async function getArchive(logger: ToolsLogger, options: CliOptions): Promise<Buffer> {
    if (options.archivePath) {
        return getArchiveFromPath(options.archivePath);
    } else if (options.archiveUrl) {
        return fetchArchiveFromUrl(options.archiveUrl);
    } else {
        return createArchiveFromFolder(logger, options.archiveFolder ?? join(process.cwd(), 'dist'));
    }
}
