import type { Logger } from '@sap-ux/logger';
import type { ReaderCollection } from '@ui5/fs';
import type { Editor } from 'mem-fs-editor';
import { existsSync, readdirSync, statSync, unlinkSync } from 'fs';
import { join, parse, sep } from 'path';
import type { CommonChangeProperties } from '@sap-ux/adp-tooling';

/**
 * Read changes from the file system and return them.
 *
 * @param project reference to the UI5 project
 * @param logger logger instance
 * @returns object with the file name as key and the file content as value
 */
export async function readChanges(
    project: ReaderCollection,
    logger: Logger
): Promise<Record<string, CommonChangeProperties>> {
    const changes: Record<string, CommonChangeProperties> = {};
    const files = await project.byGlob('/**/changes/**/*.*');
    for (const file of files) {
        try {
            changes[`sap.ui.fl.${parse(file.getName()).name}`] = JSON.parse(
                await file.getString()
            ) as CommonChangeProperties;
            logger.debug(`Read change from ${file.getPath()}`);
        } catch (error) {
            logger.warn(error.message);
        }
    }
    return changes;
}

/**
 * Writes flex changes to the user's workspace.
 *
 * @param data JS object to be stored as change
 * @param data.fileName file name that is required for a valid change
 * @param data.fileType file type that is required
 * @param webappPath path to the webapp folder
 * @param fs mem-fs editor
 * @param logger logger instance
 * @returns object with success flag and optional message
 */
export function writeChange(
    data: object & { fileName?: string; fileType?: string },
    webappPath: string,
    fs: Editor,
    logger: Logger
): { success: boolean; message?: string } {
    const fileName = data.fileName;
    const fileType = data.fileType;
    if (fileName && fileType) {
        logger.debug(`Write change ${fileName}.${fileType}`);
        const filePath = join(webappPath, 'changes', fileName + '.' + fileType);
        fs.writeJSON(filePath, data);
        const message = `FILE_CREATED ${fileName}.${fileType}`;
        return { success: true, message };
    } else {
        return { success: false };
    }
}

/**
 * Deletes an existing flex change from the file system if it exists.
 *
 * @param data JS object of the change to be deleted
 * @param data.fileName file name that is required for a valid change
 * @param webappPath path to the webapp folder
 * @param logger logger instance
 * @returns object with success flag and optional message
 */
export function deleteChange(
    data: object & { fileName?: string },
    webappPath: string,
    logger: Logger
): { success: boolean; message?: string } {
    const fileName = data.fileName?.replace('sap.ui.fl.', '');
    if (fileName) {
        const path = join(webappPath, 'changes');
        if (existsSync(path)) {
            // Changes can be in subfolders of changes directory. For eg: New Annotation File Change
            const files: string[] = [];
            readDirectoriesRecursively(path, files);
            const filePath = files.find((element) => element.includes(fileName));
            if (filePath) {
                const fileNameWithExt = filePath.split(sep).pop();
                logger.debug(`Write change ${fileNameWithExt}`);
                unlinkSync(filePath);
                return { success: true, message: `FILE_DELETED ${fileNameWithExt}` };
            }
        }
    }
    return { success: false };
}

/**
 * Recursively find all files in the given folder.
 *
 * @param path path to the folder.
 * @param files all files in the given folder and subfolders.
 */
function readDirectoriesRecursively(path: string, files: string[] = []): void {
    const items = readdirSync(path);
    items.forEach((item) => {
        const fullPath = join(path, item);
        const stats = statSync(fullPath);
        if (stats.isDirectory()) {
            readDirectoriesRecursively(fullPath, files);
        } else if (stats.isFile()) {
            files.push(fullPath);
        }
    });
}
