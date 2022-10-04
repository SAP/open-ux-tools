import { createWriteStream, existsSync } from 'fs';
import { basename, dirname, join } from 'path';
import * as archiver from 'archiver';
import type { EnvironmentCheckResult } from '..';
import { convertResultsToMarkdown } from '.';
import { t } from '../i18n';

/**
 * Convert a int byte number to a nice output format like 1.23 KB.
 *
 * @param byteNumber - int number of bytes
 * @returns output string
 */
function byteNumberToSizeString(byteNumber: number): string {
    if (byteNumber === 0) {
        return '0 Bytes';
    }
    const units = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB', 'EB', 'ZB', 'YB'];
    const i = Math.floor(Math.log(byteNumber) / Math.log(1024));
    return `${parseFloat((byteNumber / Math.pow(1024, i)).toFixed(2))} ${units[i]}`;
}

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

    zip.finalize();
}

/**
 * Archive a project to zip file. Result file is written to parent of the project root folder.
 *
 * @param projectRoot - root of the project, where package.json is located
 * @param targetFileName - optional file name, defaults to project folder + timestamp + .zip
 */
export async function archiveProject(
    projectRoot: string,
    targetFileName?: string
): Promise<{ path: string; size: string }> {
    return new Promise((resolve, reject) => {
        if (existsSync(projectRoot)) {
            try {
                const zip = archiver.default('zip', { zlib: { level: 9 } });
                let targetName = '';
                if (typeof targetFileName === 'string') {
                    targetName = targetFileName.toLocaleLowerCase().endsWith('.zip')
                        ? targetFileName
                        : targetFileName + '.zip';
                } else {
                    targetName = `${basename(projectRoot)}-${new Date()
                        .toISOString()
                        .replace('T', '')
                        .replace(':', '')
                        .substring(0, 14)}.zip`;
                }
                const targetPath = join(dirname(projectRoot), targetName);
                const writeStream = createWriteStream(targetPath);
                // To define which files to include/exclude archiver uses node-readdir-glob. If we use
                // ignore: ['**/node_modules/**', '**/.env'] here it takes time, as ignore still enters directories.
                // Using skip instead, which is way faster because directories are skipped completely in this
                // case (https://github.com/yqnn/node-readdir-glob#options). Unfortunately, @types/glob -> IOptions
                // hasn't skip defined. It works as it is supported by node-readdir-glob. Define it here as 'unknown'
                const globOptions = {
                    cwd: projectRoot,
                    ignore: ['**/.env', '**/node_modules'],
                    skip: ['**/node_modules/**']
                } as unknown;
                zip.glob('**', globOptions, {})
                    .on('error', (error) => reject(error))
                    .pipe(writeStream);
                writeStream.on('close', () =>
                    resolve({ path: targetPath, size: byteNumberToSizeString(zip.pointer()) })
                );
                zip.finalize();
            } catch (error) {
                reject(error);
            }
        } else {
            reject(new Error(t('error.noProjectRoot', { projectRoot })));
        }
    });
}
