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
 * State of local module files in the workspace.
 * - `active`: paths derived from local change files — deployed changes should be served from the local workspace.
 * - `orphaned`: local files with no corresponding local change record (e.g. change file was deleted) —
 *   the associated deployed change should be suppressed entirely.
 */
export interface LocalModuleState {
    active: LocalModulePaths;
    orphaned: LocalModulePaths;
}

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
        '/**/changes/**/*.{change,variant,ctrl_variant,ctrl_variant_change,ctrl_variant_management_change,annotation_change}'
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
 * Extracts the local module path from a change's type and content.
 * Returns the fragmentPath for addXML changes, codeRef for codeExt changes, and undefined otherwise.
 *
 * @param changeType
 * @param content
 */
function extractLocalModulePath(changeType: unknown, content: Record<string, unknown> | undefined): string | undefined {
    if (changeType === 'addXML' && typeof content?.fragmentPath === 'string') {
        return content.fragmentPath;
    }
    if (changeType === 'codeExt' && typeof content?.codeRef === 'string') {
        return content.codeRef;
    }
    return undefined;
}

/**
 * Reads local module state from the workspace.
 *
 * @param project reference to the UI5 project
 * @param logger logger instance
 * @returns LocalModuleState with `active` and `orphaned` sets of relative paths under /changes/
 */
export async function readLocalModulePaths(project: ReaderCollection, logger: Logger): Promise<LocalModuleState> {
    const active: LocalModulePaths = new Set();
    const orphaned: LocalModulePaths = new Set();

    const changeFiles = await project.byGlob(
        '/**/changes/**/*.{change,variant,ctrl_variant,ctrl_variant_change,ctrl_variant_management_change}'
    );
    for (const file of changeFiles) {
        try {
            const change = JSON.parse(await file.getString()) as Record<string, unknown>;
            const content = change.content as Record<string, unknown> | undefined;
            const localPath = extractLocalModulePath(change.changeType, content);
            if (localPath) {
                active.add(localPath);
            }
        } catch {
            // ignore malformed change files — readChanges already warns about them
        }
    }

    const moduleFiles = await project.byGlob('/**/changes/{fragments/**/*.xml,coding/**/*.js,coding/**/*.ts}');
    for (const file of moduleFiles) {
        const filePath = file.getPath();
        const changesIdx = filePath.lastIndexOf('/changes/');
        if (changesIdx !== -1) {
            const relativePath = filePath.substring(changesIdx + '/changes/'.length);
            // normalise .ts → .js so the orphaned key matches the codeRef in deployed changes
            const normalizedPath = relativePath.endsWith('.ts') ? relativePath.slice(0, -3) + '.js' : relativePath;
            if (!active.has(normalizedPath)) {
                orphaned.add(normalizedPath);
            }
        }
    }

    logger.debug(`Found ${active.size} active and ${orphaned.size} orphaned local module(s) for LREP filtering`);
    return { active, orphaned };
}

/**
 * Strips inlined module entries from `result.modules` whose paths match active local modules.
 *
 * @param result the response object being patched (mutated when modules are stripped)
 * @param active set of active local module paths
 * @param logger logger instance
 * @returns true if `result.modules` was modified
 */
function stripInlinedModules(result: Record<string, unknown>, active: LocalModulePaths, logger: Logger): boolean {
    if (!result.modules || typeof result.modules !== 'object') {
        return false;
    }
    const originalModules = result.modules as Record<string, unknown>;
    const filteredEntries = Object.entries(originalModules).filter(([key]) => {
        // lastIndexOf anchors on the flex /changes/ segment even if the namespace contains "changes"
        const changesIdx = key.lastIndexOf('/changes/');
        if (changesIdx === -1) {
            return true;
        }
        const relativePath = key.substring(changesIdx + '/changes/'.length);
        if (active.has(relativePath)) {
            logger.debug(`Stripping inlined module '${key}' — local version will be served instead`);
            return false;
        }
        return true;
    });

    const removedCount = Object.keys(originalModules).length - filteredEntries.length;
    if (removedCount === 0) {
        return false;
    }
    logger.info(`Stripped ${removedCount} inlined module(s) from LREP response in favor of local versions`);
    result.modules = Object.fromEntries(filteredEntries);
    return true;
}

/**
 * Injects expected `moduleName` values into changes whose local paths are active so UI5 resolves
 * them via the adp.proxy instead of expecting inlined module content.
 *
 * @param changes the array of change objects
 * @param active set of active local module paths
 * @param logger logger instance
 * @returns updated changes array if any moduleName was injected, otherwise null
 */
