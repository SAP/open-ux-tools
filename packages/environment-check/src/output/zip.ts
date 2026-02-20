import { createWriteStream } from 'node:fs';
import * as archiver from 'archiver';
import type { EnvironmentCheckResult } from '../types';
import { byteNumberToSizeString } from '../formatter';
import { convertResultsToMarkdown } from './markdown';

/**
 * Store output results to zip archive. This includes the markdown report and the raw JSON.
 *
 * @param results - environment check results
 * @param targetFile - path and filename of target zip archive. Default is 'envcheck-results.zip'.
 */
export function storeResultsZip(results: EnvironmentCheckResult, targetFile = 'envcheck-results.zip'): void {
    const zip = archiver.default('zip', { zlib: { level: 9 } });
    const writeStream = createWriteStream(targetFile);
    writeStream.on('close', () => {
        console.log(`Results written to file '${targetFile}' ${byteNumberToSizeString(zip.pointer())}`);
    });
    zip.on('warning', (error) => {
        if (error.code === 'ENOENT') {
            console.warn(error);
        } else {
            throw error;
        }
    });
    zip.on('error', (error) => {
        throw error;
    });
    zip.pipe(writeStream);

    // After all this prep, add the files
    const markdown = Buffer.from(convertResultsToMarkdown(results));
    zip.append(markdown, { name: 'envcheck-results.md' });

    const jsonString = Buffer.from(JSON.stringify(results, null, 4));
    zip.append(jsonString, { name: 'envcheck-results.json' });

    zip.finalize()?.catch((error) => console.error(error));
}
