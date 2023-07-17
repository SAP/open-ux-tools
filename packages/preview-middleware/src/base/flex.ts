import type { Logger } from '@sap-ux/logger';
import type { ReaderCollection } from '@ui5/fs';
import { existsSync, mkdirSync, writeFileSync } from 'fs';
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

export function deleteChange(
    data: object & { fileName?: string },
    webappPath: string
): { success: boolean; message?: string } {
    const fileName = data.fileName;
    if (fileName) {
        const path = join(webappPath, 'changes');
        if (existsSync(path)) {
           // TODO

        }
        return { success: true };
    } else {
        return { success: false };
    }
}

/**
 try {
        const path = join(APP_ROOT, 'changes');
        const fileName = req.body.fileName.replace('sap.ui.fl.', '');

        if (existsSync(path)) {
            const files = await promises.readdir(path);
            const file = files.find((element) => {
                return element.indexOf(fileName) !== -1;
            });

            if (file) {
                const filePath = join(path, file);
                await promises.unlink(filePath);
                res.sendStatus(200);
            } else {
                const message = 'INVALID_DATA';
                res.status(400).send(message);
            }
        } else {
            const message = 'INVALID_DATA';
            res.status(400).send(message);
        }
    } catch (error) {
        next(error);
    }
 */