function injectModuleNames(changes: unknown[], active: LocalModulePaths, logger: Logger): unknown[] | null {
    let changesModified = false;
    const updatedChanges = changes.map((change) => {
        const c = change as Record<string, unknown>;
        const content = c.content as Record<string, unknown> | undefined;
        const reference = typeof c.reference === 'string' ? c.reference : '';
        const changeType = c.changeType;
        const localPath = extractLocalModulePath(changeType, content);

        if (!localPath || !active.has(localPath) || !reference) {
            return change;
        }
        const prefix = reference.replaceAll('.', '/');
        // codeExt modules are JS — strip the trailing .js so the path is a valid UI5 module ID
        const modulePathSuffix =
            changeType === 'codeExt' && localPath.endsWith('.js') ? localPath.slice(0, -3) : localPath;
        const expectedModuleName = `${prefix}/changes/${modulePathSuffix}`;
        if (c.moduleName === expectedModuleName) {
            return change;
        }
        logger.debug(`Setting moduleName '${expectedModuleName}' for local '${localPath}'`);
        changesModified = true;
        return { ...c, moduleName: expectedModuleName };
    });
    return changesModified ? updatedChanges : null;
}

/**
 * Filters out deployed changes whose local file exists but whose local change record was deleted
 * (i.e. orphaned). Returning these changes would re-apply ABAP state that the user already removed.
 *
 * @param changes the array of change objects
 * @param orphaned set of orphaned local module paths
 * @param logger logger instance
 * @returns filtered changes array if any change was suppressed, otherwise null
 */
function suppressOrphanedChanges(changes: unknown[], orphaned: LocalModulePaths, logger: Logger): unknown[] | null {
    const filteredChanges = changes.filter((change) => {
        const c = change as Record<string, unknown>;
        const content = c.content as Record<string, unknown> | undefined;
        const localPath = extractLocalModulePath(c.changeType, content);
        if (localPath && orphaned.has(localPath)) {
            logger.debug(`Suppressing deployed change for orphaned local file '${localPath}'`);
            return false;
        }
        return true;
    });
    const removedCount = changes.length - filteredChanges.length;
    if (removedCount === 0) {
        return null;
    }
    logger.info(
        `Suppressed ${removedCount} deployed change(s) whose local files exist but change records were deleted`
    );
    return filteredChanges;
}

/**
 * Applies moduleName injection and orphaned-change suppression to `result.changes`.
 *
 * @param result the response object being patched (mutated when changes are updated)
 * @param state local module state (active and orphaned)
 * @param logger logger instance
 * @returns true if `result.changes` was modified
 */
function processChanges(result: Record<string, unknown>, state: LocalModuleState, logger: Logger): boolean {
    if (!result.changes || !Array.isArray(result.changes)) {
        return false;
    }
    let modified = false;

    const injected = injectModuleNames(result.changes as unknown[], state.active, logger);
    if (injected) {
        result.changes = injected;
        modified = true;
    }

    if (state.orphaned.size > 0) {
        const suppressed = suppressOrphanedChanges(result.changes as unknown[], state.orphaned, logger);
        if (suppressed) {
            result.changes = suppressed;
            modified = true;
        }
    }
    return modified;
}

/**
 * Patches an LREP flex data response so that deployed changes whose module
 * files exist locally in the workspace are loaded from the local workspace
 * instead of from ABAP.
 *
 * @param responseData the parsed LREP flex data response
 * @param localModuleState state of local module files (active and orphaned)
 * @param logger logger instance
 * @returns the (possibly patched) response data
 */
export function stripLocalModulesFromLrepResponse(
    responseData: Record<string, unknown>,
    localModuleState: LocalModuleState,
    logger: Logger
): Record<string, unknown> {
    if (localModuleState.active.size === 0 && localModuleState.orphaned.size === 0) {
        return responseData;
    }

    const result: Record<string, unknown> = { ...responseData };
    let modified = stripInlinedModules(result, localModuleState.active, logger);

    if (result.loadModules === true && localModuleState.active.size > 0) {
        logger.debug(
            'Stripping loadModules flag — modules will be loaded on-demand so adp.proxy can serve local versions'
        );
        delete result.loadModules;
        modified = true;
    }

    if (processChanges(result, localModuleState, logger)) {
        modified = true;
    }

    return modified ? result : responseData;
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
