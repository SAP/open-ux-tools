import type { Logger } from '@sap-ux/logger';
import type { ReaderCollection } from '@ui5/fs';
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { join, parse } from 'path';

/**
 * Read changes from the file system and return them.
 *
 * @param project reference to the UI5 project
 * @param logger logger instance
 * @returns object with the file name as key and the file content as value
 */
export async function readChanges(project: ReaderCollection, logger: Logger): Promise<Record<string, unknown>> {
    const changes: Record<string, unknown> = {};
    const files = await project.byGlob('/**/changes/*.*');
    for (const file of files) {
        try {
            changes[`sap.ui.fl.${parse(file.getName()).name}`] = JSON.parse(await file.getString());
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
 * @param logger logger instance
 * @returns object with success flag and optional message
 */
export function writeChange(
    data: object & { fileName?: string; fileType?: string },
    webappPath: string,
    logger: Logger
): { success: boolean; message?: string } {
    const fileName = data.fileName;
    const fileType = data.fileType;
    if (fileName && fileType) {
        logger.debug(`Write change ${fileName}.${fileType}`);
        const path = join(webappPath, 'changes');
        if (!existsSync(path)) {
            mkdirSync(path);
        }
        const filePath = join(path, fileName + '.' + fileType);
        writeFileSync(filePath, JSON.stringify(data, null, 2));
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
    const fileName = data.fileName;
    if (fileName) {
        const path = join(webappPath, 'changes');
        if (existsSync(path)) {
            const files = readdirSync(path);
            const file = files.find((element) => element.includes(fileName));
            if (file) {
                logger.debug(`Write change ${file}`);
                const filePath = join(path, file);
                unlinkSync(filePath);
                return { success: true, message: `FILE_DELETED ${file}` };
            }
        }
    }
    return { success: false };
}
