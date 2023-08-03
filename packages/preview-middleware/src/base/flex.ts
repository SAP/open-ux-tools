import type { Logger } from '@sap-ux/logger';
import type { ReaderCollection } from '@ui5/fs';
import { existsSync, mkdirSync, readdirSync, unlinkSync, writeFileSync } from 'fs';
import { join, parse } from 'path';

/**
 * Structure of a flex change.
 */
export interface FlexChange {
    [key: string]: string | object | undefined;
    changeType: string;
    reference: string;
    moduleName?: string;
    content?: {
        codeRef?: string;
        fragmentPath?: string;
    };
}

/**
 * Map of change type specific correction functions.
 */
const moduleNameContentMap: { [key: string]: (change: FlexChange) => string } = {
    codeExt: (change) => (change.content?.codeRef ?? '').replace('.js', ''),
    addXML: (change) => change.content?.fragmentPath ?? ''
};

/**
 * Sets the moduleName property of the provided change to also support old changes with newer UI5 versions.
 *
 * @param change change to be fixed
 * @param logger logger instance
 */
function tryFixChange(change: FlexChange, logger: Logger) {
    try {
        const prefix = change.reference.replace(/\./g, '/');
        change.moduleName = `${prefix}/changes/${moduleNameContentMap[change.changeType](change)}`;
    } catch (error) {
        logger.warn('Could not fix missing module name.');
    }
}

/**
 * Read changes from the file system and return them.
 *
 * @param project reference to the UI5 project
 * @param logger logger instance
 * @returns object with the file name as key and the file content as value
 */
export async function readChanges(project: ReaderCollection, logger: Logger): Promise<Record<string, FlexChange>> {
    const changes: Record<string, FlexChange> = {};
    const files = await project.byGlob('/**/changes/*.*');
    for (const file of files) {
        try {
            const change = JSON.parse(await file.getString()) as FlexChange;
            if (moduleNameContentMap[change.changeType] && !change.moduleName) {
                tryFixChange(change, logger);
            }
            changes[`sap.ui.fl.${parse(file.getName()).name}`] = change;
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
    const fileName = data.fileName?.replace('sap.ui.fl.', '');
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
