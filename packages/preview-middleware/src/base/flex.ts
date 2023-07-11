import type { Logger } from '@sap-ux/logger';
import type { ReaderCollection } from '@ui5/fs';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
import { join, parse } from 'path';

/**
 * Read changes from the file system and return them.
 *
 * @param project
 * @param logger
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
 * @param data
 * @param data.fileName
 * @param data.fileType
 * @param webappPath
 * @returns object with success flag and optional message
 */
export function writeChange(
    data: object & { fileName?: string; fileType?: string },
    webappPath: string
): { success: boolean; message?: string } {
    const fileName = data.fileName;
    const fileType = data.fileType;
    if (fileName && fileType) {
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
