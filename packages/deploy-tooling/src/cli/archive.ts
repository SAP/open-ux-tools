import axios from 'axios';
import { readFile } from 'node:fs/promises';
import ZipFile from 'adm-zip';
import type { CliOptions } from '../types';
import type { Logger } from '@sap-ux/logger';
import { Agent } from 'node:https';

/**
 * Get/read zip file from the given path.
 *
 * @param logger - reference to the logger instance
 * @param path - path to the zip file
 * @returns Buffer containing the zip file
 */
async function getArchiveFromPath(logger: Logger, path: string): Promise<Buffer> {
    logger.info(`Loading archive from ${path}`);
    try {
        const data = await readFile(path);
        logger.info(`Archive loaded from ${path}`);
        return data;
    } catch (err) {
        throw new Error(`Loading archive has failed. Please ensure ${path} is valid and accessible.`);
    }
}

/**
 * Fetch/get zip file from the given url.
 *
 * @param logger - reference to the logger instance
 * @param url - url to the zip file
 * @param rejectUnauthorized - strict SSL handling or not
 * @returns Buffer containing the zip file
 */
async function fetchArchiveFromUrl(logger: Logger, url: string, rejectUnauthorized?: boolean): Promise<Buffer> {
    try {
        logger.info(`Fetching archive from ${url}.`);
        const response = await axios.get(url, {
            httpsAgent: new Agent({ rejectUnauthorized }),
            responseType: 'arraybuffer'
        });
        logger.info(`Archive fetched from ${url}.`);
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
        const zip = new ZipFile();
        zip.addLocalFolder(path);
        for (const entry of zip.getEntries()) {
            logger.debug(`Adding ${entry.entryName}`);
        }
        logger.info(`Archive created from ${path}.`);
        return zip.toBufferPromise();
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
        return fetchArchiveFromUrl(logger, options.archiveUrl, options.strictSsl);
    } else {
        return createArchiveFromFolder(logger, options.archiveFolder ?? process.cwd());
    }
}
