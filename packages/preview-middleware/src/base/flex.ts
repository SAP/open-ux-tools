import type { Logger } from '@sap-ux/logger';
// eslint-disable-next-line sonarjs/no-implicit-dependencies
import type { ReaderCollection } from '@ui5/fs';
import type { Editor } from 'mem-fs-editor';
import { existsSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, parse, sep } from 'node:path';
import type { CommonChangeProperties } from '@sap-ux/adp-tooling';

/**
 * Set of local module paths (fragments, controllers) used to strip
 * inlined modules from the LrepConnector response so that UI5 loads
 * local workspace versions via HTTP instead.
 */
export type LocalModulePaths = Set<string>;

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
    const files = await project.byGlob(
        '/**/changes/**/*.{change,variant,ctrl_variant,ctrl_variant_change,ctrl_variant_management_change}'
    );
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
 * Read local module paths (fragments, controllers) from the workspace.
 * Used to strip inlined modules from the LrepConnector response so that
 * UI5 falls back to HTTP requests, which the existing ADP proxy serves
 * from the local workspace.
 *
 * @param project reference to the UI5 project
 * @param logger logger instance
 * @returns set of relative module paths under /changes/
 */
export async function readLocalModulePaths(project: ReaderCollection, logger: Logger): Promise<LocalModulePaths> {
    const modulePaths: LocalModulePaths = new Set();

    const moduleFiles = await project.byGlob('/**/changes/{fragments/**,coding/**}');
    for (const file of moduleFiles) {
        const filePath = file.getPath();
        // lastIndexOf ensures we anchor on the flex /changes/ segment even if
        // the virtual path contains an earlier /changes/ component (e.g. a project root named "changes")
        modulePaths.add(filePath.substring(filePath.lastIndexOf('/changes/') + '/changes/'.length));
    }

    logger.debug(`Found ${modulePaths.size} local module(s) for LREP filtering`);
    return modulePaths;
}

/**
 * Strips inlined modules from an LREP flex data response when the
 * corresponding files exist locally in the workspace.  Removing the
 * inline content forces UI5 to request the module via HTTP, which the
 * existing ADP proxy handler resolves to the local file.
 *
 * Changes are intentionally left untouched — UI5 deduplicates them by
 * fileName when both LrepConnector and WorkspaceConnector return the
 * same change.
 *
 * @param responseData the parsed LREP flex data response
 * @param localModulePaths set of relative module paths that exist locally
 * @param logger logger instance
 * @returns the response data with local modules stripped from the inlined modules
 */
export function stripLocalModulesFromLrepResponse(
    responseData: Record<string, unknown>,
    localModulePaths: LocalModulePaths,
    logger: Logger
): Record<string, unknown> {
    if (localModulePaths.size === 0) {
        return responseData;
    }

    if (!responseData.modules || typeof responseData.modules !== 'object') {
        return responseData;
    }

    const originalModules = responseData.modules as Record<string, unknown>;
    const filteredEntries = Object.entries(originalModules).filter(([key]) => {
        // lastIndexOf ensures we anchor on the flex /changes/ segment even if the namespace contains "changes"
        const changesIdx = key.lastIndexOf('/changes/');
        if (changesIdx !== -1) {
            const relativePath = key.substring(changesIdx + '/changes/'.length);
            if (localModulePaths.has(relativePath)) {
                logger.debug(`Stripping inlined module '${key}' — local version will be served instead`);
                return false;
            }
        }
        return true;
    });

    const removedCount = Object.keys(originalModules).length - filteredEntries.length;
    if (removedCount > 0) {
        logger.info(`Stripped ${removedCount} inlined module(s) from LREP response in favor of local versions`);
        return { ...responseData, modules: Object.fromEntries(filteredEntries) };
    }

    return responseData;
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
