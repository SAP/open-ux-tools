import type { Logger } from '@sap-ux/logger';
import axios from 'axios';
import { readFile } from 'fs';
import { Agent } from 'https';
import { relative } from 'path';
import { ZipFile } from 'yazl';
import { createBuffer, getFileNames } from '../base/archive';
import type { CliOptions } from '../types';

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
                reject(`Archive loading has failed. Please ensure ${path} is valid and accessible.`);
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
 * @param rejectUnauthorized - strict SSL handling or not
 * @returns Buffer containing the zip file
 */
async function fetchArchiveFromUrl(url: string, rejectUnauthorized?: boolean): Promise<Buffer> {
    try {
        const response = await axios.get(url, {
            httpsAgent: new Agent({ rejectUnauthorized }),
            responseType: 'arraybuffer'
        });
        return response.data;
    } catch (error) {
        throw new Error(
            `The archive url you provided could not be reached. Please ensure the URL is accessible and does not require authentication. ${error}`
        );
    }
}

/**
 * Create a zipped file containing all files in the given folder.
 *
 * @param logger - reference to the logger instance
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
            logger.debug(`Adding ${relPath}`);
            zip.addFile(filePath, relPath);
        }
        logger.info(`Archive created from ${path}.`);
        return createBuffer(zip);
    } catch (error) {
        throw new Error(`Archive creation has failed. Please ensure ${path} is valid and accessible.`);
    }
}

/**
 * Get a zipped archived based on the given options.
 *
 * @param logger - reference to the logger instance
 * @param options - options provided via CLI
 * @returns Buffer containing the zip file
 */
export async function getArchive(logger: Logger, options: CliOptions): Promise<Buffer> {
    if (options.archivePath) {
        return getArchiveFromPath(logger, options.archivePath);
    } else if (options.archiveUrl) {
        return fetchArchiveFromUrl(options.archiveUrl, options.strictSsl);
    } else {
        return createArchiveFromFolder(logger, options.archiveFolder ?? process.cwd());
    }
}
