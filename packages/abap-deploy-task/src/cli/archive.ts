import { ZipFile } from 'yazl';
import { readdirSync, readFile, statSync } from 'fs';
import { join, relative } from 'path';
import type { CliOptions } from '../types';
import { createBuffer } from '../base/archive';
import type { Logger } from '@sap-ux/logger';

/**
 * Get/read zip file from the given path.
 *
 * @param logger - reference to the logger instance
 * @param path - path to the zip file
 * @returns Buffer containing the zip file
 */
function getArchiveFromPath(logger: Logger, path: string): Promise<Buffer> {
    return new Promise((resolve, reject) => {
        logger.info(`Loading archive from ${path}`);
        readFile(path, (err, data) => {
            if (err) {
                reject(`Archive loading has failed. Please ensure ${path} is valid and accesible.`);
            } else {
                logger.info('Archive loaded.');
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
    throw new Error(
        `The archive url you provided could not be reached. Please ensure the URL is accessible and does not require authentication. ${url}`
    );
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
function createArchiveFromFolder(logger: Logger, path: string): Promise<Buffer> {
    try {
        logger.info(`Creating archive from ${path}.`);
        const files = getFileNames(path);
        const zip = new ZipFile();
        for (const filePath of files) {
            const relPath = relative(path, filePath);
            logger.debug(relPath);
            zip.addFile(filePath, relPath);
        }
        logger.info('Archive created.');
        return createBuffer(zip);
    } catch (error) {
        throw new Error(`Archive creation has failed. Please ensure ${path} is valid and accesible.`);
    }
}

/**
 * Get a zipped archived based on the given options.
 *
 * @param logger - reference to the logger instance
 * @param options
 * @returns Buffer containing the zip file
 */
export async function getArchive(logger: Logger, options: CliOptions): Promise<Buffer> {
    if (options.archivePath) {
        return getArchiveFromPath(logger, options.archivePath);
    } else if (options.archiveUrl) {
        return fetchArchiveFromUrl(options.archiveUrl);
    } else {
        return createArchiveFromFolder(logger, options.archiveFolder ?? join(process.cwd(), 'dist'));
    }
}
